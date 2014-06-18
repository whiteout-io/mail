define(function(require) {
    'use strict';

    var expect = chai.expect,
        ImapClient = require('imap-client'),
        BrowserCrow = require('browsercrow'),
        BrowserSMTP = require('browsersmtp'),
        SmtpClient = require('smtpclient'),
        appController = require('js/app-controller'),
        mailreader = require('mailreader'),
        openpgp = require('openpgp'),
        PgpMailer = require('pgpmailer');

    describe('Email DAO integration tests', function() {
        this.timeout(100000);
        chai.Assertion.includeStack = true;

        var emailDao, imapClient, imapMessages, imapFolders, imapServer, smtpServer, smtpClient, userStorage,
            mockKeyPair;

        var testAccount = {
            user: 'safewithme.testuser@gmail.com',
            pass: 'passphrase',
            xoauth2: 'testtoken'
        };

        beforeEach(function(done) {

            imapMessages = [{
                raw: 'Message-id: <a>\r\nSubject: hello 1\r\n\r\nWorld 1!',
                internaldate: '14-Sep-2013 21:22:28 -0300',
                uid: 500
            }, {
                raw: 'Message-id: <b>\r\nSubject: hello 2\r\n\r\nWorld 2!',
                flags: ['\\Seen'],
                uid: 600
            }, {
                raw: 'Message-id: <c>\r\nSubject: hello 3\r\n\r\nWorld 3!'
            }, {
                raw: 'From: sender name <sender@example.com>\r\n' +
                    'To: Receiver name <receiver@example.com>\r\n' +
                    'Subject: hello 4\r\n' +
                    'Message-Id: <d>\r\n' +
                    'Date: Fri, 13 Sep 2013 15:01:00 +0300\r\n' +
                    '\r\n' +
                    'World 4!'
            }, {
                raw: 'Message-id: <e>\r\nSubject: hello 5\r\n\r\nWorld 5!'
            }, {
                raw: 'Message-id: <f>Subject: hello 6\r\n\r\nWorld 6!'
            }, {
                raw: 'Message-id: <g>\nFrom: safewithme.testuser@gmail.com\nTo: safewithme.testuser@gmail.com\nSubject: enigmail encrypted pgp/mime with attachment\nContent-Type: multipart/encrypted;\n protocol=\"application/pgp-encrypted\";\n boundary=\"abc\"\n\nThis is an OpenPGP/MIME encrypted message (RFC 4880 and 3156)\n--abc\nContent-Type: application/pgp-encrypted\nContent-Description: PGP/MIME version identification\n\nVersion: 1\n\n--abc\nContent-Type: application/octet-stream; name=\"encrypted.asc\"\nContent-Description: OpenPGP encrypted message\nContent-Disposition: inline; filename=\"encrypted.asc\"\n\n-----BEGIN PGP MESSAGE-----\nVersion: GnuPG/MacGPG2 v2.0.22 (Darwin)\nComment: GPGTools - http://gpgtools.org\nComment: Using GnuPG with Thunderbird - http://www.enigmail.net/\n\nhQEMA9f7k/zfv8I8AQf/XY1dJfGWb2iU0GYhZLNXkXoi7k4pnWSbRKQoVcEFoYpz\niltbJo70U6rdRziUO2VnGzsdnyi+NtpaZSXdxAKrE2KxQsPwNUziBWyTCL9WyAa/\nz9L5PldfK7H1o8C9CqC3LU6Ppwafaw2WImbPgnvwvuSD+BeAJlPQ9QyzhKmG8faq\nG67yMLm76kP1zKiEacIZng4ilGQ+K5cy43ryod/7HNQWUkHXt/E4YJXzjyNOXzYh\n5r2fbz0OIYcyFIuAIDqzDG5wtGmRc/6qVkUVdOs+H3RPCFPJjPUsRdH5kW6uiHQ2\nMMr5blSzWt0Q7cIqlZJgoMRte3VGEy0ED/oJZaIo3Mnst2ue5uIc5j6Q31nJCvJt\nY37ldHgrN+RpU6pcSjLgfkntjw5nQaV+KnNoB4BpKhODYMVZIuA8TivgVjpDFDgu\n8X/X0gMXD8l6hqMGP48g7etD+poYDWUp5DnsjuyNo2uFXDRyO5GZLM31jh2pIiQw\neoOmijPWy2/CSuMV6swNMbUryhp1idrujC5ggKeLBYARefDKD1T40PUFV88THCyL\n2NPZY1XKp2NIMH+WrJKYTqaJgSGzRKkqZOZByISAd+Ld7nm/t636sT1HoVHn9AR7\nfbiOqjvHW/AYV0TAK912QzVj/qg4PKSaMSV0CjIW3IoY1uPmYLxfSDxUmHwrnyEn\n74CkF/a3VNBTN6MX2Z6kFuswZx5LCcIgGzuZvOtoEIUl65ypWTyi51yWl/w+ieMU\nRr/Fxj5WNeUn1W34yVfB0AvNJQIwwZpiqMrYC7BPgi/1vvCaLv9mxWXtgudAHwtd\nUD1BHFz5HmQlgVtqXrzMy1DZKnXvjXcwOGfWRTgOB9VDdst2GegmmGoOwTVLZcRB\ncJeznQ0oVmcHaiH71AtyaO05k+xbfBTsp2AoZvTuty5EyGyNU/wc0IkELL+HAqZ+\nqpAZ1002GS4qyCK8Cz5oAO8ti3VZn9Zy5tPxvbBk+J+PXBhnjqGEQrSu+UsJEJCm\n+BuXcJNmOHjxRMWk3fHWVOQmvPdqG0bBDbFIFpJiI3m2+pgnscCkaElPCO4a9y6Q\nf43o/vRTGTNeweWeDQZfF3rhjw3XZ88yjGlurLd1mgqkXtMlKcoNxE3ZY4Voz7KM\nc7h3D7kXeCkXySrChULhx4YX7SvL2E6SHG9rnMtE6rOcVq9OqmyaSpJ5MIgRxWSl\nzE1OTWZ8fel6AqBralU42/vG1gZ7OPS1RIjENBbJykabPgnSvUlW8ENb0CNnD8jA\nAEP1VWn2j3cjEgVoCiCpq4/eq7XUnFkJbz2hZ08VVi6HVTvfLN9UF3NoPVHpd/Ih\nKPJ888QOrhkQAo7hF9yMJ/y+TGkiwzANTn/UI/BMhwNJBpwkgn7WzpbQzVHVCdGB\nNsgnaFrhX9/Pd647L/vkOXYpgH0Ufh84dwbeuCaNNXjpyv5V8JJ/lNEcHQLkgn9r\nYVD3nDHwWq49Ui4BZXkeT/1lFvKCHolQQYsRGmic+BzqEP4NAs7vtuHGWAL7qV+o\nyEYv57KVuFfDdHdiD4hIv03HiK1bWdchbG8IRXBRXreIa90dutg4BdV56sS2FX0L\nZjJI2EB7NUb9qG+m+2X1nFCc2RVMT6XPCzs2L64D3B5272xlWmTFZ5EoLd+GTkVH\nNza+mZA59KPl025RMCzJRy77ZHenBUY+9PdawtbitoeUjKsEijF0H3dKjWzFAkWL\ngmbv9FCEc8siwaZv8nfnoqZn33iyjdIru/Os8y3v/4CxD+RbU55vYLdIMHGp4jht\nJuPoNDDqMWSZgKMdlKd90sc+orrzy75BUndMWheKPt1xt4PeasOTNPNRxmhvhYYG\noiIay6g9xlWgw6Zce5X9VrTfrksH3aqGLm5g1XzfUfkDosFktyAR+jzk8vDAKshz\naOwR9Qvou0oPpZASQCo7aFDOLpBfY0h0i7ETarvtuhdGmXUtQMYc9kHkBzB/D7bs\n1LhmukVzEdq3YMPE3agc8m6N+gZnQ0Xvbf2fP7z4FkWFN+f3FXmlWgj3ShHDupye\nH+GrKpV/mM00tv8tMDasjDC6KXi+2u0CoTpu3Jin38n6Jmf1v+u5zKmXR7ACR9x8\nP4CR0XmOsWYMDh6Kvg1OBdeqyb+47x8qU6FZMMs/G7zgwm000yt3PZ2T3yEJNEaM\nLYYO6dJKioUq0wuSRs+CHplMI9yu+AMGRXFAnS7EmOlbl8wWYWiY0bxsOPPellmH\n+IzVs71GDLudw3NLrypjBpP7Y5/Lorqj7WooI4ij0QPP7YbEkUa4Z4KBwpiq+FLX\nm+RPlOZSpwr/BL7Vi0V4mi2Bwr1IkbTYrwYguKMEMBCnTlLZaOPShD2eezUFbv9E\n4v0d+3N74ofKYZGojXQzQGK0E8igc3N8hvRPqHSqez0hKmuAvjxX56Qeol3JRsp4\nzoYRfDC8bMsI8XZvwDC0+ZB/6T5/adldC4JOZrpdexCnxnzhl6WMtvhOkIW9JqXQ\nMVk7Bl1YSnnH+wSOiad0UeWG7UtXle05QaDVj+YNrQxneJuD0rNNop1oZmA9pcmh\nvmlzPSgEgbhvywgVOhJ3ZRUGO/ZqcGA6dNdUdTw3QyJ3s28SSE40l0pQ9YKFNHQ8\nekd8C8m+oeiNMyzwOezLaewV/0CBrU+2VDptXSqXMOdusGbISLItQZyUnPpicOgd\nAHJoIVf1QaTTfal/ozvAFuhxJtVFFa1F3UotXD3DaYDfczLYeq/NtNT3LoZ94PIr\nWpxznhaxZICABGeiBgRemJtPeBrO68hdZAV+2hSgSNyK0gzGlRv95ql0JmBSVK3S\nfPJCimDNoynasdCM68Av0GB/AHr4rT5PQd0UQyRmPvh4+lD6CHGWMZoYqjDvMM5n\nqv1h/Cwt/nKk68Ehi1tzbOHup3TT0jZC811FyYKvHwLT0rVJxJgn93MnSgkwJbVs\nhEfdYZee1dTFlaLFOCB5llGYyTae60Gp8qppz9Xr3jdk+ertl7GjG/IUvU8K56Si\nHKDPWLd/8uSeajKYHthwAKAlYbXQrNpUgozaQjt7G9NbqdWfT1NOsmCSCFOCDjOs\nTTJ21dz5f4pk6j1GNNAe20iJXBayPplCaG/GxneY1V+0t2UTwF1DaqhLLb1PZ0k9\n9ejZuwqRXFReFx+DLSUMTNsxYOekHVdAEBkti5vzfqLUc6f3LZ4cZV5+COiD8PO3\n12oWgAR+TF5JT+8ux4Xp8/nLICErxcyN4wqajn0etJvg8gRKTgaWTnFyvNvBO7Hp\nbMZkYl9s6Jc/40NIen9bsW9wERpa78WNrdLjovPfRjxjR07rhb6vfqTCSvzdjA15\n8kAjYReIyjQucqhuKy1P1vIbiQJzPiKQZgi7h2qiItAxf1UPbh6l7neKd3ARZ4E+\n43tlNQigYwzLQ0zTeTekp3Keznh9ww4udOnqlxYfdBp2MQ4wu2gVuWgpxENVlDPp\nGjd9cXAAMbZ9NdxSuCbwsbAqJOj3so7xO83GkBO1S6TBgZW7w19HAWIHxuVUXtl9\nOnjLgPlT6MTLiwIFSxv0ZyhzD73B9vtf4/rH6+6MeBriipQjF9hDCTmzK2oIeQJm\n6z/QZqw23MgEl8CuGKM95bQ5Or07lx+6zgm5ESsnbrScKlQy9OrhFrHQPMiWanZT\n/fydne1PoL/psJ1t7qQhOmmtFG9n7AKxnpwW1ebWjFG3rx9FWXldp1Fb3J1xv9CW\nofb16QZv9rGYSKT8s72nO23NPhnUzY9GV4ZpxSWcEgg1qRuE+o7pbVREQEVaHIjM\nTOfrl4WszH2nJE+uirspgCH4FmKas84TZHyI5lIYm/pvORdoXNiP4pnMQwsgcDLu\noCqYhPRTqjp2pDVIBcnQtpndOPWaC8luyJYqe6a1UtYXGeobrvfM6WBEZvoOJsjy\n8VmWKPBKlJibwETA4V05g5mKHSIsYljANasLzAa9T9ZNfhj9KxnC2/MqHdWZO0zs\nEVGZ2LvGoMNi3uqmZHw9oOCVoa+5pXlIQnAJD3VqvU3E/cbY2xzow6C1f6yMp7Cs\n6fyXn8luvdPYlXYxrauFnmfspZ2rwPZSolLQFBytkXAZ9KH7fqVsPZQZ7NpW0wG4\nOzQ4uzhuiwNp/W1BM3s3M0kN818JcBnRi3vtL/z3LWjlmyywIYE/V+luaDT8Kmqb\nshuTXMJlS3rfW5dYj1wyuSkReTR2mksPcRIgTgkahjHn3zzOXS0pv9CUwmFMCBcS\nmpZsoTSqiHqw5PP4jTDMVXC6dXBCuU6ochDYqCJBNxe2fIYWbvzHaDmZjUhUts8k\neY3+V9rNy9HfFal627GopZTBrKao1ywV5nT52i3g8qmdFuMljOK2BPpv3BJv20/s\n4/Lfv9OvNLwiLCez+l2sj4+Y48F/xegJrPoETaIgFmS1kgLCGUEv47TEMdu7MW7O\ntllzbtqukmnFrZux5pMCmZOkqjpfEQD3Kyq2N6ptguOPkFB3cT9rwNMJUrt8Ufzw\nIO+ZGut9NyvAaw/njyUMMBBpxL2L2Onn+em5p+wSx6oN17337n94k56qJSQHI5hs\nBfapavmwnUbjgQsueX6/mc8dl3o+ONIs8OZGvVUF8cqIbVEub0sHt/hTGW7sZXmK\n3S4cXRaqsLeF8mFsu8WcrVbkSDKulViC1tGtWKs0hIfErdOVAOMY7+ZXmNoTB6uG\np150nuXS/LTiSx6IsBrkYLo0UoZUSo6MVaHv4Afu4AHHX4zO6krXAffrMk6efgGm\nbFigAXRj5fACwiup8T5XGKwYwcvVQfAOqJZzZ9Bcp6qYPbgVQjS/mvMzbQZZ5DJA\n1q3a9+T98ykU1KAJkI6GzH/d1aYH4st9uVFMd/heTJB7aApaTbMD8eGqE/hqt0zy\n8zT19UwLIAbb+R2oHtXzaODm27l5k/2yKflDV5ELKGGQmql73pCY4xpfrJsV3Hdg\nhBOfz1N+gpsuuO/6teNeAbSG9L2Ntd9nsmuCS21H997Fg6ze+7r1SVo1oB1Niqvb\n3JFoxxbBr86WOe54e5fWKM6BDAq04hFr2+bnOgvZDgMrkWM8TgeeA4BA6DrCElOi\nzub3XTcuEygoOzxQxNTYO+UL2PNCWQvJJEeZzV1+DzetQex6IicfK7UqV9siJHay\nSuHWcQR19lsXABWdDKVq9CNSgQ+YJDpD4sCC+M4bqxqs3Fp6Wn23bfkiV54LaSIi\nebFUwxg7qn9TmjdAF2OmkqmgwRoWpEwz3Bi4jmZ/nEBhFzKPlPdSrg1SdJKvw9BT\n2BjGpEnTDWVyOYPtk0M2lkOtHdelI6R+qRCeaRtfvX8xoc8yY+5v5FsUW3hFEO4+\nmLn6ScvMPrD9fVSluN0LwJSKpH9p1jGi+QkWveEWBpViOAjDiqNpQa4tqO0VOWRY\nbtgppiizR9pG4CjFBey/vcQ4kQ1ExNNxZyhr7hdIiis5Y5B9wbmiWsI1+daHf6Lq\nMOf92+Fq/MbvvuJFsoYiP/RYbkiSIVTxlM5ud3ypnALkxdyEn0Lp66oDKKUm2Wur\n3dd4VBRENivmNCZEfe1OufbAG/YCKZd/Ze8F/BymW9q+RqDpRjN1bmiF6QrgzF+C\n/0xWNNrZ07OM/i0Zwsc6CoIeWzUf2xpwPJQXu+LQE0MC2/pRnT8HZgUzJTaOyU9p\nfZbGzuDPOv0c0/mGS2k/RREk38QHUsS81keJXlizIXiLlu8JcJIYtomrCvlPUyo4\nmoIuTq/6mpUGM3IdIKTU0/dunmI8sKncZ63qhZdFXYofxUddP3dX4OTivq21iFqc\n7kNDJXMsLf/9AxLUIiPfplb+CnBfL1W5/UnVwld5mephzQrf5D3M8CGt717MqTAB\n2euVdJrRDRJ5QpiDef4+WTpswAx9Z9K05Sa5MrLxdtU1w/2njDD4OzNQDAos4jMQ\nT8lrIefDtA3YjO/HznSbT/kkSSgyaipQp5mZc/el0bMs+mDld7AzrUAm6BPzbTCm\nH2h/FUTpshFZg9wmXuitq2cAWpysVrgkesBlgBoJsHFywN9RTBcI9xcUPcZGyWpx\nkorxPxDq6Xk3rIhFJuGs2isQo69c0GT2naLZ02Q9hUWqK2WQZwYqONAHZUxfoltK\nMEzLRgp3KjFYJBPDPoNwdsoo80B28X4lSPlY1WL/Puoj9siEeb3AaizfXiezw/Rh\nkbGU5+0LX+Dgb41PX+9O9m0ypBpZGfv2RTSwV1XC0RmA7EmCpaB9NJyJwLnqpPzZ\naWXn8G38VTuvMD30Ss479P5rJ5n1MS34XrjH3ZVu4/yUrJxzRIFi8Kmtb7MApbub\ngjQcNahPNsSAiTAl9dIlKWxMnIei4e6lzTBkrAyw0mF12ZTIDDooGALwzDqph1mr\n5iVb9XC7jAAerw0NFQs5GfQMonlFDx8VvCl14bZ702UsTKGqSj6CrLuYKbAiYumv\nnSelhGVUIS4hE9hKvmni+F23cJYecFbntA4DynaTL30Q2tW/zrdbiZhJDw+Cb4PX\nHh5SkQOtFtkaxfU0pkAkQtBF8IgSwI8fBViSQn0gn0JDGkW1MMIKTYJvqlDEBlHG\n6xKSCVi7LGRGzW8hcMtfEm38rBLfPGlXe5nxxOOXSvZkHv6cdVNgTLEgAcw/s5g0\nWMjqdjLaI3WZfolXJpJ48jZ5Gc7IxzWUw2eSOEZlKZx+jHdAP1YU0USRDUPRXPBq\nMZJe4FNRKHCTmNL6WYTSRYINQP6DM+UCMS4D20Y+Eeq8Ep5kKCL0xvwrmSOlyoDE\nEhthkJLiHCU8Y4fdNayDsQhdpnVOQnegxhrT/tNxzJ1pgxcaN3ki/6HyPcvtyZcM\nKDC0mG55v+6VvnaB4IBQ5QaRnBBJhfIxDQjmxejWnNu4k1fFqxJj8Te9X2yz9Qdh\nJFBLdvymegEvdiCVsSCtMTRO+tHht/aeT05r+K1w7VXEZW/JUCOiKKtBEcteIGN2\nSKL9uc4DukHlNUphNt+vKbY/iQqAeIUJ4w3cFzZNXRo9vw06ZPgaYoVIlKXfA/gD\nh3pV4Qb4XqrCxGF8QaCYw8o4lnY7I4P1xcg9hU9BhdDeS+vSeGe6ueres57kemjI\nb6D792qNi8Bv/fomx8sNVNTUyUDQL+utSX7G8dUtiX2p1ZPhqIyA/6FTapwnK1IN\nUH+t5dhjllc9I9C+1zU41hEHDEzoSErMpDKwfTtGpUZI8Cw+80dNjOiXtrK8ZLFv\n1zvyK6mA7YlcHMPlGV+edF6Gj5amb3jUl+VNtAQtrYvKbi9YGeUHrNR6vRMEuTnr\nGRW00/tw1JUlc+KgtIespifRTdgDtC92/SiqtE8sXSoJPWjgZXKI9J1Dvuuo3WQ+\n2/B7TMgvr06ipWK9SRGJ+BnVOneVgyH9c/cX38Xu5+2/ABlRHLan2d0P6tKZ0AQf\nPg660wwQI+ChYzAPm4mTBiDefaVfRh0Tqbwa+FcgC9bW2BzqFtWV2g39TOzlgYJB\nYHzkk889xTgyTppI+HjkvVwLD4+zTT7yDj/3NGlLgi1ko/c6Z24xGzbtXrN+ZJO2\n5nz407hVK+ZNFYh9RA3ar1vRjaOIc3vsaEEw1KYb8kBcY1AnvWRbEoVGjt/HltY8\nXZkh7V8qZkZq1mpnUZWvoCoq1o0GGQIetrCu/2pm4WB3jHmzp6H7h2KI56dNCk/u\n7cKVur0+agSYo91tjz2JQbnADPwsgHGrC2kQhqn7bt1loPxtPzMQFrYb4X9gGh8+\nxfe4aezKs+nduhK3Sw95DtnsHrz9VmGpzdpbwdb51D3ynAfRzVsIYDmX3dbZl8Me\nbDHP3PDxM/+aj7QISMLdkn+zG/x22n/kF4+do1IcF5FpkasBh+5j9g53AcXHdLoM\nwhY/3iJsiVzmwonn86zEER8fgDFVsXskeVnSSN4FW6qD4T/sRSP96fEDRtYANiYD\nCJ7MUA85v8Kn7gWWOqa8N/1Ltct1L3FS63SqS2FdcCz9V/HGjp9eWYWL64+5JS0o\nedV4iQGgBjY84sLpoP/o1GR/xkFX5PIT0sONNDQ8CfTJZwNOeO/kwLzqaf94qaHO\ncYOhiCArVNioE+FrCI/nEbEOddeExoNr7naaKriGsZAW8xFCS4zH6JOTRNKlsbEk\nN9fY7WDByPi7kvPoBVNi5h1w+SdcmIGHnb7NQo0rOWyKpYWH4Zqi+PhIjKAVYeO7\noFZiNdPUac6qDZYXuVg+YBnTWJQvVHmqVUT7JmVVHF5cdtMW3ASn7/q80mP1jStN\nngG2NI6T+hlXqsiKF4fV8l5nb4VihaYef6KoodOCfhXUIkJJvwAm/iCjUmViQ/33\nCEDc1my6h7e5DocW4u+x/vp0IzfzLv1RCXtUkgwiN/I3qPZSObHGuOmZI458gSym\n66Ju4szsiZvC3ZBjKntvZSk1KD3b2qQ0n0AOocukCU0M6tqhIdmfp6yMphsqvbyu\nLyCD+7xPILy+sD84rZplffcs15M/RmbniCvdFMJDYJuVaWoMQbNRDq7MV5InMtm8\n+DeqYd218rfcSXhaoFFW+hqfyGD3Yj7fecZSmGUGU6uMT1JU2THHvfy7RvkNePe8\nR6I0EBJon0u5WGMSQcaEPbRug+WE0du1hPPeaDKMHgBDFem+nW3I0QrbgTISHrZG\nhd1DpMHjZPWfN/z5VdCDbrSyqTZZQsU9SZ3j43/RcFwN+37IsV+uCYIhZxAhH3vM\n2CvZfEAh4E/Pmx96VamnlbLIvFEmjFo9sX0eLrW+dLjN77puQ412cBaJqRzPnrzm\nGFDPlgn6fcp2chbAxqpKCfrUPEj5YK0MnahEoqen2jxnQaaUw4BVYmBsPM/oGkb7\nUh827IUdRAPQbYkpOPVk8JTVImcuYLnJkek/dSpgt7LWp2ZhZnO957xn+Sppp0VG\nQ4Ufa/trTt3hbAnGnbPEc+CKlnI0bX220wAl2BaxIzf3OBWEI3M8wa3NXpeQJgVK\nU/XaZuPp+swLbNH9K5bZG1WEPkGPXXYUBaIIkahb5an5AsulnY7cQ+W2rK2wp1OD\nIb7t/VeTcnt9uQk7iQTCCToejWf1so3GGFZM8m/ZVVyX3kXC9EQujxAjd1IQeoSZ\nhk8p7v2bjkyyz8HydZhx/LhZHbmoS+VnHgbPIw+TvphwNV7mdi0ucwLOPwX8guH6\nmTfDZFguI57eAl3VZA8k2kdsAJwsTaFegAvCSPmC0mCKOQlur+cuuuV52o6qZv6m\nGWL55IFHujzLDbwQaE1hhkzqfoy0qLY4vfKhVJ37bvFCKDNt7SyTHQOX2jOsbjVm\nL205UvBzSdSg5WVrXmO1dOeJ9kxWHbnMEg6Bf/tAYpukXcz7XEBpKa0+nlhWiImY\ntgIsOEJvP/OTtF5KFZ7yw5bLJl4sYTCYqpCh4Co7e8yM/zlNSPjvcZ9TfWyp4jxv\n=ZQ8O\n-----END PGP MESSAGE-----\n\n--abc--\n',
                internaldate: '14-Sep-2013 20:22:28 -0300',
                uid: 800
            }, {
                raw: "Message-id: <h>\nFrom: safewithme.testuser@gmail.com\nTo: safewithme.testuser@gmail.com\nSubject: enigmail encrypted signed pgp/mime with attachment\nContent-Type: multipart/encrypted;\n protocol=\"application/pgp-encrypted\";\n boundary=\"abc\"\n\nThis is an OpenPGP/MIME encrypted message (RFC 4880 and 3156)\n--abc\nContent-Type: application/pgp-encrypted\nContent-Description: PGP/MIME version identification\n\nVersion: 1\n\n--abc\nContent-Type: application/octet-stream; name=\"encrypted.asc\"\nContent-Description: OpenPGP encrypted message\nContent-Disposition: inline; filename=\"encrypted.asc\"\n\n-----BEGIN PGP MESSAGE-----\nVersion: GnuPG/MacGPG2 v2.0.22 (Darwin)\nComment: GPGTools - http://gpgtools.org\nComment: Using GnuPG with Thunderbird - http://www.enigmail.net/\n\n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\nyjGWLplWnA==\n=p4q6\n-----END PGP MESSAGE-----\n\n--abc--\n",
                internaldate: '14-Sep-2013 22:22:28 -0300',
                uid: 801
            }];

            imapFolders = {
                separator: '/',
                folders: {
                    '[Gmail]': {
                        flags: ['\\Noselect'],
                        folders: {
                            'All Mail': {
                                'special-use': '\\All'
                            },
                            Drafts: {
                                'special-use': '\\Drafts'
                            },
                            Important: {
                                'special-use': '\\Important'
                            },
                            'Sent Mail': {
                                'special-use': '\\Sent'
                            },
                            Spam: {
                                'special-use': '\\Junk'
                            },
                            Starred: {
                                'special-use': '\\Flagged'
                            },
                            Trash: {
                                'special-use': '\\Trash'
                            }
                        }
                    }
                }
            };

            var serverUsers = {};
            serverUsers[testAccount.user] = {
                password: testAccount.pass,
                xoauth2: {
                    accessToken: testAccount.xoauth2,
                    sessionTimeout: 3600 * 1000
                }
            };

            imapServer = new BrowserCrow({
                debug: false,
                plugins: ['sasl-ir', 'xoauth2', 'special-use', 'id', 'idle', 'unselect', 'enable', 'condstore'],
                id: {
                    name: 'browsercrow',
                    version: '0.1.0'
                },
                storage: {
                    'INBOX': {
                        messages: imapMessages
                    },
                    '': imapFolders
                },
                users: serverUsers
            });

            smtpServer = new BrowserSMTP({
                debug: false,
                users: serverUsers
            });

            mockKeyPair = {
                privateKey: {
                    _id: 'D7FB93FCDFBFC23C',
                    userId: testAccount.user,
                    userIds: [{
                        name: 'John Doe',
                        emailAddress: testAccount.user
                    }],
                    encryptedKey: '-----BEGIN PGP PRIVATE KEY BLOCK-----\r\nVersion: OpenPGP.js v.1.20131116\r\nComment: Whiteout Mail - http://whiteout.io\r\n\r\nxcL+BFKODs4BB/9iOF4THsjQMY+WEpT7ShgKxj4bHzRRaQkqczS4nZvP0U3g\r\nqeqCnbpagyeKXA+bhWFQW4GmXtgAoeD5PXs6AZYrw3tWNxLKu2Oe6Tp9K/XI\r\nxTMQ2wl4qZKDXHvuPsJ7cmgaWqpPyXtxA4zHHS3WrkI/6VzHAcI/y6x4szSB\r\nKgSuhI3hjh3s7TybUC1U6AfoQGx/S7e3WwlCOrK8GTClirN/2mCPRC5wuIft\r\nnkoMfA6jK8d2OPrJ63shy5cgwHOjQg/xuk46dNS7tkvGmbaa+X0PgqSKB+Hf\r\nYPPNS/ylg911DH9qa8BqYU2QpNh9jUKXSF+HbaOM+plWkCSAL7czV+R3ABEB\r\nAAH+AwMI8l5bp5J/xgpguvHaT2pX/6D8eU4dvODsvYE9Y4Clj0Nvm2nu4VML\r\nniNb8qpzCXXfFqi1FWGrZ2msClxA1eiXfk2IEe5iAiY3a+FplTevBn6rkAMw\r\nly8wGyiNdE3TVWgCEN5YRaTLpfV02c4ECyKk713EXRAtQCmdty0yxv5ak9ey\r\nXDUVd4a8T3QMgHcAOTXWMFJNUjeeiIdiThDbURJEv+9F+DW+4w5py2iw0PYJ\r\nNm6iAHCjoPQTbGLxstl2BYSocZWxG1usoPKhbugGZK0Vr8rdpsfakjJ9cJUg\r\nYHIH3VT+y+u5mhY681NrB5koRUxDT6ridbytMcoK8xpqYG3FhC8CiVnzpDQ3\r\no1KRkWuxUq66oJhu0wungXcqaDzDUEfeUjMuKVI/d9/ViXy8IH/XdlOy0lLY\r\nOac0ovRjb7zgeVOp2e7N4eTu0dts3SE+Do1gyqZo2rf1dwsJQI9YUtpjYAtr\r\nNBkKyRvBAhg9KPh1y2Y1u3ra5OS0yGuNDD8pXdiN3kxMt5OBlnWeFjL6ll7+\r\nvgiKZooPUZPbFIWi4XBXTv7D5T9THDYmuJpcOffn1AA7j2FM8fkFvtiFyw9J\r\n2S14penv2R7TeybxR6ktD7HtZd34gmGvmOxhWRNU/vfp4SisUcu9jzQq+cJt\r\njoWuJiZ8xvWEC2DD32n9bWyIlGhS4hATqz/gEdSha8hxzT+GJi29jYjp8Hnc\r\n9HwxOArz6Q5h/nDN2Xt5PuCM65J0dathzAm0A7BLRQI+4OjTW575sRKvarzH\r\n8JZ+UYK2BgP4Kbh9JqhnD/2NKD/csuL6No5guyOH8+zekdBtFE394SV8e9N+\r\nzYgzVex4SDG8y/YO7W7Tp6afNb+sqyzEw5Bknypn0Hc3cr9wy1P8jLMM2woL\r\nGRDZ5IutCAV/D/h881dHJs0tV2hpdGVvdXQgVXNlciA8c2FmZXdpdGhtZS50\r\nZXN0dXNlckBnbWFpbC5jb20+wsBcBBABCAAQBQJSjg7aCRDX+5P837/CPAAA\r\n3ZwH/2AVGYB+8RDarP5a5uZPYSxJKeM8zHMbi7LKQWhr5NpkJajZdra1CCGZ\r\nTXTeQSRBvU4SNGOmDAlhf0qCGeXwMHIzrzovkBedHIc/vypEkItdJeXQAaJx\r\nuhQOnmyi9priuzBBx4e9x1aBn+aAdNGiJB4l13L2T4fow8WLIVpVwXB6BWya\r\nlz50JwLzJP6qHxkhvIZElTrQ+Yoo3stS6w/7wNtK/f3MIYkIGVVUrIDgzN0X\r\nm4z6ypN1dsrM6tPkMZ0JlqjHiz7DXpKrWsfNkoVZ9A98osMH2nIDS58JVEDc\r\nAXoFSLsbdmqFmIc2Ew828TjlX+FLU9tlx89WhSMTapzUjHU=\r\n=wxuK\r\n-----END PGP PRIVATE KEY BLOCK-----'
                },
                publicKey: {
                    _id: 'D7FB93FCDFBFC23C',
                    userId: testAccount.user,
                    userIds: [{
                        name: 'John Doe',
                        emailAddress: testAccount.user
                    }],
                    publicKey: '-----BEGIN PGP PUBLIC KEY BLOCK-----\r\nVersion: OpenPGP.js v.1.20131116\r\nComment: Whiteout Mail - http://whiteout.io\r\n\r\nxsBNBFKODs4BB/9iOF4THsjQMY+WEpT7ShgKxj4bHzRRaQkqczS4nZvP0U3g\r\nqeqCnbpagyeKXA+bhWFQW4GmXtgAoeD5PXs6AZYrw3tWNxLKu2Oe6Tp9K/XI\r\nxTMQ2wl4qZKDXHvuPsJ7cmgaWqpPyXtxA4zHHS3WrkI/6VzHAcI/y6x4szSB\r\nKgSuhI3hjh3s7TybUC1U6AfoQGx/S7e3WwlCOrK8GTClirN/2mCPRC5wuIft\r\nnkoMfA6jK8d2OPrJ63shy5cgwHOjQg/xuk46dNS7tkvGmbaa+X0PgqSKB+Hf\r\nYPPNS/ylg911DH9qa8BqYU2QpNh9jUKXSF+HbaOM+plWkCSAL7czV+R3ABEB\r\nAAHNLVdoaXRlb3V0IFVzZXIgPHNhZmV3aXRobWUudGVzdHVzZXJAZ21haWwu\r\nY29tPsLAXAQQAQgAEAUCUo4O2gkQ1/uT/N+/wjwAAN2cB/9gFRmAfvEQ2qz+\r\nWubmT2EsSSnjPMxzG4uyykFoa+TaZCWo2Xa2tQghmU103kEkQb1OEjRjpgwJ\r\nYX9Kghnl8DByM686L5AXnRyHP78qRJCLXSXl0AGicboUDp5sovaa4rswQceH\r\nvcdWgZ/mgHTRoiQeJddy9k+H6MPFiyFaVcFwegVsmpc+dCcC8yT+qh8ZIbyG\r\nRJU60PmKKN7LUusP+8DbSv39zCGJCBlVVKyA4MzdF5uM+sqTdXbKzOrT5DGd\r\nCZaox4s+w16Sq1rHzZKFWfQPfKLDB9pyA0ufCVRA3AF6BUi7G3ZqhZiHNhMP\r\nNvE45V/hS1PbZcfPVoUjE2qc1Ix1\r\n=7Wpe\r\n-----END PGP PUBLIC KEY BLOCK-----'
                }
            };

            // don't multithread, Function.prototype.bind() is broken in phantomjs in web workers
            window.Worker = undefined;
            navigator.online = true;

            imapClient = new ImapClient({
                auth: {
                    user: testAccount.user,
                    xoauth2: testAccount.xoauth2
                },
                secure: true,
                ca: ['random string']
            });

            imapClient._client.client._TCPSocket = imapServer.createTCPSocket();
            imapClient._listeningClient.client._TCPSocket = imapServer.createTCPSocket();
            imapClient.onError = function(err) {
                console.log('IMAP error.', err);
                console.log('IMAP reconnecting...');
                // re-init client modules on error
                appController.onConnect(function(err) {
                    if (err) {
                        console.error('IMAP reconnect failed!', err);
                        return;
                    }

                    console.log('IMAP reconnect attempt complete.');
                });
            };

            smtpClient = new SmtpClient('localhost', 25, {
                auth: {
                    user: testAccount.user,
                    xoauth2: testAccount.xoauth2
                },
                secure: true,
                ca: ['random string'],
                onError: console.error
            });

            smtpClient._TCPSocket = smtpServer.createTCPSocket();

            sinon.stub(mailreader, 'startWorker', function() {});
            sinon.stub(openpgp, 'initWorker', function() {});

            sinon.stub(appController, 'onConnect', function(cb) {
                appController._emailDao.onConnect({
                    imapClient: imapClient,
                    pgpMailer: new PgpMailer({
                        tls: {
                            ca: 'random string'
                        }
                    }, appController._pgpbuilder)
                }, cb);
            });

            appController.start({
                onError: function() {}
            }, function(err) {
                expect(err).to.not.exist;

                userStorage = appController._userStorage;

                appController.init({
                    emailAddress: testAccount.user
                }, function(err) {
                    expect(err).to.not.exist;

                    emailDao = appController._emailDao;
                    emailDao.onIncomingMessage = function() {};

                    emailDao.unlock({
                        passphrase: testAccount.pass,
                        keypair: mockKeyPair
                    }, function(err) {
                        expect(err).to.not.exist;

                        appController.onConnect(function(err) {
                            expect(err).to.not.exist;
                            done();
                        });
                    });
                });
            });
        });

        afterEach(function(done) {
            openpgp.initWorker.restore();
            mailreader.startWorker.restore();
            appController.onConnect.restore();

            imapClient._client.close();
            imapClient._listeningClient.close();

            userStorage.clear(done);
        });

        describe('IMAP Tests', function() {
            var currentFolder;

            beforeEach(function(done) {
                emailDao.openFolder({
                    folder: {
                        path: 'INBOX'
                    }
                }, function(err) {
                    expect(err).to.not.exist;
                    currentFolder = emailDao._account.folders.filter(function(folder) {
                        return folder.path === 'INBOX';
                    }).pop();
                    expect(currentFolder).to.exist;
                    done();
                });
            });

            afterEach(function() {
                emailDao.onIncomingMessage = function() {};
            });

            it('should receive new messages on startup', function(done) {
                emailDao.onIncomingMessage = function(messages) {
                    expect(messages.length).to.equal(imapMessages.length);
                    done();
                };
            });

            it('should receive new messages', function(done) {
                emailDao.onIncomingMessage = function(messages) {
                    expect(messages.length).to.equal(imapMessages.length);
                    emailDao.onIncomingMessage = function(messages) {
                        expect(messages.length).to.equal(1);
                        expect(messages[0].answered).to.be.false;
                        emailDao.onIncomingMessage = function(messages) {
                            expect(messages.length).to.equal(1);
                            expect(messages[0].answered).to.be.true;
                            done();
                        };
                    };
                    setTimeout(function() {
                        imapServer.appendMessage('INBOX', ['$My$Flag'], false, 'Message-id: <n1>\r\nSubject: new message\r\n\r\nhello world!');
                        setTimeout(function() {
                            imapServer.appendMessage('INBOX', ['$My$Flag', '\\Answered'], false, 'Message-id: <n2>\r\nSubject: new message\r\n\r\nhello world!');
                        }, 1000);
                    }, 1000);
                };
            });

            it('should delete a message', function(done) {
                emailDao.onIncomingMessage = function() {
                    emailDao.deleteMessage({
                        folder: currentFolder,
                        message: {
                            uid: 600
                        }
                    }, function(err) {
                        expect(err).to.not.exist;
                        emailDao.openFolder({
                            folder: {
                                path: '[Gmail]/Trash'
                            }
                        }, function(err, folder) {
                            expect(err).to.not.exist;
                            expect(folder.exists).to.equal(1);
                            emailDao.onIncomingMessage = function(messages) {
                                expect(messages.length).to.equal(1);
                                expect(messages[0].id).to.equal('b');
                                done();
                            };
                        });
                    });
                };
            });

            it('should get body', function(done) {

                emailDao.onIncomingMessage = function(messages) {
                    emailDao.getBody({
                        folder: currentFolder,
                        message: messages[4]
                    }, function(err, message) {
                        expect(err).to.not.exist;
                        expect(message.body).to.equal('World 5!');
                        done();
                    });
                };
            });

            [{
                nr: 6,
                hasAttachments: true
            }, {
                nr: 7,
                hasAttachments: true
            }].forEach(function(email) {
                it('should get and decrypt body #' + email.nr, function(done) {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[email.nr]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            emailDao.decryptBody({
                                message: message,
                                folder: currentFolder
                            }, function(err) {
                                expect(err).to.not.exist;
                                expect(message.body).to.equal('asdf');
                                if (email.hasAttachments) {
                                    expect(message.attachments.length).to.equal(1);
                                }
                                done();
                            });
                        });
                    };
                });
            });

            it('should set flags', function(done) {
                emailDao.onIncomingMessage = function(messages) {
                    var message = messages[0];
                    message.unread = false;
                    message.answered = true;

                    emailDao.setFlags({
                        folder: currentFolder,
                        message: message
                    }, function(err) {
                        expect(err).to.not.exist;
                        done();
                    });
                };
            });
        });

        describe('SMTP Tests', function() {
            // phantomjs is just sooo slow


            it('should send a plaintext message', function(done) {
                sinon.stub(smtpServer, 'onmail', function(mail) {
                    expect(mail.from).to.equal(testAccount.user);
                    expect(mail.to).to.deep.equal([testAccount.user]);
                    expect(/^Content-Type: multipart\/signed/.test(mail.body)).to.be.true;
                });

                emailDao.sendPlaintext({
                    smtpclient: smtpClient,
                    email: {
                        from: [testAccount.user],
                        to: [testAccount.user],
                        subject: 'plaintext test',
                        body: 'hello world!'
                    }
                }, function(err) {
                    expect(err).to.not.exist;
                    expect(smtpServer.onmail.callCount).to.equal(1);
                    smtpServer.onmail.restore();
                    done();
                });
            });

            it('should send an encrypted message', function(done) {
                sinon.stub(smtpServer, 'onmail', function(mail) {
                    expect(mail.from).to.equal(testAccount.user);
                    expect(mail.to).to.deep.equal([testAccount.user]);
                    expect(/^Content-Type: multipart\/mixed/.test(mail.body)).to.be.true;
                    expect(mail.body).to.contain('this is a private conversation');
                });

                emailDao.sendEncrypted({
                    smtpclient: smtpClient,
                    email: {
                        from: [testAccount.user],
                        to: [testAccount.user],
                        subject: 'plaintext test',
                        body: 'hello world!',
                        publicKeysArmored: [mockKeyPair.publicKey.publicKey]
                    }
                }, function(err) {
                    expect(err).to.not.exist;
                    expect(smtpServer.onmail.callCount).to.equal(1);
                    smtpServer.onmail.restore();
                    done();
                });
            });
        });
    });
});