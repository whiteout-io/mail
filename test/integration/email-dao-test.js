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
        PgpMailer = require('pgpmailer'),
        config = require('js/app-config').config,
        str = require('js/app-config').string;

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
                raw: 'Message-id: <g>\nFrom: safewithme.testuser@gmail.com\nTo: safewithme.testuser@gmail.com\nSubject: enigmail encrypted pgp/mime with attachment\nContent-Type: multipart/encrypted;\n protocol=\"application/pgp-encrypted\";\n boundary=\"abc\"\n\nThis is an OpenPGP/MIME encrypted message (RFC 4880 and 3156)\n--abc\nContent-Type: application/pgp-encrypted\nContent-Description: PGP/MIME version identification\n\nVersion: 1\n\n--abc\nContent-Type: application/octet-stream; name=\"encrypted.asc\"\nContent-Description: OpenPGP encrypted message\nContent-Disposition: inline; filename=\"encrypted.asc\"\n\n-----BEGIN PGP MESSAGE-----\nVersion: GnuPG/MacGPG2 v2.0.22 (Darwin)\nComment: GPGTools - http://gpgtools.org\nComment: Using GnuPG with Thunderbird - http://www.enigmail.net/\n\n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\n=ZQ8O\n-----END PGP MESSAGE-----\n\n--abc--\n',
                internaldate: '14-Sep-2013 20:22:28 -0300',
                uid: 800
            }, {
                raw: "Message-id: <h>\nFrom: safewithme.testuser@gmail.com\nTo: safewithme.testuser@gmail.com\nSubject: enigmail encrypted signed pgp/mime with attachment\nContent-Type: multipart/encrypted;\n protocol=\"application/pgp-encrypted\";\n boundary=\"abc\"\n\nThis is an OpenPGP/MIME encrypted message (RFC 4880 and 3156)\n--abc\nContent-Type: application/pgp-encrypted\nContent-Description: PGP/MIME version identification\n\nVersion: 1\n\n--abc\nContent-Type: application/octet-stream; name=\"encrypted.asc\"\nContent-Description: OpenPGP encrypted message\nContent-Disposition: inline; filename=\"encrypted.asc\"\n\n-----BEGIN PGP MESSAGE-----\nVersion: GnuPG/MacGPG2 v2.0.22 (Darwin)\nComment: GPGTools - http://gpgtools.org\nComment: Using GnuPG with Thunderbird - http://www.enigmail.net/\n\n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\nyjGWLplWnA==\n=p4q6\n-----END PGP MESSAGE-----\n\n--abc--\n",
                internaldate: '14-Sep-2013 22:22:28 -0300',
                uid: 801
            }, {
                raw: 'Delivered-To: throwaway.felix@gmail.com\r\nReceived: by 10.42.174.3 with SMTP id t3csp241492icz;\r\n        Wed, 25 Jun 2014 05:45:10 -0700 (PDT)\r\nX-Received: by 10.180.20.206 with SMTP id p14mr10320792wie.26.1403700309809;\r\n        Wed, 25 Jun 2014 05:45:09 -0700 (PDT)\r\nReturn-Path: <mail@felixhammerl.com>\r\nReceived: from mail-wi0-f172.google.com (mail-wi0-f172.google.com [209.85.212.172])\r\n        by mx.google.com with ESMTPS id d9si4992982wje.76.2014.06.25.05.44.59\r\n        for <throwaway.felix@gmail.com>\r\n        (version=TLSv1 cipher=ECDHE-RSA-RC4-SHA bits=128/128);\r\n        Wed, 25 Jun 2014 05:44:59 -0700 (PDT)\r\nReceived-SPF: pass (google.com: domain of mail@felixhammerl.com designates 209.85.212.172 as permitted sender) client-ip=209.85.212.172;\r\nAuthentication-Results: mx.google.com;\r\n       spf=pass (google.com: domain of mail@felixhammerl.com designates 209.85.212.172 as permitted sender) smtp.mail=mail@felixhammerl.com\r\nReceived: by mail-wi0-f172.google.com with SMTP id hi2so7776737wib.11\r\n        for <throwaway.felix@gmail.com>; Wed, 25 Jun 2014 05:44:59 -0700 (PDT)\r\nX-Google-DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;\r\n        d=1e100.net; s=20130820;\r\n        h=x-gm-message-state:from:content-type:subject:message-id:date:to\r\n         :mime-version;\r\n        bh=s4NMXN5u+JHQKeYuoCYcsqfFEEqH1GauOiEzb6O3ma0=;\r\n        b=khBrYuEYLBy6IZOWmdXQi4lvi9PhH67+zvkfZUJ5aV/SyWZUHNsuXsnJThI0Fj7Xbx\r\n         XbeSDiZCJhD1XZgkVoERUmKFIgRmQURgm44SC6ZgBgDJvHXB2gVapPUAPIWIM9S8OuqH\r\n         n5YKWob9M4GO6jV5WrTGx+tiDP6GiRO0dM4/nGe+MC+xAvVMPtqESxhNu6L6gGXJHVXC\r\n         XMVx6ZP64SsLrFOCEqGCea49bPi7ee474nT+uL2zNc69fbpkqdRzRGSrru+11Buf6ZDV\r\n         gcTsA9Xrmpy0DwIUxkIDyyxaEgAMc9qnprM2f0CYuub26RnSryeLCdX4KRfcQaVEFKTd\r\n         38AQ==\r\nX-Gm-Message-State: ALoCoQmv6i9holEFjurNeEf5WgK5j3TDeENKMSkaBtsR08RK6tt9BShN8lvr0y0ktwghZqRf6823\r\nX-Received: by 10.194.174.35 with SMTP id bp3mr1720884wjc.33.1403700299213;\r\n        Wed, 25 Jun 2014 05:44:59 -0700 (PDT)\r\nReturn-Path: <mail@felixhammerl.com>\r\nReceived: from [192.168.16.29] (host-88-217-174-118.customer.m-online.net. [88.217.174.118])\r\n        by mx.google.com with ESMTPSA id wk8sm7294078wjb.22.2014.06.25.05.44.58\r\n        for <throwaway.felix@gmail.com>\r\n        (version=TLSv1 cipher=ECDHE-RSA-RC4-SHA bits=128/128);\r\n        Wed, 25 Jun 2014 05:44:58 -0700 (PDT)\r\nFrom: Felix Hammerl <mail@felixhammerl.com>\r\nContent-Type: multipart/alternative; boundary="Apple-Mail=_F62EFD38-9B1E-4FAC-A419-2C6F1F765727"\r\nSubject: asd\r\nMessage-Id: <C49155D8-E2F6-47F1-9176-B1FBB7E8AE6B@felixhammerl.com>\r\nDate: Wed, 25 Jun 2014 14:44:56 +0200\r\nTo: throwaway.felix@gmail.com\r\nMime-Version: 1.0 (Mac OS X Mail 7.3 1878.2)\r\nX-Mailer: Apple Mail (2.1878.2)\r\n\r\n\r\n--Apple-Mail=_F62EFD38-9B1E-4FAC-A419-2C6F1F765727\r\nContent-Transfer-Encoding: 7bit\r\nContent-Type: text/plain;\r\n    charset=us-ascii\r\n\r\nasd\r\n--Apple-Mail=_F62EFD38-9B1E-4FAC-A419-2C6F1F765727\r\nContent-Type: multipart/related;\r\n    type="text/html";\r\n    boundary="Apple-Mail=_0A59F0C0-A5CC-4402-B716-0D94B95BA062"\r\n\r\n\r\n--Apple-Mail=_0A59F0C0-A5CC-4402-B716-0D94B95BA062\r\nContent-Transfer-Encoding: 7bit\r\nContent-Type: text/html;\r\n    charset=us-ascii\r\n\r\n<html><head><meta http-equiv="Content-Type" content="text/html charset=us-ascii"></head><body style="word-wrap: break-word; -webkit-nbsp-mode: space; -webkit-line-break: after-white-space;">asd<img apple-inline="yes" id="53B73BDD-69A0-4E8E-BA7B-3D2EF399C0D3" height="1" width="1" apple-width="yes" apple-height="yes" src="cid:20154202-BB6F-49D7-A1BB-17E9937B42B5"></body></html>\r\n--Apple-Mail=_0A59F0C0-A5CC-4402-B716-0D94B95BA062\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: inline;\r\n    filename=image.jpg\r\nContent-Type: image/jpg;\r\n    x-unix-mode=0644;\r\n    name="image.jpg"\r\nContent-Id: <20154202-BB6F-49D7-A1BB-17E9937B42B5>\r\n\r\n/9j/4AAQSkZJRgABAQEASABIAAD/4gxYSUNDX1BST0ZJTEUAAQEAAAxITGlubwIQAABtbnRyUkdC\r\nIFhZWiAHzgACAAkABgAxAABhY3NwTVNGVAAAAABJRUMgc1JHQgAAAAAAAAAAAAAAAAAA9tYAAQAA\r\nAADTLUhQICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFj\r\ncHJ0AAABUAAAADNkZXNjAAABhAAAAGx3dHB0AAAB8AAAABRia3B0AAACBAAAABRyWFlaAAACGAAA\r\nABRnWFlaAAACLAAAABRiWFlaAAACQAAAABRkbW5kAAACVAAAAHBkbWRkAAACxAAAAIh2dWVkAAAD\r\nTAAAAIZ2aWV3AAAD1AAAACRsdW1pAAAD+AAAABRtZWFzAAAEDAAAACR0ZWNoAAAEMAAAAAxyVFJD\r\nAAAEPAAACAxnVFJDAAAEPAAACAxiVFJDAAAEPAAACAx0ZXh0AAAAAENvcHlyaWdodCAoYykgMTk5\r\nOCBIZXdsZXR0LVBhY2thcmQgQ29tcGFueQAAZGVzYwAAAAAAAAASc1JHQiBJRUM2MTk2Ni0yLjEA\r\nAAAAAAAAAAAAABJzUkdCIElFQzYxOTY2LTIuMQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\r\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAWFlaIAAAAAAAAPNRAAEAAAABFsxYWVogAAAAAAAAAAAAAAAA\r\nAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAA\r\nAA+EAAC2z2Rlc2MAAAAAAAAAFklFQyBodHRwOi8vd3d3LmllYy5jaAAAAAAAAAAAAAAAFklFQyBo\r\ndHRwOi8vd3d3LmllYy5jaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\r\nAAAAAABkZXNjAAAAAAAAAC5JRUMgNjE5NjYtMi4xIERlZmF1bHQgUkdCIGNvbG91ciBzcGFjZSAt\r\nIHNSR0IAAAAAAAAAAAAAAC5JRUMgNjE5NjYtMi4xIERlZmF1bHQgUkdCIGNvbG91ciBzcGFjZSAt\r\nIHNSR0IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZGVzYwAAAAAAAAAsUmVmZXJlbmNlIFZpZXdpbmcg\r\nQ29uZGl0aW9uIGluIElFQzYxOTY2LTIuMQAAAAAAAAAAAAAALFJlZmVyZW5jZSBWaWV3aW5nIENv\r\nbmRpdGlvbiBpbiBJRUM2MTk2Ni0yLjEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHZpZXcAAAAA\r\nABOk/gAUXy4AEM8UAAPtzAAEEwsAA1yeAAAAAVhZWiAAAAAAAEwJVgBQAAAAVx/nbWVhcwAAAAAA\r\nAAABAAAAAAAAAAAAAAAAAAAAAAAAAo8AAAACc2lnIAAAAABDUlQgY3VydgAAAAAAAAQAAAAABQAK\r\nAA8AFAAZAB4AIwAoAC0AMgA3ADsAQABFAEoATwBUAFkAXgBjAGgAbQByAHcAfACBAIYAiwCQAJUA\r\nmgCfAKQAqQCuALIAtwC8AMEAxgDLANAA1QDbAOAA5QDrAPAA9gD7AQEBBwENARMBGQEfASUBKwEy\r\nATgBPgFFAUwBUgFZAWABZwFuAXUBfAGDAYsBkgGaAaEBqQGxAbkBwQHJAdEB2QHhAekB8gH6AgMC\r\nDAIUAh0CJgIvAjgCQQJLAlQCXQJnAnECegKEAo4CmAKiAqwCtgLBAssC1QLgAusC9QMAAwsDFgMh\r\nAy0DOANDA08DWgNmA3IDfgOKA5YDogOuA7oDxwPTA+AD7AP5BAYEEwQgBC0EOwRIBFUEYwRxBH4E\r\njASaBKgEtgTEBNME4QTwBP4FDQUcBSsFOgVJBVgFZwV3BYYFlgWmBbUFxQXVBeUF9gYGBhYGJwY3\r\nBkgGWQZqBnsGjAadBq8GwAbRBuMG9QcHBxkHKwc9B08HYQd0B4YHmQesB78H0gflB/gICwgfCDII\r\nRghaCG4IggiWCKoIvgjSCOcI+wkQCSUJOglPCWQJeQmPCaQJugnPCeUJ+woRCicKPQpUCmoKgQqY\r\nCq4KxQrcCvMLCwsiCzkLUQtpC4ALmAuwC8gL4Qv5DBIMKgxDDFwMdQyODKcMwAzZDPMNDQ0mDUAN\r\nWg10DY4NqQ3DDd4N+A4TDi4OSQ5kDn8Omw62DtIO7g8JDyUPQQ9eD3oPlg+zD88P7BAJECYQQxBh\r\nEH4QmxC5ENcQ9RETETERTxFtEYwRqhHJEegSBxImEkUSZBKEEqMSwxLjEwMTIxNDE2MTgxOkE8UT\r\n5RQGFCcUSRRqFIsUrRTOFPAVEhU0FVYVeBWbFb0V4BYDFiYWSRZsFo8WshbWFvoXHRdBF2UXiReu\r\nF9IX9xgbGEAYZRiKGK8Y1Rj6GSAZRRlrGZEZtxndGgQaKhpRGncanhrFGuwbFBs7G2MbihuyG9oc\r\nAhwqHFIcexyjHMwc9R0eHUcdcB2ZHcMd7B4WHkAeah6UHr4e6R8THz4faR+UH78f6iAVIEEgbCCY\r\nIMQg8CEcIUghdSGhIc4h+yInIlUigiKvIt0jCiM4I2YjlCPCI/AkHyRNJHwkqyTaJQklOCVoJZcl\r\nxyX3JicmVyaHJrcm6CcYJ0kneierJ9woDSg/KHEooijUKQYpOClrKZ0p0CoCKjUqaCqbKs8rAis2\r\nK2krnSvRLAUsOSxuLKIs1y0MLUEtdi2rLeEuFi5MLoIuty7uLyQvWi+RL8cv/jA1MGwwpDDbMRIx\r\nSjGCMbox8jIqMmMymzLUMw0zRjN/M7gz8TQrNGU0njTYNRM1TTWHNcI1/TY3NnI2rjbpNyQ3YDec\r\nN9c4FDhQOIw4yDkFOUI5fzm8Ofk6Njp0OrI67zstO2s7qjvoPCc8ZTykPOM9Ij1hPaE94D4gPmA+\r\noD7gPyE/YT+iP+JAI0BkQKZA50EpQWpBrEHuQjBCckK1QvdDOkN9Q8BEA0RHRIpEzkUSRVVFmkXe\r\nRiJGZ0arRvBHNUd7R8BIBUhLSJFI10kdSWNJqUnwSjdKfUrESwxLU0uaS+JMKkxyTLpNAk1KTZNN\r\n3E4lTm5Ot08AT0lPk0/dUCdQcVC7UQZRUFGbUeZSMVJ8UsdTE1NfU6pT9lRCVI9U21UoVXVVwlYP\r\nVlxWqVb3V0RXklfgWC9YfVjLWRpZaVm4WgdaVlqmWvVbRVuVW+VcNVyGXNZdJ114XcleGl5sXr1f\r\nD19hX7NgBWBXYKpg/GFPYaJh9WJJYpxi8GNDY5dj62RAZJRk6WU9ZZJl52Y9ZpJm6Gc9Z5Nn6Wg/\r\naJZo7GlDaZpp8WpIap9q92tPa6dr/2xXbK9tCG1gbbluEm5rbsRvHm94b9FwK3CGcOBxOnGVcfBy\r\nS3KmcwFzXXO4dBR0cHTMdSh1hXXhdj52m3b4d1Z3s3gReG54zHkqeYl553pGeqV7BHtje8J8IXyB\r\nfOF9QX2hfgF+Yn7CfyN/hH/lgEeAqIEKgWuBzYIwgpKC9INXg7qEHYSAhOOFR4Wrhg6GcobXhzuH\r\nn4gEiGmIzokziZmJ/opkisqLMIuWi/yMY4zKjTGNmI3/jmaOzo82j56QBpBukNaRP5GokhGSepLj\r\nk02TtpQglIqU9JVflcmWNJaflwqXdZfgmEyYuJkkmZCZ/JpomtWbQpuvnByciZz3nWSd0p5Anq6f\r\nHZ+Ln/qgaaDYoUehtqImopajBqN2o+akVqTHpTilqaYapoum/adup+CoUqjEqTepqaocqo+rAqt1\r\nq+msXKzQrUStuK4trqGvFq+LsACwdbDqsWCx1rJLssKzOLOutCW0nLUTtYq2AbZ5tvC3aLfguFm4\r\n0blKucK6O7q1uy67p7whvJu9Fb2Pvgq+hL7/v3q/9cBwwOzBZ8Hjwl/C28NYw9TEUcTOxUvFyMZG\r\nxsPHQce/yD3IvMk6ybnKOMq3yzbLtsw1zLXNNc21zjbOts83z7jQOdC60TzRvtI/0sHTRNPG1EnU\r\ny9VO1dHWVdbY11zX4Nhk2OjZbNnx2nba+9uA3AXcit0Q3ZbeHN6i3ynfr+A24L3hROHM4lPi2+Nj\r\n4+vkc+T85YTmDeaW5x/nqegy6LzpRunQ6lvq5etw6/vshu0R7ZzuKO6070DvzPBY8OXxcvH/8ozz\r\nGfOn9DT0wvVQ9d72bfb794r4Gfio+Tj5x/pX+uf7d/wH/Jj9Kf26/kv+3P9t////4QCMRXhpZgAA\r\nTU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIA\r\nAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAA\r\nAAGgAwAEAAAAAQAAAAEAAAAA/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsL\r\nDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQU\r\nFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgAAQABAwEiAAIR\r\nAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAAB\r\nfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5\r\nOkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeo\r\nqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMB\r\nAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYS\r\nQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNU\r\nVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5\r\nusLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8AzKKKKyPQ\r\nP//Z\r\n\r\n--Apple-Mail=_0A59F0C0-A5CC-4402-B716-0D94B95BA062--\r\n\r\n--Apple-Mail=_F62EFD38-9B1E-4FAC-A419-2C6F1F765727--',
                internaldate: '14-Sep-2013 22:22:28 -0300',
                uid: 802
            }, {
                description: "Apple Mail (attachment - PGP/MIME): Encrypted",
                raw: "Content-Type: multipart/encrypted; boundary=\"Apple-Mail=_D90EDAD0-7A85-4304-83EE-59979A5446B0\"; protocol=\"application/pgp-encrypted\";\r\nSubject: test16\r\nMime-Version: 1.0 (Mac OS X Mail 7.3 \\(1878.2\\))\r\nX-Pgp-Agent: GPGMail (null)\r\nFrom: safewithme <safewithme.testuser@gmail.com>\r\nDate: Mon, 23 Jun 2014 21:25:41 +0200\r\nContent-Transfer-Encoding: 7bit\r\nMessage-Id: <7D6AE636-EA7D-4C85-A918-AB3212791604@gmail.com>\r\nContent-Description: OpenPGP encrypted message\r\nTo: safewithme.testuser@gmail.com\r\nX-Mailer: Apple Mail (2.1878.2)\r\n\r\nThis is an OpenPGP/MIME encrypted message (RFC 2440 and 3156)\r\n--Apple-Mail=_D90EDAD0-7A85-4304-83EE-59979A5446B0\r\nContent-Transfer-Encoding: 7bit\r\nContent-Type: application/pgp-encrypted\r\nContent-Description: PGP/MIME Versions Identification\r\n\r\nVersion: 1\r\n\r\n--Apple-Mail=_D90EDAD0-7A85-4304-83EE-59979A5446B0\r\nContent-Transfer-Encoding: 7bit\r\nContent-Disposition: inline;\r\n\tfilename=encrypted.asc\r\nContent-Type: application/octet-stream;\r\n\tname=encrypted.asc\r\nContent-Description: OpenPGP encrypted message\r\n\r\n-----BEGIN PGP MESSAGE-----\r\nComment: GPGTools - https://gpgtools.org\r\n\r\nhQEMA9f7k/zfv8I8AQf/THKyD9sA69c9asAGtbVNRtu9zsmfapLQvSW00YIYDQQA\r\nK4QQZit08FL+Fkaa1TCQ0ARF96V2NnshEEmrfLYy7b+eiKGFb1BqKwng18vpsEFu\r\nsZAJeX+ZnBkzNoHqOD+a4HHRO6iQhZYI7arfOnnf7e6woag4dJ5IpOH48hq35R7a\r\n942igGudw8fKuk2D5Or+XqpOYASEhjCSPHxPtqppuNSwQP/KSVY0evEWffE0aQYJ\r\nedqXAAZ7+idU3B1K7nw9cZafXjFkVui02G7SG68/izQq+8SjxJH0SYox4+ZPw1cD\r\nbb8RhWvXBVJ6FIRBZxdsV2gtcvw+1MxDoXHX4BblEMnAU8dGOT68cC88KIDTeSdd\r\nuOPdZ+RdYbQVwk5UuiKKVq3wzlH/q2oP7kk6DeiPd24VhKgzcX3UWS+jBm56S2UD\r\nZFYCznUWvx2ubwRsBBPAiUhAFizkfNL72Ft9LPCI8Hhjd7PZMNqDQklqD092Z5Of\r\nv7j1X/LYbNo3V6Ia4qZpf0Ivgze0309q5IFxswarSmlEdJYcJc+yNLikzgE3/7Ks\r\nOTOQA6tyG7r18V9YjB5570FPTDyDWHFLnt6bRPhe8SYH2OTRomxyFVkTvvN37D5i\r\n+wGigIZxyS07OIXApApc/eNpN74rkbsPMMFLqe2IAI6y+4+G2ukloMSS04EPX9GR\r\nhOnv6pC2MBIKKg70Ck3EHavlMCrs\r\n=JVbV\r\n-----END PGP MESSAGE-----\r\n\r\n--Apple-Mail=_D90EDAD0-7A85-4304-83EE-59979A5446B0--",
                uid: 803
            }, {
                description: "Apple Mail (attachment - PGP/MIME): Encrypted and signed",
                raw: "Content-Type: multipart/encrypted; boundary=\"Apple-Mail=_FE60F127-D74F-4377-93CC-56430132A178\"; protocol=\"application/pgp-encrypted\";\r\nSubject: test15\r\nMime-Version: 1.0 (Mac OS X Mail 7.3 \\(1878.2\\))\r\nX-Pgp-Agent: GPGMail (null)\r\nFrom: safewithme <safewithme.testuser@gmail.com>\r\nDate: Mon, 23 Jun 2014 21:25:10 +0200\r\nContent-Transfer-Encoding: 7bit\r\nMessage-Id: <E5A9BAE2-0FC3-4BEC-9208-39C629CF33AB@gmail.com>\r\nContent-Description: OpenPGP encrypted message\r\nTo: safewithme.testuser@gmail.com\r\nX-Mailer: Apple Mail (2.1878.2)\r\n\r\nThis is an OpenPGP/MIME encrypted message (RFC 2440 and 3156)\r\n--Apple-Mail=_FE60F127-D74F-4377-93CC-56430132A178\r\nContent-Transfer-Encoding: 7bit\r\nContent-Type: application/pgp-encrypted\r\nContent-Description: PGP/MIME Versions Identification\r\n\r\nVersion: 1\r\n\r\n--Apple-Mail=_FE60F127-D74F-4377-93CC-56430132A178\r\nContent-Transfer-Encoding: 7bit\r\nContent-Disposition: inline;\r\n\tfilename=encrypted.asc\r\nContent-Type: application/octet-stream;\r\n\tname=encrypted.asc\r\nContent-Description: OpenPGP encrypted message\r\n\r\n-----BEGIN PGP MESSAGE-----\r\nComment: GPGTools - https://gpgtools.org\r\n\r\nhQEMA9f7k/zfv8I8AQf/U11mVSMI5wFM4gh20M1eF1xx5Gs+JJK7hIqKoW7z127k\r\nqB+QEnPvWqa5vV2+gi22bDeXgVNELN3wb2CAznMM82TnpiSbmLLMSrGtx8BAJsfW\r\n+yxaDMvGMn6JHsGPQ6rij7ar9yGCgw6gGOrCuxzCLSgeajbmEn76lyIOtDxY0KSK\r\nisW0K1iD9SeJJiMnMg/EP0Sf9sUzIZjQNJpoz9S23keAHqij/eNexrdmobLMQamF\r\n9BxforwfewMEBv+/+atTj91nS260RBB2g+S6tv1RNJbZ3zTbqr06lviPTQ5zoWT0\r\n2uUEipYhNp4WTaqHg2KfopfzUIt1M0TJGwSidPWkkcnpb+dDeC1JYd3gy0IejhiJ\r\nOUo67gwaiFiwbKhJUTbBI0ZLV3StxBh6M6MEuabDOiBKDuRSPd3Tk8ZylVYjHA/Z\r\noMFW4cKGHp8t2bVs16DyUuIFFJV4UNtXFoJBGYjq8x2WXFLPXaH//eSgF96AxE1+\r\nG3NwPHu1J0uf5s7LAX669FT/6fNpd7oKsOStmYWVII2smA0RasQjApWXu/ouYFIe\r\nwF1GKRcVzSNjc9lUqVoyhKYDwZ+UBZNgbecJc+szvYWbj1X3cUQkVxAVe9Kvbuuu\r\nBbKBghZkt0o2c/asIPTVcMLFRCYXauLlpNMQqxtdPWzyx/mKPe2r4qo+7Yoq6/zh\r\n1QVsqHfNd3TslOWanH2iOrylPPHCZ5eph+RHkPxE/lYJOqZgZnpcW5wusAyqaPfX\r\niSh8aoHDXa9VT/rMB5wz7EJppv75YLUaHHqnD7oJEMqSlxhDYy62TDWjVAPv2ITF\r\n3z9pfjAXDitGKqpwM2re+vCR0Lg3KMBhE3zL4Z8QPRK4I7Oekb6WiK90TlBc9xdr\r\nhC3dDu+lWPkhU7f1wEiiminVxPQLMNfnBSErwMqC9LSHXuBcnqYWhMgl9auN/oqf\r\nbAyFYTWY+rk+B8sAJU5aTlwC5GavRzCAZFPHCRmOLVrLCD0MPS1x/cBQ/pL/yiID\r\nMFBLuxnb4GC9ZQZA7x63rlHAXtjEj5VDZcEJiJWsHapTksscjC0r2IRADSw/xWUp\r\nil+7Z2ajBNAQShECeIOkA3NLjaykDAMhOcZbg2Lw3V+EcF/kG6DJbvpombySOuys\r\n/EwDC2fVrxiEt7dPWmhlCu7wwyyMX0cjYikAQAGw1Xa5UQhdss3ivAuBSvhmFAhh\r\nyMvU8Lxtd01NT/hHMNcYUo/zs0dUZxibfI8zvRemGwLxy0pIHoi+77Lv6ejtkQlK\r\nlIAWew6Slyk2sFoDq/U/f+AEIodsNrHw2uljkzfw3tFUrm204s8L0woN3nSXuzLZ\r\nmGn56Ep7tk+K88eTCz5lW5gc3AyGlr1YK6/iC3wwre8P72kblwDKOKBrHogMo/Ed\r\n9cpldxBtLBbMohJ29N0V9fQ=\r\n=cI14\r\n-----END PGP MESSAGE-----\r\n\r\n--Apple-Mail=_FE60F127-D74F-4377-93CC-56430132A178--",
                uid: 804
            }, {
                description: "Apple Mail (no attachment - PGP/MIME): Encrypted and signed",
                raw: "Content-Type: multipart/encrypted; boundary=\"Apple-Mail=_2E255D9C-89D7-4F15-81B9-0821710B1B04\"; protocol=\"application/pgp-encrypted\";\r\nSubject: test12\r\nMime-Version: 1.0 (Mac OS X Mail 7.3 \\(1878.2\\))\r\nX-Pgp-Agent: GPGMail (null)\r\nFrom: safewithme <safewithme.testuser@gmail.com>\r\nDate: Mon, 23 Jun 2014 21:22:54 +0200\r\nContent-Transfer-Encoding: 7bit\r\nMessage-Id: <1995DC5D-366B-427A-8420-C0E6F93FCAE6@gmail.com>\r\nContent-Description: OpenPGP encrypted message\r\nTo: safewithme.testuser@gmail.com\r\nX-Mailer: Apple Mail (2.1878.2)\r\n\r\nThis is an OpenPGP/MIME encrypted message (RFC 2440 and 3156)\r\n--Apple-Mail=_2E255D9C-89D7-4F15-81B9-0821710B1B04\r\nContent-Transfer-Encoding: 7bit\r\nContent-Type: application/pgp-encrypted\r\nContent-Description: PGP/MIME Versions Identification\r\n\r\nVersion: 1\r\n\r\n--Apple-Mail=_2E255D9C-89D7-4F15-81B9-0821710B1B04\r\nContent-Transfer-Encoding: 7bit\r\nContent-Disposition: inline;\r\n\tfilename=encrypted.asc\r\nContent-Type: application/octet-stream;\r\n\tname=encrypted.asc\r\nContent-Description: OpenPGP encrypted message\r\n\r\n-----BEGIN PGP MESSAGE-----\r\nComment: GPGTools - https://gpgtools.org\r\n\r\nhQEMA9f7k/zfv8I8AQf/SN6kzGCE5Ht0OHBofUocR3CaADSI1ricHiWLzk74FT+6\r\nB7wZcqNR2wI35nwYR2qGjJdLHQP321b6viA0SH5w2drDnfuOAvdGDv/9dK0X4c2z\r\n4WZLu7AndKQ9HlpwYTaXguplfBx77QjwaS43x8otIQgI/D9dQ+kIlDgzj4hm4TBn\r\nh171NaXKs3cw93v1h9lM66kzkta30A3sORdtAPNQ7bEYKYlQhCa4KHXXclRdjccQ\r\nfnAx5oBGycbpRvgn88VkmUl7+THNoCtFDvh1gG/XTGaxPH0XWYv5D9ojH9NyPD8s\r\nE2rwU93cMsuesIQcxBCax3DjoWrPp1qAsd4o0JP28snpZZVwIxigO5CE05nkUyYS\r\nHBettFNr9JL2eZox4+FRmY0NV8R0CqSqo+cYy6yu5UlZtJbN4+4Uk6xfXE9ApyWG\r\nt+BFIx9QpiuXFr4z/iFZ/QJ2i8f+teQyFDGA33Kr0y+PD1AZcyUy8m9eWhZHebl2\r\ntEqWqNINHoPr27My8+tG7HDBWmyBPuTyGEwdg93N6psb124NSZOe8pfYLPSyWFnb\r\nQ4bIw8hGfoPkzqjE4tDZ7YtFLZJvlSxyQViTxeFJ3A6wOq+3bebIvmRqV6mTdbi4\r\nNiqFNA3aSjUid1z8L7MbtpPVSdwmwXUrpRiM5Rr17CqcaPnmRUlxSSMucX5PLqQv\r\nKu1PEPzvyqE+Hqnaxi2gMaYj0+TRUAKXLJrjlWDRpIKp3K8Ic5dFdA8KUHqRBz7N\r\nUh/LOBPPWZNriT9vNrPdvjuiGiRcL3WGU4bu301U4g6gpUEHKNEcbXfyuCz6Iwh6\r\nhKfKiBLTHT//jr5TQKzs0cwyPCsOmG08bbgrnj59KoF6apuIXrw9RRvYVumChRx3\r\nvZIPlOF7g/2ncF1kHq+ChVu0zO0syti9efIV7vbpgZ385AdnRUHH3Eqk0lnYB3JK\r\nFuktWoFZB7VppOp8up9mznX4E5RRGJBAIdj61soZ4bHNSZeBbDECiwxW37xRTtd9\r\nUi/FVZzbGC1+gxbITJYSeWvAB9hmDHiO5fbCdohb3Wn8Z8dWb4FE/tx/TVpwmLat\r\n0uaHlteA6QLVPbQT1EaKyZhsNW9uqJ2LTEtyfe0JfNAXduF6phEyA2ZRBS8b82Jb\r\najK/8pFjqkm25q2aTPkFeVzWMYL/1w9EEPbFuqVXmD153NElebL4odAPE3ZCHpZs\r\nxgbcLw6zAYnQgNal8papOHrghs37iej++gBrzDbAf6Mj09wqTv7xESxpqH9hhSEs\r\nqcoEg2l5U9pSZ3oHq9z783EONSfDXQAl0RE=\r\n=Wsnw\r\n-----END PGP MESSAGE-----\r\n\r\n--Apple-Mail=_2E255D9C-89D7-4F15-81B9-0821710B1B04--",
                uid: 805
            }, {
                description: "Apple Mail (no attachment - PGP/MIME): Encrypted",
                raw: "Content-Type: multipart/encrypted; boundary=\"Apple-Mail=_930898CD-0C01-4F0E-8769-2B6F056DC2CD\"; protocol=\"application/pgp-encrypted\";\r\nSubject: test13\r\nMime-Version: 1.0 (Mac OS X Mail 7.3 \\(1878.2\\))\r\nX-Pgp-Agent: GPGMail (null)\r\nFrom: safewithme <safewithme.testuser@gmail.com>\r\nDate: Mon, 23 Jun 2014 21:23:32 +0200\r\nContent-Transfer-Encoding: 7bit\r\nMessage-Id: <0AF825EB-5923-4F11-B189-A3D8032A6D6C@gmail.com>\r\nContent-Description: OpenPGP encrypted message\r\nTo: safewithme.testuser@gmail.com\r\nX-Mailer: Apple Mail (2.1878.2)\r\n\r\nThis is an OpenPGP/MIME encrypted message (RFC 2440 and 3156)\r\n--Apple-Mail=_930898CD-0C01-4F0E-8769-2B6F056DC2CD\r\nContent-Transfer-Encoding: 7bit\r\nContent-Type: application/pgp-encrypted\r\nContent-Description: PGP/MIME Versions Identification\r\n\r\nVersion: 1\r\n\r\n--Apple-Mail=_930898CD-0C01-4F0E-8769-2B6F056DC2CD\r\nContent-Transfer-Encoding: 7bit\r\nContent-Disposition: inline;\r\n\tfilename=encrypted.asc\r\nContent-Type: application/octet-stream;\r\n\tname=encrypted.asc\r\nContent-Description: OpenPGP encrypted message\r\n\r\n-----BEGIN PGP MESSAGE-----\r\nComment: GPGTools - https://gpgtools.org\r\n\r\nhQEMA9f7k/zfv8I8AQf/WaCFHXTlBnLbqis/zjpRP7gcOvS8uUT3D77RO8Tbuu/6\r\nrh9AtSf78QLF3ogkDB5jlGkfQOxrPbMMyE9CzC8UPRZy5xdbGsUbv7z3biFfVX8P\r\nBmZSyAXTTduf4ewrp6cy7Mbm/wxSGnSMWW6ut30276izXJsw+SywMhg7dWojJyYs\r\nLWNhs5qQWHDoJdB6j/3T++gtpdE2Tv+hrzXrhskBf/rf3XfZmvi7UmFk0lVGpVXP\r\nyuX0iyyfaj8cV2ubycR79NKUlBp76HSZFBsDEY1Zbb/GJaHG/5lHbixf9klFbdoL\r\nGPF51IbQypL1dlYPffvGz/u3M5ctBvoUK4jgLYWOsMlnbIzD5WpmjmL5e3+cwcJj\r\noCbbtyYBJSuzY/4tmx5DRVAnoN0hWo3nLTfVNweMtKd1jms4FookhVZchxtuJkjy\r\nxPjygCncmf3PNmGARKFxZ05PvHlSPhGQ1YcqDRRpXRU+Cj78OHtbaA==\r\n=Ckmq\r\n-----END PGP MESSAGE-----\r\n\r\n--Apple-Mail=_930898CD-0C01-4F0E-8769-2B6F056DC2CD--",
                uid: 806
            }, {
                description: "Apple Mail (attachment - PGP/MIME): Signed",
                raw: "From: safewithme <safewithme.testuser@gmail.com>\r\nContent-Type: multipart/signed; boundary=\"Apple-Mail=_D557BC30-CF1E-41FD-8932-E73ED2C124EA\"; protocol=\"application/pgp-signature\"; micalg=pgp-sha512\r\nSubject: test17\r\nMessage-Id: <6B942730-FFE4-476C-980C-FF1ABA0740BD@gmail.com>\r\nDate: Mon, 23 Jun 2014 21:26:11 +0200\r\nTo: safewithme.testuser@gmail.com\r\nMime-Version: 1.0 (Mac OS X Mail 7.3 \\(1878.2\\))\r\nX-Mailer: Apple Mail (2.1878.2)\r\n\r\n\r\n--Apple-Mail=_D557BC30-CF1E-41FD-8932-E73ED2C124EA\r\nContent-Type: multipart/mixed;\r\n\tboundary=\"Apple-Mail=_6461D724-7906-49CB-BA38-D66A4E146EC3\"\r\n\r\n\r\n--Apple-Mail=_6461D724-7906-49CB-BA38-D66A4E146EC3\r\nContent-Transfer-Encoding: 7bit\r\nContent-Type: text/plain;\r\n\tcharset=us-ascii\r\n\r\ntest17\r\n\r\n--Apple-Mail=_6461D724-7906-49CB-BA38-D66A4E146EC3\r\nContent-Disposition: attachment;\r\n\tfilename=test.bin\r\nContent-Type: application/macbinary;\r\n\tx-unix-mode=0644;\r\n\tname=\"test.bin\"\r\nContent-Transfer-Encoding: 7bit\r\n\r\ntestattachment\r\n--Apple-Mail=_6461D724-7906-49CB-BA38-D66A4E146EC3\r\nContent-Transfer-Encoding: 7bit\r\nContent-Type: text/plain;\r\n\tcharset=us-ascii\r\n\r\n\r\n\r\n--Apple-Mail=_6461D724-7906-49CB-BA38-D66A4E146EC3--\r\n\r\n--Apple-Mail=_D557BC30-CF1E-41FD-8932-E73ED2C124EA\r\nContent-Transfer-Encoding: 7bit\r\nContent-Disposition: attachment;\r\n\tfilename=signature.asc\r\nContent-Type: application/pgp-signature;\r\n\tname=signature.asc\r\nContent-Description: Message signed with OpenPGP using GPGMail\r\n\r\n-----BEGIN PGP SIGNATURE-----\r\nComment: GPGTools - https://gpgtools.org\r\n\r\niQEcBAEBCgAGBQJTqH9TAAoJENf7k/zfv8I8ygYH/j6ICLJaxBLNhUvBxuXlZHse\r\nH1Rfg/rtF1UCJdqHRrefIYDTVUu1jiTjH1DKXJdujD+mNGhDUqBkF8vn+Hmu86H4\r\n/E9trGeygCkYZNdug1HINI4+fezGa3D28uDkPeN9LlDZBKBVXuEx+EAGBgJLaPbH\r\n7vdlqDqbwlXCU2JO6uGr4sqcTS0UMZaC0VLhBQyXelGQurjoD8XvamBnt5oRxtEc\r\nvftg7s9FKdErNC3mPoUkhFeQKXUiHACH/TzFUdXTh0K7y2ZXQFVmEg/+jjmoFX4D\r\nKPIvjrlM6FqDwo067tIT+S4WJ5MdcDcZRbyS6QkBuMVbugWeUokf/f8zgHQPnHA=\r\n=pJiW\r\n-----END PGP SIGNATURE-----\r\n\r\n--Apple-Mail=_D557BC30-CF1E-41FD-8932-E73ED2C124EA--",
                uid: 807
            }, {
                description: "Apple Mail (no attachment - PGP/MIME): Signed",
                raw: "From: safewithme <safewithme.testuser@gmail.com>\r\nContent-Type: multipart/signed; boundary=\"Apple-Mail=_D32A0631-70E5-46E7-8204-7A7D5EF145B1\"; protocol=\"application/pgp-signature\"; micalg=pgp-sha512\r\nSubject: test14\r\nMessage-Id: <ED2509B2-8CA2-4D38-B039-8E37A675FB26@gmail.com>\r\nDate: Mon, 23 Jun 2014 21:24:23 +0200\r\nTo: safewithme.testuser@gmail.com\r\nMime-Version: 1.0 (Mac OS X Mail 7.3 \\(1878.2\\))\r\nX-Mailer: Apple Mail (2.1878.2)\r\n\r\n\r\n--Apple-Mail=_D32A0631-70E5-46E7-8204-7A7D5EF145B1\r\nContent-Transfer-Encoding: 7bit\r\nContent-Type: text/plain;\r\n\tcharset=us-ascii\r\n\r\ntest14\r\n\r\n--Apple-Mail=_D32A0631-70E5-46E7-8204-7A7D5EF145B1\r\nContent-Transfer-Encoding: 7bit\r\nContent-Disposition: attachment;\r\n\tfilename=signature.asc\r\nContent-Type: application/pgp-signature;\r\n\tname=signature.asc\r\nContent-Description: Message signed with OpenPGP using GPGMail\r\n\r\n-----BEGIN PGP SIGNATURE-----\r\nComment: GPGTools - https://gpgtools.org\r\n\r\niQEcBAEBCgAGBQJTqH7nAAoJENf7k/zfv8I8crcH/1h2LEOiAddU7tXokMxfA+FT\r\nSPezAU3eUSzlDLIjq+6pFlFXmH+IVQcxx7dbiHekLtDiIweII58KOAHYodadO4Gg\r\ni/wist5rGpysHX1djQ6D/pqvxr8jEwxQ0tyvEkcDzMXcGolUZLQTDRHaCpgJAFrM\r\n525YHJ1UxAzlojq+/92EzI8JdqH+KT56BGCiBHFj6QlWF1OXV4L+mNk1zRMyESjI\r\n0LPYFYrUtBopy/0DvrqAkFFOOS6j6XjPa2Finofv49LqOc4ntpOSs0DwrDPb5Nn3\r\nMlDvsT80Bf+RfQdc8PzTAyN5Puv+XjDET407jVUsfKwEv/aUHRZnNXWAR2G+9xE=\r\n=CGVw\r\n-----END PGP SIGNATURE-----\r\n\r\n--Apple-Mail=_D32A0631-70E5-46E7-8204-7A7D5EF145B1--",
                uid: 808
            }, {
                description: "Thunderbird (attachment - PGP/MIME): Encrypted",
                raw: "Message-ID: <53A87E12.8040902@gmail.com>\r\nDate: Mon, 23 Jun 2014 21:20:50 +0200\r\nFrom: Andris Testbox2 <safewithme.testuser@gmail.com>\r\nUser-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:24.0) Gecko/20100101 Thunderbird/24.2.0\r\nMIME-Version: 1.0\r\nTo: safewithme <safewithme.testuser@gmail.com>\r\nSubject: test10\r\nX-Enigmail-Version: 1.6\r\nContent-Type: multipart/encrypted;\r\n protocol=\"application/pgp-encrypted\";\r\n boundary=\"MrDkNHd70n0CBWqJqodk50MfrlELiXLgn\"\r\n\r\nThis is an OpenPGP/MIME encrypted message (RFC 4880 and 3156)\r\n--MrDkNHd70n0CBWqJqodk50MfrlELiXLgn\r\nContent-Type: application/pgp-encrypted\r\nContent-Description: PGP/MIME version identification\r\n\r\nVersion: 1\r\n\r\n--MrDkNHd70n0CBWqJqodk50MfrlELiXLgn\r\nContent-Type: application/octet-stream; name=\"encrypted.asc\"\r\nContent-Description: OpenPGP encrypted message\r\nContent-Disposition: inline; filename=\"encrypted.asc\"\r\n\r\n-----BEGIN PGP MESSAGE-----\r\nVersion: GnuPG v1.4.13 (Darwin)\r\nComment: GPGTools - https://gpgtools.org\r\nComment: Using GnuPG with Thunderbird - http://www.enigmail.net/\r\n\r\nhQEMA9f7k/zfv8I8AQf/SY0E1+kzz5VFpxeTMEvc1sqpMyWJC2kIvZL+c5mjQ6yZ\r\nkAtYwGb7MPzqUc9gHSWTEdqCB0I2hVk6n6mjWkaX6t2y8ko42Xxpf2/nEM062gPm\r\nv4+r/eQeC6ey8DXjCLE+h3gbKsu3ebuQF2Bqci6eCcU9njTzkwOlTxA3fCQWW4pF\r\nWtKMiGmCpusEdli5dB/JvKDzYo0zXKUWNkwcyT9kcu36DsOAWFldNFwzEWJWk1SR\r\naN5Fx1AARh51Cw4mEFW/FHgf6Ajt9Krj+B+E4FHmyy4E0rvoo8RNINeCKZOoSFLW\r\nOPWdIAZyTTRrw2cdsyLLhqX0ddYSobnIoz2/WJ/T48nAaYkb3ASulujtz6HUAK+B\r\nyn9HSyt7YxR+n0w6nvs21tidlT+TGQnj4KQVdx30V+i9DX3dXDdd4MXJYnGBAEqc\r\nc/FpqrJVP6V6CSsdvY5WVd/+17kZJEcyH+rfdDi3Y5c/bSnJBmc5UqY0FvbW4TRh\r\nfij0pZMMBvji5nagKIP2fHRDpxvP2UIosD5oj0xkhh6dpWtbyuL3KES2XodSJBxm\r\nRqTvns2ONWtu93MT3cjTAHDMH5edGFqrSDXWfh2sgYhg9vdD7RoWe2df6BEBywKf\r\nldTim+X5vUasHiRK6adIGRHmrs9CvU9p1u+N3CLRUZsMvwy5Uj1LVim89HKOu+QI\r\nultWesSVB+UiYnfQRQ7urzE/xAZyTniA1eJNKygyriQyI+uLTC/gi59yHw==\r\n=3OkT\r\n-----END PGP MESSAGE-----\r\n\r\n--MrDkNHd70n0CBWqJqodk50MfrlELiXLgn--",
                uid: 809
            }, {
                description: "Thunderbird (attachment - PGP/MIME): Encrypted and signed",
                raw: "Message-ID: <53A87DC2.6010102@gmail.com>\r\nDate: Mon, 23 Jun 2014 21:19:30 +0200\r\nFrom: Andris Testbox2 <safewithme.testuser@gmail.com>\r\nUser-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:24.0) Gecko/20100101 Thunderbird/24.2.0\r\nMIME-Version: 1.0\r\nTo: safewithme <safewithme.testuser@gmail.com>\r\nSubject: test9\r\nX-Enigmail-Version: 1.6\r\nContent-Type: multipart/encrypted;\r\n protocol=\"application/pgp-encrypted\";\r\n boundary=\"N184DqJgpX0F6MPTPjS0P6IxMgfbap3qD\"\r\n\r\nThis is an OpenPGP/MIME encrypted message (RFC 4880 and 3156)\r\n--N184DqJgpX0F6MPTPjS0P6IxMgfbap3qD\r\nContent-Type: application/pgp-encrypted\r\nContent-Description: PGP/MIME version identification\r\n\r\nVersion: 1\r\n\r\n--N184DqJgpX0F6MPTPjS0P6IxMgfbap3qD\r\nContent-Type: application/octet-stream; name=\"encrypted.asc\"\r\nContent-Description: OpenPGP encrypted message\r\nContent-Disposition: inline; filename=\"encrypted.asc\"\r\n\r\n-----BEGIN PGP MESSAGE-----\r\nVersion: GnuPG v1.4.13 (Darwin)\r\nComment: GPGTools - https://gpgtools.org\r\nComment: Using GnuPG with Thunderbird - http://www.enigmail.net/\r\n\r\nhQEMA9f7k/zfv8I8AQf5AX+nmpkoDAn7MHFwQZ9ENIOtYRRTY1aakavO0oVuiOWm\r\nerJO+/4ORrtSapkZjp9cnE0Kwuo44fkmbObt+JquHVg4Bcxee3IpViTOx1dV+IPr\r\n/R5zcPp3myk9hqwkpwlCPOUVXmD8YQeLQQfiM90E0+ldF9q1Q4UKW/usmaJQBwWd\r\nWrR9KURfBrh1eqIO927YXIInnhlCl0ZiYwghCeJ7nrfHF7a3ftHuSMJhkywNKGWH\r\nhL7FghCwpmVuHyneB8lJVGz4txwnW51kK05Il46Uab1y9jSutUN+5IVWmRx6m+zt\r\n7aj3Cyd8rAzc9LdP0XEPOe1+cht9GTXXMdj+Kk5758npNB32pMfQ8YSOcIU1luyk\r\nKWE6yG5+7ZWFXrbdXVjXRKXMN31c4Hw0Ccv1kO/viAvthAU3hFZM0cBp+PtiOrxS\r\nynBBi7r2o3xb8NTGGYRq/P0H9Odemj2x6OGbIXS40ApTAGKeNNhHpF5HwaAWuMul\r\n2Pnjdt8x34PiKd/L/TOSAtmQZqkQ3xmYOMpP5XKiCYTBeMMM46Gz4rbTnrJawW5X\r\n8nxvQjJmDzcAByS9bJSNh0a6vF+JbTNbTH7kIjqPUm57zyie2+uBCjg5dIeqZt4l\r\nF85Ai+chMwtUNZ50tEfPhk1opf+HsJ8OfrNEOiA8xCQNL3ZUPnaHkhLAd8bh05zI\r\nyzJOBLwSrFpCMZWkPm1PK6J99M6JH5MJyZxvdQfH/YyhCdqiyCUQc1lObdPBLN/A\r\n/Lb1xUnqppA7yvr6RpWQ+EAUVohknGRhqdL/PxOcCv9GY2DW0dHxUdYbyBzoFj6h\r\nhmzaCIUmhjDGLi4qCxLdn46IKKFtEncMBGgrIQTgDGHXyUaUlEVtWs3I6aRkgYbz\r\no2t3UytJxyMUevCpSBADlHO0Rd1q0MyEsmGKKYoyJSt1NX4C6pmEl3kVJoyvkQWb\r\nbgFBG0KYkx5+UtBGlubYrP2MS2xRQ+6hHCJtIFOfQHcWlUg4jy8mZNVjV+S+zvbV\r\nGjIhjdmvFAvp/sgcwTGmYbh4LpUP/pI+jmIh3Gg8l1PDlh95uSzKJ770m2U8W7ws\r\nNbgG3RdxD0ZocJkeYslvHKid3kf2LIKeH1ADJj/t6rfD/4k31iQeGcNASnDNsel3\r\njbp8HJ9LSm0h0xeWCiOLqa/c6ysXLravA7nBC1XHKE3u4tcIjcZEYt6Z\r\n=qwkL\r\n-----END PGP MESSAGE-----\r\n\r\n--N184DqJgpX0F6MPTPjS0P6IxMgfbap3qD--",
                uid: 810
            }, {
                description: "Thunderbird (no attachment - PGP/INLINE): Encrypted and signed",
                raw: "Message-ID: <53A8796A.6000502@gmail.com>\r\nDate: Mon, 23 Jun 2014 21:00:58 +0200\r\nFrom: Andris Testbox2 <safewithme.testuser@gmail.com>\r\nUser-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:24.0) Gecko/20100101 Thunderbird/24.2.0\r\nMIME-Version: 1.0\r\nTo: safewithme.testuser@gmail.com\r\nSubject: test4\r\nX-Enigmail-Version: 1.6\r\nContent-Type: text/plain; charset=ISO-8859-1\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n\r\n-----BEGIN PGP MESSAGE-----\r\nCharset: ISO-8859-1\r\nVersion: GnuPG v1.4.13 (Darwin)\r\nComment: GPGTools - https://gpgtools.org\r\nComment: Using GnuPG with Thunderbird - http://www.enigmail.net/\r\n\r\nhQEMA9f7k/zfv8I8AQf8CCwYxQuhh9kAd4Vz8nUP8YLScfexq8juAawc5bsq3sf5\r\nMl1E6zzM8d0M8ultmL+Y2RRYX82/kEvc1c3bWNJNSagwqxlD54dToXTraGkE+hbF\r\nlMnsAq/jpcsXH0G9oFPwMi5NMWKbZQIUdsi3Iszx8x1WEWcV9XE4C0xg0LfN66vr\r\n1ykTTcg+wv4XmxvljvgA+VT6HvS1jqE/NrfseDtQJNIs42sfylgJF0neOfkrjrn/\r\nDljslmd1WgbDjbAk+hzT+8zmRfCLK2GhRtsRskdGGSzDiYhAc1qLU6GtVuhig088\r\nF3Gk1Sqgnffi1/X16j2sN5URjteaXnvHIJwGypuoLsnAjmQyh0vVs8hVb4jZw+aR\r\n8atbrYPLCN8VnIRK+4E9v45aGef3U8Dul3FXx06s6UZVGTaPHOFIkFJhfA4Vswh5\r\n6n7A5kAhGx9VgChOyjaGpBdpFuhsD1fpixhVlTCAmIanJwYi5Cvz2nfN8QOIamsc\r\ndM0bE0utru2YCmmzVgVjDr4xtM7tAPfresDnEXt/eqRiIFntT/tD8yke4/vTMS3s\r\nJVMhFrlm14BohvRnaF0sUeFiMSbDL1ox8pmtRUdIFY3mhq+R9XUpFb7ktOd6husG\r\nthMDtT+1Tb7/W2rHFx7nJIQtjKbgM79/Pson+O2LzX6fY7qeQKnUX9dBb15t5e94\r\n78yazU5T1JmMHA+Szzu6OMy3eHkkOqxsst62nMXgrgGk7NhUNl+3oP5k/aT6iqA2\r\n3deWy5YfwtC0hRHWnT6zweJJohOVwrQQJ9oxTSi3iJ0=3D\r\n=3D9EeZ\r\n-----END PGP MESSAGE-----\r\n\r\n",
                uid: 811
            }, {
                description: "Thunderbird (no attachment - PGP/INLINE): Encrypted",
                raw: "Message-ID: <53A87AD7.9090109@gmail.com>\r\nDate: Mon, 23 Jun 2014 21:07:03 +0200\r\nFrom: Andris Testbox2 <safewithme.testuser@gmail.com>\r\nUser-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:24.0) Gecko/20100101 Thunderbird/24.2.0\r\nMIME-Version: 1.0\r\nTo: safewithme.testuser@gmail.com\r\nSubject: test5\r\nX-Enigmail-Version: 1.6\r\nContent-Type: text/plain; charset=ISO-8859-1\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n\r\n-----BEGIN PGP MESSAGE-----\r\nCharset: ISO-8859-1\r\nVersion: GnuPG v1.4.13 (Darwin)\r\nComment: GPGTools - https://gpgtools.org\r\nComment: Using GnuPG with Thunderbird - http://www.enigmail.net/\r\n\r\nhQEMA9f7k/zfv8I8AQf+KmR4WIpBMlhm7HFxWEEmRAezEaKWX1X9oDCMBMC/WTPa\r\nzegDeysvFsh7SvLDZngm+hPDxCWIh+h/6EZaWGuQBJKcyglTncZEA3T5vz+IRJoP\r\ngFUVZ9YLaT58DAzLOpg8noNAEp0+E+cfDsVvhBI8Hzx7VRt1/msO+RWWEZOnD1xw\r\nD5iJ0AfONzAcfHc0jJosz8/iUkWBexBwtG+dm4mdyE+X6g30zHY6afa5/E7LvfXd\r\nZUFr+pgHa1eQYKtqtyeZPrli0zSHtFMOdr8eDkp89/MZgQbbYHEaLTjWUzDsogDT\r\n3FzTbm4t4fPolEHgZFnDwCrqPTRZAN999zscD12CiMkdTc0iVy4mH50QgeF/m/w7\r\n7ewbgh38TN8YbXvaA6A=3D\r\n=3Di2Il\r\n-----END PGP MESSAGE-----\r\n\r\n",
                uid: 812
            }, {
                description: "Thunderbird (no attachment): plaintext reply to an encrypted message",
                raw: "Message-ID: <53A87D09.9050602@gmail.com>\r\nDate: Mon, 23 Jun 2014 21:16:25 +0200\r\nFrom: Andris Testbox2 <safewithme.testuser@gmail.com>\r\nUser-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:24.0) Gecko/20100101 Thunderbird/24.2.0\r\nMIME-Version: 1.0\r\nTo: safewithme <safewithme.testuser@gmail.com>\r\nSubject: Re: test8\r\nReferences: <A67E19EA-233D-4527-855B-292054BED73F@gmail.com>\r\nIn-Reply-To: <A67E19EA-233D-4527-855B-292054BED73F@gmail.com>\r\nX-Enigmail-Version: 1.6\r\nContent-Type: text/plain; charset=ISO-8859-1\r\nContent-Transfer-Encoding: 7bit\r\n\r\ntest8\r\n\r\n23.06.14 21:12, safewithme kirjutas:\r\n> test8\r\n",
                uid: 813
            }, {
                description: "Thunderbird (attachment - PGP/MIME): Signed",
                raw: "Message-ID: <53A87E4B.50702@gmail.com>\r\nDate: Mon, 23 Jun 2014 21:21:47 +0200\r\nFrom: Andris Testbox2 <safewithme.testuser@gmail.com>\r\nUser-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:24.0) Gecko/20100101 Thunderbird/24.2.0\r\nMIME-Version: 1.0\r\nTo: safewithme <safewithme.testuser@gmail.com>\r\nSubject: test11\r\nX-Enigmail-Version: 1.6\r\nContent-Type: multipart/signed; micalg=pgp-sha512;\r\n protocol=\"application/pgp-signature\";\r\n boundary=\"LldNQubkCiWQwPKXrfghi6DLbotCLEBuX\"\r\n\r\nThis is an OpenPGP/MIME signed message (RFC 4880 and 3156)\r\n--LldNQubkCiWQwPKXrfghi6DLbotCLEBuX\r\nContent-Type: multipart/mixed;\r\n boundary=\"------------070307080002050009010403\"\r\n\r\nThis is a multi-part message in MIME format.\r\n--------------070307080002050009010403\r\nContent-Type: text/plain; charset=ISO-8859-1\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\ntest11\r\n\r\n--------------070307080002050009010403\r\nContent-Type: application/macbinary;\r\n name=\"test.bin\"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment;\r\n filename=\"test.bin\"\r\n\r\ndGVzdGF0dGFjaG1lbnQ=\r\n--------------070307080002050009010403--\r\n\r\n--LldNQubkCiWQwPKXrfghi6DLbotCLEBuX\r\nContent-Type: application/pgp-signature; name=\"signature.asc\"\r\nContent-Description: OpenPGP digital signature\r\nContent-Disposition: attachment; filename=\"signature.asc\"\r\n\r\n-----BEGIN PGP SIGNATURE-----\r\nVersion: GnuPG v1.4.13 (Darwin)\r\nComment: GPGTools - https://gpgtools.org\r\nComment: Using GnuPG with Thunderbird - http://www.enigmail.net/\r\n\r\niQEcBAEBCgAGBQJTqH5OAAoJENf7k/zfv8I8oFoH/R6EFTw2CYUQoOKSAQstWIHp\r\nfVVseLOkFbByUV5eLuGVBNI3DM4GQ6C7dGntKAn34a1iTGcAIZH+fIhaZ2WtNdtA\r\nR+Ijn8xDjbF/BWvcTBOaRvgw9b8viPxhkVYa3PioHYz6krt/LmFqFdp/phWZcqR4\r\njzWMX55h4FOw3YBNGiz2NuIg+iGrFRWPYgd8NVUmJKReZHs8C/6HGz7F4/A24k6Y\r\n7xms9D6Er+MhspSl+1dlRdHjtXiRqC5Ld1hi2KBKc6YzgOLpVw5l9sffbnH+aRG4\r\ndH+2J5U3elqBDK1i3GyG8ixLSB0FGW9+lhYNosZne2xy8SbQKdgsnTBnWSGevP0=\r\n=xiih\r\n-----END PGP SIGNATURE-----\r\n\r\n--LldNQubkCiWQwPKXrfghi6DLbotCLEBuX--",
                uid: 814
            }, {
                description: "Thunderbird (no attachment - PGP/INLINE): Signed",
                raw: "Message-ID: <53A87B12.9010706@gmail.com>\r\nDate: Mon, 23 Jun 2014 21:08:02 +0200\r\nFrom: Andris Testbox2 <safewithme.testuser@gmail.com>\r\nUser-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:24.0) Gecko/20100101 Thunderbird/24.2.0\r\nMIME-Version: 1.0\r\nTo: safewithme.testuser@gmail.com\r\nSubject: test6\r\nX-Enigmail-Version: 1.6\r\nContent-Type: text/plain; charset=ISO-8859-1\r\nContent-Transfer-Encoding: 7bit\r\n\r\n\r\n-----BEGIN PGP SIGNED MESSAGE-----\r\nHash: SHA512\r\n\r\ntest6\r\n-----BEGIN PGP SIGNATURE-----\r\nVersion: GnuPG v1.4.13 (Darwin)\r\nComment: GPGTools - https://gpgtools.org\r\nComment: Using GnuPG with Thunderbird - http://www.enigmail.net/\r\n\r\niQEcBAEBCgAGBQJTqHsSAAoJENf7k/zfv8I8wz4H/RWo1qJvvJtMl7GyqGGbaByX\r\n/D7/yWJzMdE0Y7J/tHIexQ/sZnmcDlHG0mtJKgI7EOh2EyV+r+78vF71Mlc+bg8g\r\n3B4TKyp0QU1Pb6SETG//FtKrU7SnkjKujHvRMpzcOcm0ZLBDpmftyWLvp9Dg3KOF\r\n5sMBGpJRn1pqX2DxXZtc1rYOmSAaxFI5jewPws0DCDkLDGp9gLyusNeDHkmAT4AG\r\nDqsDPQvW0R4Sy7aQFT7GjrdnCiLyikynkocUpR95fDnjHJ6Xbyj2Yj9/ofewPQ//\r\nMq39sIYbcqlDBAhsOlii3ekdzLS4xEOkvtFoD4pufyLj3pYY60FG4bPygcccYkI=\r\n=IkRV\r\n-----END PGP SIGNATURE-----\r\n",
                uid: 815
            }, {
                description: "Mailvelope (no attachment - PGP/INLINE): encrypted and signed",
                raw: "MIME-Version: 1.0\r\nReceived: by 10.195.18.8 with HTTP; Fri, 4 Jul 2014 06:58:43 -0700 (PDT)\r\nDate: Fri, 4 Jul 2014 15:58:43 +0200\r\nDelivered-To: safewithme.testuser@gmail.com\r\nMessage-ID: <CAAGARGwr94CXUuC_brPCMu58KtTgOJwr9V1jHafjKkPx3Xn0dg@mail.gmail.com>\r\nSubject: \r\nFrom: safewithme testuser <safewithme.testuser@gmail.com>\r\nTo: safewithme testuser <safewithme.testuser@gmail.com>\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n-----BEGIN PGP MESSAGE-----\r\nVersion: Mailvelope v0.9.0\r\nComment: Email security by Mailvelope - https://www.mailvelope.com\r\n\r\nwcBMA9f7k/zfv8I8AQf9F/Gm4HqJ/RlU2w+qIbJ4Va2PFR04OITlZIuUAWms\r\nPhPo4cGFbgxQnBzD7goswvNLXfEo4Q6/wxqT/wuwLGQdQJDoEduQxO5p77c1\r\n+dw/sa+pcr4jdwjebjV45NODVGDxgSF+YIwwKN3XXF6VqcisLLYBONYTHIU8\r\nKdTYR+R8SXSpMGISLUyyeY3Jaw5Et8cEoo0a1z8Fx04Ycv2Gw9Io0NVEqxYR\r\n86HUCLsOSARZC1aJ6hf9wheB528o0wuM6ESJ1LWnMWudyrkMjAiW6AiH89G8\r\npykTuYvc/GH3q7eEKNtY5khuZwi2Z7VJFrTeaEt4cb6HxlUlECudYw79uAHu\r\nt9JGATfaNeUpZV2xLEPBhsW5VrY4nDpbWVLp9stAKNFEiH6Ai/rgNwJ2A9Xr\r\nnWAji8YlIOOdO1iNVaYEQWEW1s5Hw5rYB83LKg==\r\n=ungD\r\n-----END PGP MESSAGE-----\r\n",
                uid: 816
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

        it('should run beforeEach and afterEach', function() {
            // afterEach clears userStorage
            expect(emailDao).to.exist;
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
            it('should insert images into html mail', function(done) {
                emailDao.onIncomingMessage = function(messages) {
                    emailDao.getBody({
                        folder: currentFolder,
                        message: messages[8]
                    }, function(err, message) {
                        expect(err).to.not.exist;
                        expect(message.html).to.equal('<html><head><meta http-equiv="Content-Type" content="text/html charset=us-ascii"></head><body style="word-wrap: break-word; -webkit-nbsp-mode: space; -webkit-line-break: after-white-space;">asd<img apple-inline="yes" id="53B73BDD-69A0-4E8E-BA7B-3D2EF399C0D3" height="1" width="1" apple-width="yes" apple-height="yes" src="data:application/octet-stream;base64,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"></body></html>');
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

            describe('Real life data mail parsing', function() {

                it('should parse Apple Mail (attachment - PGP/MIME): Encrypted', function(done) {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[9]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            emailDao.decryptBody({
                                message: message,
                                folder: currentFolder
                            }, function(err) {
                                expect(err).to.not.exist;
                                expect(message.encrypted).to.be.true;
                                expect(message.signed).to.be.false;
                                expect(message.signaturesValid).to.be.undefined;
                                expect(message.attachments.length).to.equal(1);
                                expect(message.body).to.equal('test16');
                                done();
                            });
                        });
                    };
                });

                it('should parse Apple Mail (attachment - PGP/MIME): Encrypted and signed', function(done) {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[10]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            emailDao.decryptBody({
                                message: message,
                                folder: currentFolder
                            }, function(err) {
                                expect(err).to.not.exist;
                                expect(message.encrypted).to.be.true;
                                expect(message.signed).to.be.true;
                                expect(message.signaturesValid).to.be.true;
                                expect(message.attachments.length).to.equal(1);
                                expect(message.body).to.equal('test15');
                                done();
                            });
                        });
                    };
                });

                it('should parse Apple Mail (no attachment): Encrypted and signed', function(done) {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[11]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            emailDao.decryptBody({
                                message: message,
                                folder: currentFolder
                            }, function(err) {
                                expect(err).to.not.exist;
                                expect(message.encrypted).to.be.true;
                                expect(message.signed).to.be.true;
                                expect(message.signaturesValid).to.be.true;
                                expect(message.attachments.length).to.equal(0);
                                expect(message.body).to.equal('test12');
                                done();
                            });
                        });
                    };
                });

                it('should parse Apple Mail (no attachment): Encrypted', function(done) {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[12]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            emailDao.decryptBody({
                                message: message,
                                folder: currentFolder
                            }, function(err) {
                                expect(err).to.not.exist;
                                expect(message.encrypted).to.be.true;
                                expect(message.signed).to.be.false;
                                expect(message.signaturesValid).to.be.undefined;
                                expect(message.attachments.length).to.equal(0);
                                expect(message.body).to.equal('test13');
                                done();
                            });
                        });
                    };
                });

                it('should parse Apple Mail (attachment - PGP/MIME): Signed', function(done) {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[13]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            emailDao.decryptBody({
                                message: message,
                                folder: currentFolder
                            }, function(err) {
                                expect(err).to.not.exist;
                                expect(message.encrypted).to.be.false;
                                expect(message.signed).to.be.true;
                                expect(message.signaturesValid).to.be.true;
                                expect(message.attachments.length).to.equal(1);
                                expect(message.body).to.equal('test17\n');
                                done();
                            });
                        });
                    };
                });

                it('should parse Apple Mail (no attachment): Signed', function(done) {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[14]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            emailDao.decryptBody({
                                message: message,
                                folder: currentFolder
                            }, function(err) {
                                expect(err).to.not.exist;
                                expect(message.encrypted).to.be.false;
                                expect(message.signed).to.be.true;
                                expect(message.signaturesValid).to.be.true;
                                expect(message.attachments.length).to.equal(0);
                                expect(message.body).to.equal('test14');
                                done();
                            });
                        });
                    };
                });

                it('should parse Thunderbird (attachment - PGP/MIME): Encrypted', function(done) {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[15]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            emailDao.decryptBody({
                                message: message,
                                folder: currentFolder
                            }, function(err) {
                                expect(err).to.not.exist;
                                expect(message.encrypted).to.be.true;
                                expect(message.signed).to.be.false;
                                expect(message.signaturesValid).to.be.undefined;
                                expect(message.attachments.length).to.equal(1);
                                expect(message.body).to.equal('test10');
                                done();
                            });
                        });
                    };
                });

                it('should parse Thunderbird (attachment - PGP/MIME): Encrypted and signed', function(done) {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[16]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            emailDao.decryptBody({
                                message: message,
                                folder: currentFolder
                            }, function(err) {
                                expect(err).to.not.exist;
                                expect(message.encrypted).to.be.true;
                                expect(message.signed).to.be.true;
                                expect(message.signaturesValid).to.be.true;
                                expect(message.attachments.length).to.equal(1);
                                expect(message.body).to.equal('test9');
                                done();
                            });
                        });
                    };
                });

                it('should parse Thunderbird (no attachment): Encrypted and signed', function(done) {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[17]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            emailDao.decryptBody({
                                message: message,
                                folder: currentFolder
                            }, function(err) {
                                expect(err).to.not.exist;
                                expect(message.encrypted).to.be.true;
                                expect(message.signed).to.be.true;
                                expect(message.signaturesValid).to.be.true;
                                expect(message.attachments.length).to.equal(0);
                                expect(message.body).to.equal('test4\n');
                                done();
                            });
                        });
                    };
                });

                it('should parse Thunderbird (no attachment): Encrypted', function(done) {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[18]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            emailDao.decryptBody({
                                message: message,
                                folder: currentFolder
                            }, function(err) {
                                expect(err).to.not.exist;
                                expect(message.encrypted).to.be.true;
                                expect(message.signed).to.be.false;
                                expect(message.signaturesValid).to.be.undefined;
                                expect(message.attachments.length).to.equal(0);
                                expect(message.body).to.equal('test5\n');
                                done();
                            });
                        });
                    };
                });

                it('should parse Thunderbird (no attachment): plaintext reply to an encrypted message', function(done) {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[19]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            emailDao.decryptBody({
                                message: message,
                                folder: currentFolder
                            }, function(err) {
                                expect(err).to.not.exist;
                                expect(message.encrypted).to.be.false;
                                expect(message.signed).to.be.false;
                                expect(message.signaturesValid).to.be.undefined;
                                expect(message.attachments.length).to.equal(0);
                                expect(message.body).to.equal('test8\n\n23.06.14 21:12, safewithme kirjutas:\n> test8');
                                done();
                            });
                        });
                    };
                });

                it('should parse Thunderbird (attachment - PGP/MIME): Signed', function(done) {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[20]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            emailDao.decryptBody({
                                message: message,
                                folder: currentFolder
                            }, function(err) {
                                expect(err).to.not.exist;
                                expect(message.encrypted).to.be.false;
                                expect(message.signed).to.be.true;
                                expect(message.signaturesValid).to.be.true;
                                expect(message.attachments.length).to.equal(1);
                                expect(message.body).to.equal('test11');
                                done();
                            });
                        });
                    };
                });

                it('should parse Thunderbird (no attachment): Signed w/ PGP/INLINE', function(done) {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[21]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            emailDao.decryptBody({
                                message: message,
                                folder: currentFolder
                            }, function(err) {
                                expect(err).to.not.exist;
                                expect(message.encrypted).to.be.false;
                                expect(message.signed).to.be.true;
                                expect(message.signaturesValid).to.be.true;
                                expect(message.attachments.length).to.equal(0);
                                expect(message.body).to.equal('test6');
                                done();
                            });
                        });
                    };
                });

                it('should parse Mailvelope: encrypted (unsigned) w/PGP/INLINE', function(done) {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[22]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            emailDao.decryptBody({
                                message: message,
                                folder: currentFolder
                            }, function(err) {
                                expect(err).to.not.exist;
                                expect(message.encrypted).to.be.true;
                                expect(message.signed).to.be.false;
                                expect(message.signaturesValid).to.be.undefined;
                                expect(message.attachments.length).to.equal(0);
                                expect(message.body).to.equal('this is a test');
                                done();
                            });
                        });
                    };
                });
            });
        });

        describe('SMTP Tests', function() {
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

                    expect(/^Content-Type: multipart\/mixed/.test(mail.body)).to.be.false;
                    expect(/^Content-Type: multipart\/encrypted/.test(mail.body)).to.be.true;
                    expect(mail.body).to.contain('LS0tLS1CRUdJTiBQR1AgTUVTU0FHRS0tLS0tDQpWZXJzaW9uOiBPcGVuUEdQLmpzIHYwLjcuMg0K'); // one line of the ciphertext
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

        describe('Compose-Send-Receive-Read round trip', function() {
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

                sinon.stub(smtpServer, 'onmail', function(mail) {
                    setTimeout(function() {
                        imapServer.appendMessage(currentFolder.path, [], false, mail.body);
                    }, 1000);
                });
            });

            afterEach(function() {
                smtpServer.onmail.restore();
            });

            it('should send & receive a signed plaintext message', function(done) {
                var expectedBody = "asdasdasdasdasdasdasdasdasdasdasdasd asdasdasdasdasdasdasdasdasdasdasdasd asdasdasdasdasdasdasdasdasdasdasdasd asdasdasdasdasdasdasdasdasdasdasdasd asdasdasdasdasdasdasdasdasdasdasdasd asdasdasdasdasdasdasdasdasdasdasdasd asdasdasdasdasdasdasdasdasdasdasdasd asdasdasdasdasdasdasdasdasdasdasdasd asdasdasdasdasdasdasdasdasdasdasdasd asdasdasdasdasdasdasdasdasdasdasdasd asdasdasdasdasdasdasdasdasdasdasdasd ";

                emailDao.onIncomingMessage = function() {
                    emailDao.onIncomingMessage = function(messages) {
                        emailDao.getBody({
                            folder: currentFolder,
                            message: messages[0]
                        }, function(err, message) {
                            expect(err).to.not.exist;
                            expect(message.encrypted).to.be.false;
                            expect(message.signed).to.be.true;
                            expect(message.signaturesValid).to.be.true;
                            expect(message.attachments.length).to.equal(0);
                            expect(message.body).to.equal(expectedBody + str.signature + config.cloudUrl + '/' + testAccount.user);
                            done();
                        });
                    };

                    emailDao.sendPlaintext({
                        smtpclient: smtpClient,
                        email: {
                            from: [testAccount.user],
                            to: [testAccount.user],
                            subject: 'plaintext test',
                            body: expectedBody
                        }
                    }, function(err) {
                        expect(err).to.not.exist;
                    });
                };
            });
        });
    });
});