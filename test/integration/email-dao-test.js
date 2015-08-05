'use strict';

var ImapClient = require('imap-client'),
    BrowserCrow = require('browsercrow'),
    BrowserSMTP = require('browsersmtp'),
    SmtpClient = require('wo-smtpclient'),
    LawnchairDAO = require('../../src/js/service/lawnchair'),
    DeviceStorageDAO = require('../../src/js/service/devicestorage'),
    mailreader = require('mailreader'),
    PgpMailer = require('pgpmailer'),
    config = require('../../src/js/app-config').config,
    str = require('../../src/js/app-config').string;

describe('Email DAO integration tests', function() {
    this.timeout(100000);

    var accountService, emailDao, imapClient, pgpMailer, imapMessages, imapFolders, imapServer, smtpServer, smtpClient, userStorage, auth,
        mockKeyPair, inbox, spam;

    var testAccount = {
        user: 'safewithme.testuser@gmail.com',
        pass: 'passphrase',
        xoauth2: 'testtoken'
    };

    beforeEach(function(done) {

        //
        // Test data
        //

        imapMessages = [{
            raw: 'Message-id: <c>\r\nSubject: hello 3\r\n\r\nWorld 3!',
            uid: 799
        }, {
            raw: 'Message-id: <d>\r\nSubject: hello 3\r\n\r\nWorld 4!',
            uid: 800
        }, {
            raw: 'Message-id: <e>\r\nSubject: hello 5\r\n\r\nWorld 5!',
            uid: 801
        }, {
            raw: 'Delivered-To: throwaway.felix@gmail.com\r\nReceived: by 10.42.174.3 with SMTP id t3csp241492icz;\r\n        Wed, 25 Jun 2014 05:45:10 -0700 (PDT)\r\nX-Received: by 10.180.20.206 with SMTP id p14mr10320792wie.26.1403700309809;\r\n        Wed, 25 Jun 2014 05:45:09 -0700 (PDT)\r\nReturn-Path: <mail@felixhammerl.com>\r\nReceived: from mail-wi0-f172.google.com (mail-wi0-f172.google.com [209.85.212.172])\r\n        by mx.google.com with ESMTPS id d9si4992982wje.76.2014.06.25.05.44.59\r\n        for <throwaway.felix@gmail.com>\r\n        (version=TLSv1 cipher=ECDHE-RSA-RC4-SHA bits=128/128);\r\n        Wed, 25 Jun 2014 05:44:59 -0700 (PDT)\r\nReceived-SPF: pass (google.com: domain of mail@felixhammerl.com designates 209.85.212.172 as permitted sender) client-ip=209.85.212.172;\r\nAuthentication-Results: mx.google.com;\r\n       spf=pass (google.com: domain of mail@felixhammerl.com designates 209.85.212.172 as permitted sender) smtp.mail=mail@felixhammerl.com\r\nReceived: by mail-wi0-f172.google.com with SMTP id hi2so7776737wib.11\r\n        for <throwaway.felix@gmail.com>; Wed, 25 Jun 2014 05:44:59 -0700 (PDT)\r\nX-Google-DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;\r\n        d=1e100.net; s=20130820;\r\n        h=x-gm-message-state:from:content-type:subject:message-id:date:to\r\n         :mime-version;\r\n        bh=s4NMXN5u+JHQKeYuoCYcsqfFEEqH1GauOiEzb6O3ma0=;\r\n        b=khBrYuEYLBy6IZOWmdXQi4lvi9PhH67+zvkfZUJ5aV/SyWZUHNsuXsnJThI0Fj7Xbx\r\n         XbeSDiZCJhD1XZgkVoERUmKFIgRmQURgm44SC6ZgBgDJvHXB2gVapPUAPIWIM9S8OuqH\r\n         n5YKWob9M4GO6jV5WrTGx+tiDP6GiRO0dM4/nGe+MC+xAvVMPtqESxhNu6L6gGXJHVXC\r\n         XMVx6ZP64SsLrFOCEqGCea49bPi7ee474nT+uL2zNc69fbpkqdRzRGSrru+11Buf6ZDV\r\n         gcTsA9Xrmpy0DwIUxkIDyyxaEgAMc9qnprM2f0CYuub26RnSryeLCdX4KRfcQaVEFKTd\r\n         38AQ==\r\nX-Gm-Message-State: ALoCoQmv6i9holEFjurNeEf5WgK5j3TDeENKMSkaBtsR08RK6tt9BShN8lvr0y0ktwghZqRf6823\r\nX-Received: by 10.194.174.35 with SMTP id bp3mr1720884wjc.33.1403700299213;\r\n        Wed, 25 Jun 2014 05:44:59 -0700 (PDT)\r\nReturn-Path: <mail@felixhammerl.com>\r\nReceived: from [192.168.16.29] (host-88-217-174-118.customer.m-online.net. [88.217.174.118])\r\n        by mx.google.com with ESMTPSA id wk8sm7294078wjb.22.2014.06.25.05.44.58\r\n        for <throwaway.felix@gmail.com>\r\n        (version=TLSv1 cipher=ECDHE-RSA-RC4-SHA bits=128/128);\r\n        Wed, 25 Jun 2014 05:44:58 -0700 (PDT)\r\nFrom: Felix Hammerl <mail@felixhammerl.com>\r\nContent-Type: multipart/alternative; boundary="Apple-Mail=_F62EFD38-9B1E-4FAC-A419-2C6F1F765727"\r\nSubject: asd\r\nMessage-Id: <C49155D8-E2F6-47F1-9176-B1FBB7E8AE6B@felixhammerl.com>\r\nDate: Wed, 25 Jun 2014 14:44:56 +0200\r\nTo: throwaway.felix@gmail.com\r\nMime-Version: 1.0 (Mac OS X Mail 7.3 1878.2)\r\nX-Mailer: Apple Mail (2.1878.2)\r\n\r\n\r\n--Apple-Mail=_F62EFD38-9B1E-4FAC-A419-2C6F1F765727\r\nContent-Transfer-Encoding: 7bit\r\nContent-Type: text/plain;\r\n    charset=us-ascii\r\n\r\nasd\r\n--Apple-Mail=_F62EFD38-9B1E-4FAC-A419-2C6F1F765727\r\nContent-Type: multipart/related;\r\n    type="text/html";\r\n    boundary="Apple-Mail=_0A59F0C0-A5CC-4402-B716-0D94B95BA062"\r\n\r\n\r\n--Apple-Mail=_0A59F0C0-A5CC-4402-B716-0D94B95BA062\r\nContent-Transfer-Encoding: 7bit\r\nContent-Type: text/html;\r\n    charset=us-ascii\r\n\r\n<html><head><meta http-equiv="Content-Type" content="text/html charset=us-ascii"></head><body style="word-wrap: break-word; -webkit-nbsp-mode: space; -webkit-line-break: after-white-space;">asd<img apple-inline="yes" id="53B73BDD-69A0-4E8E-BA7B-3D2EF399C0D3" height="1" width="1" apple-width="yes" apple-height="yes" src="cid:20154202-BB6F-49D7-A1BB-17E9937B42B5"></body></html>\r\n--Apple-Mail=_0A59F0C0-A5CC-4402-B716-0D94B95BA062\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: inline;\r\n    filename=image.jpg\r\nContent-Type: image/jpg;\r\n    x-unix-mode=0644;\r\n    name="image.jpg"\r\nContent-Id: <20154202-BB6F-49D7-A1BB-17E9937B42B5>\r\n\r\n/9j/4AAQSkZJRgABAQEASABIAAD/4gxYSUNDX1BST0ZJTEUAAQEAAAxITGlubwIQAABtbnRyUkdC\r\nIFhZWiAHzgACAAkABgAxAABhY3NwTVNGVAAAAABJRUMgc1JHQgAAAAAAAAAAAAAAAAAA9tYAAQAA\r\nAADTLUhQICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFj\r\ncHJ0AAABUAAAADNkZXNjAAABhAAAAGx3dHB0AAAB8AAAABRia3B0AAACBAAAABRyWFlaAAACGAAA\r\nABRnWFlaAAACLAAAABRiWFlaAAACQAAAABRkbW5kAAACVAAAAHBkbWRkAAACxAAAAIh2dWVkAAAD\r\nTAAAAIZ2aWV3AAAD1AAAACRsdW1pAAAD+AAAABRtZWFzAAAEDAAAACR0ZWNoAAAEMAAAAAxyVFJD\r\nAAAEPAAACAxnVFJDAAAEPAAACAxiVFJDAAAEPAAACAx0ZXh0AAAAAENvcHlyaWdodCAoYykgMTk5\r\nOCBIZXdsZXR0LVBhY2thcmQgQ29tcGFueQAAZGVzYwAAAAAAAAASc1JHQiBJRUM2MTk2Ni0yLjEA\r\nAAAAAAAAAAAAABJzUkdCIElFQzYxOTY2LTIuMQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\r\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAWFlaIAAAAAAAAPNRAAEAAAABFsxYWVogAAAAAAAAAAAAAAAA\r\nAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAA\r\nAA+EAAC2z2Rlc2MAAAAAAAAAFklFQyBodHRwOi8vd3d3LmllYy5jaAAAAAAAAAAAAAAAFklFQyBo\r\ndHRwOi8vd3d3LmllYy5jaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\r\nAAAAAABkZXNjAAAAAAAAAC5JRUMgNjE5NjYtMi4xIERlZmF1bHQgUkdCIGNvbG91ciBzcGFjZSAt\r\nIHNSR0IAAAAAAAAAAAAAAC5JRUMgNjE5NjYtMi4xIERlZmF1bHQgUkdCIGNvbG91ciBzcGFjZSAt\r\nIHNSR0IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZGVzYwAAAAAAAAAsUmVmZXJlbmNlIFZpZXdpbmcg\r\nQ29uZGl0aW9uIGluIElFQzYxOTY2LTIuMQAAAAAAAAAAAAAALFJlZmVyZW5jZSBWaWV3aW5nIENv\r\nbmRpdGlvbiBpbiBJRUM2MTk2Ni0yLjEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHZpZXcAAAAA\r\nABOk/gAUXy4AEM8UAAPtzAAEEwsAA1yeAAAAAVhZWiAAAAAAAEwJVgBQAAAAVx/nbWVhcwAAAAAA\r\nAAABAAAAAAAAAAAAAAAAAAAAAAAAAo8AAAACc2lnIAAAAABDUlQgY3VydgAAAAAAAAQAAAAABQAK\r\nAA8AFAAZAB4AIwAoAC0AMgA3ADsAQABFAEoATwBUAFkAXgBjAGgAbQByAHcAfACBAIYAiwCQAJUA\r\nmgCfAKQAqQCuALIAtwC8AMEAxgDLANAA1QDbAOAA5QDrAPAA9gD7AQEBBwENARMBGQEfASUBKwEy\r\nATgBPgFFAUwBUgFZAWABZwFuAXUBfAGDAYsBkgGaAaEBqQGxAbkBwQHJAdEB2QHhAekB8gH6AgMC\r\nDAIUAh0CJgIvAjgCQQJLAlQCXQJnAnECegKEAo4CmAKiAqwCtgLBAssC1QLgAusC9QMAAwsDFgMh\r\nAy0DOANDA08DWgNmA3IDfgOKA5YDogOuA7oDxwPTA+AD7AP5BAYEEwQgBC0EOwRIBFUEYwRxBH4E\r\njASaBKgEtgTEBNME4QTwBP4FDQUcBSsFOgVJBVgFZwV3BYYFlgWmBbUFxQXVBeUF9gYGBhYGJwY3\r\nBkgGWQZqBnsGjAadBq8GwAbRBuMG9QcHBxkHKwc9B08HYQd0B4YHmQesB78H0gflB/gICwgfCDII\r\nRghaCG4IggiWCKoIvgjSCOcI+wkQCSUJOglPCWQJeQmPCaQJugnPCeUJ+woRCicKPQpUCmoKgQqY\r\nCq4KxQrcCvMLCwsiCzkLUQtpC4ALmAuwC8gL4Qv5DBIMKgxDDFwMdQyODKcMwAzZDPMNDQ0mDUAN\r\nWg10DY4NqQ3DDd4N+A4TDi4OSQ5kDn8Omw62DtIO7g8JDyUPQQ9eD3oPlg+zD88P7BAJECYQQxBh\r\nEH4QmxC5ENcQ9RETETERTxFtEYwRqhHJEegSBxImEkUSZBKEEqMSwxLjEwMTIxNDE2MTgxOkE8UT\r\n5RQGFCcUSRRqFIsUrRTOFPAVEhU0FVYVeBWbFb0V4BYDFiYWSRZsFo8WshbWFvoXHRdBF2UXiReu\r\nF9IX9xgbGEAYZRiKGK8Y1Rj6GSAZRRlrGZEZtxndGgQaKhpRGncanhrFGuwbFBs7G2MbihuyG9oc\r\nAhwqHFIcexyjHMwc9R0eHUcdcB2ZHcMd7B4WHkAeah6UHr4e6R8THz4faR+UH78f6iAVIEEgbCCY\r\nIMQg8CEcIUghdSGhIc4h+yInIlUigiKvIt0jCiM4I2YjlCPCI/AkHyRNJHwkqyTaJQklOCVoJZcl\r\nxyX3JicmVyaHJrcm6CcYJ0kneierJ9woDSg/KHEooijUKQYpOClrKZ0p0CoCKjUqaCqbKs8rAis2\r\nK2krnSvRLAUsOSxuLKIs1y0MLUEtdi2rLeEuFi5MLoIuty7uLyQvWi+RL8cv/jA1MGwwpDDbMRIx\r\nSjGCMbox8jIqMmMymzLUMw0zRjN/M7gz8TQrNGU0njTYNRM1TTWHNcI1/TY3NnI2rjbpNyQ3YDec\r\nN9c4FDhQOIw4yDkFOUI5fzm8Ofk6Njp0OrI67zstO2s7qjvoPCc8ZTykPOM9Ij1hPaE94D4gPmA+\r\noD7gPyE/YT+iP+JAI0BkQKZA50EpQWpBrEHuQjBCckK1QvdDOkN9Q8BEA0RHRIpEzkUSRVVFmkXe\r\nRiJGZ0arRvBHNUd7R8BIBUhLSJFI10kdSWNJqUnwSjdKfUrESwxLU0uaS+JMKkxyTLpNAk1KTZNN\r\n3E4lTm5Ot08AT0lPk0/dUCdQcVC7UQZRUFGbUeZSMVJ8UsdTE1NfU6pT9lRCVI9U21UoVXVVwlYP\r\nVlxWqVb3V0RXklfgWC9YfVjLWRpZaVm4WgdaVlqmWvVbRVuVW+VcNVyGXNZdJ114XcleGl5sXr1f\r\nD19hX7NgBWBXYKpg/GFPYaJh9WJJYpxi8GNDY5dj62RAZJRk6WU9ZZJl52Y9ZpJm6Gc9Z5Nn6Wg/\r\naJZo7GlDaZpp8WpIap9q92tPa6dr/2xXbK9tCG1gbbluEm5rbsRvHm94b9FwK3CGcOBxOnGVcfBy\r\nS3KmcwFzXXO4dBR0cHTMdSh1hXXhdj52m3b4d1Z3s3gReG54zHkqeYl553pGeqV7BHtje8J8IXyB\r\nfOF9QX2hfgF+Yn7CfyN/hH/lgEeAqIEKgWuBzYIwgpKC9INXg7qEHYSAhOOFR4Wrhg6GcobXhzuH\r\nn4gEiGmIzokziZmJ/opkisqLMIuWi/yMY4zKjTGNmI3/jmaOzo82j56QBpBukNaRP5GokhGSepLj\r\nk02TtpQglIqU9JVflcmWNJaflwqXdZfgmEyYuJkkmZCZ/JpomtWbQpuvnByciZz3nWSd0p5Anq6f\r\nHZ+Ln/qgaaDYoUehtqImopajBqN2o+akVqTHpTilqaYapoum/adup+CoUqjEqTepqaocqo+rAqt1\r\nq+msXKzQrUStuK4trqGvFq+LsACwdbDqsWCx1rJLssKzOLOutCW0nLUTtYq2AbZ5tvC3aLfguFm4\r\n0blKucK6O7q1uy67p7whvJu9Fb2Pvgq+hL7/v3q/9cBwwOzBZ8Hjwl/C28NYw9TEUcTOxUvFyMZG\r\nxsPHQce/yD3IvMk6ybnKOMq3yzbLtsw1zLXNNc21zjbOts83z7jQOdC60TzRvtI/0sHTRNPG1EnU\r\ny9VO1dHWVdbY11zX4Nhk2OjZbNnx2nba+9uA3AXcit0Q3ZbeHN6i3ynfr+A24L3hROHM4lPi2+Nj\r\n4+vkc+T85YTmDeaW5x/nqegy6LzpRunQ6lvq5etw6/vshu0R7ZzuKO6070DvzPBY8OXxcvH/8ozz\r\nGfOn9DT0wvVQ9d72bfb794r4Gfio+Tj5x/pX+uf7d/wH/Jj9Kf26/kv+3P9t////4QCMRXhpZgAA\r\nTU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIA\r\nAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAA\r\nAAGgAwAEAAAAAQAAAAEAAAAA/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsL\r\nDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQU\r\nFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgAAQABAwEiAAIR\r\nAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAAB\r\nfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5\r\nOkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeo\r\nqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMB\r\nAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYS\r\nQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNU\r\nVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5\r\nusLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8AzKKKKyPQ\r\nP//Z\r\n\r\n--Apple-Mail=_0A59F0C0-A5CC-4402-B716-0D94B95BA062--\r\n\r\n--Apple-Mail=_F62EFD38-9B1E-4FAC-A419-2C6F1F765727--',
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
        }, {
            raw: 'Message-id: <foobar>\r\nSubject: moveme\r\n\r\nmoveme!',
            uid: 900
        }, {
            description: "Thunderbird (no attachment - PGP/INLINE): Signed w/ unsigned content spoofing attack",
            raw: "Message-ID: <53A87B12.9010706@gmail.com>\r\nDate: Mon, 23 Jun 2014 21:08:02 +0200\r\nFrom: Andris Testbox2 <safewithme.testuser@gmail.com>\r\nUser-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:24.0) Gecko/20100101 Thunderbird/24.2.0\r\nMIME-Version: 1.0\r\nTo: safewithme.testuser@gmail.com\r\nSubject: test6\r\nX-Enigmail-Version: 1.6\r\nContent-Type: text/plain; charset=ISO-8859-1\r\nContent-Transfer-Encoding: 7bit\r\n\r\n\r\n-----BEGIN PGP SIGNED MESSAGE-----\r\nHash: SHA512\r\n\r\ntest6\r\n-----BEGIN PGP SIGNATURE-----\r\nVersion: GnuPG v1.4.13 (Darwin)\r\nComment: GPGTools - https://gpgtools.org\r\nComment: Using GnuPG with Thunderbird - http://www.enigmail.net/\r\n\r\niQEcBAEBCgAGBQJTqHsSAAoJENf7k/zfv8I8wz4H/RWo1qJvvJtMl7GyqGGbaByX\r\n/D7/yWJzMdE0Y7J/tHIexQ/sZnmcDlHG0mtJKgI7EOh2EyV+r+78vF71Mlc+bg8g\r\n3B4TKyp0QU1Pb6SETG//FtKrU7SnkjKujHvRMpzcOcm0ZLBDpmftyWLvp9Dg3KOF\r\n5sMBGpJRn1pqX2DxXZtc1rYOmSAaxFI5jewPws0DCDkLDGp9gLyusNeDHkmAT4AG\r\nDqsDPQvW0R4Sy7aQFT7GjrdnCiLyikynkocUpR95fDnjHJ6Xbyj2Yj9/ofewPQ//\r\nMq39sIYbcqlDBAhsOlii3ekdzLS4xEOkvtFoD4pufyLj3pYY60FG4bPygcccYkI=\r\n=IkRV\r\n-----END PGP SIGNATURE-----\r\n\r\nTHIS IS UNSINGED CONTENT AND MUST NOT BE SHOWN\r\n\r\n-----BEGIN PGP SIGNATURE-----\r\n-----END PGP SIGNATURE-----\r\n",
            uid: 910
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

        //
        // Test server setup
        //

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

        //
        // Test client setup
        //

        // don't multithread, Function.prototype.bind() is broken in phantomjs in web workers
        window.Worker = undefined;
        navigator.online = true;

        sinon.stub(mailreader, 'startWorker', function() {});
        sinon.stub(openpgp, 'initWorker', function() {});

        // build and inject angular services
        angular.module('email-integration-test', ['woEmail']);
        angular.mock.module('email-integration-test');
        angular.mock.inject(function($injector) {
            accountService = $injector.get('account');
            initAccountService();
        });

        function initAccountService() {

            // create imap/smtp clients with stubbed tcp sockets
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
                console.error('IMAP error.', err);
                throw err;
            };

            smtpClient = new SmtpClient('localhost', 25, {
                auth: {
                    user: testAccount.user,
                    xoauth2: testAccount.xoauth2
                },
                secure: true
            });
            smtpClient._TCPSocket = smtpServer.createTCPSocket();

            // clear the local database before each test
            var cleanup = new DeviceStorageDAO(new LawnchairDAO());
            cleanup.init(testAccount.user).then(function() {
                cleanup.clear().then(onCleaned);
            });

            function onCleaned() {
                userStorage = accountService._accountStore;
                auth = accountService._auth;
                emailDao = accountService._emailDao;

                auth.setCredentials({
                    emailAddress: testAccount.user,
                    password: 'asd',
                    smtp: {}, // host and port don't matter here since we're using
                    imap: {} // a preconfigured smtpclient with mocked tcp sockets
                });

                // stub rest request to key server
                sinon.stub(emailDao._keychain._publicKeyDao, 'get').returns(resolves(mockKeyPair.publicKey));
                sinon.stub(emailDao._keychain._publicKeyDao, 'getByUserId').returns(resolves(mockKeyPair.publicKey));

                auth.init().then(function() {
                    accountService.init({
                        emailAddress: testAccount.user
                    }).then(function() {
                        // retrieve the pgpbuilder from the emaildao and initialize the pgpmailer with the existing pgpbuilder
                        pgpMailer = new PgpMailer({}, emailDao._pgpbuilder);

                        emailDao.unlock({
                            passphrase: testAccount.pass,
                            keypair: mockKeyPair
                        }).then(function() {
                            sinon.stub(accountService._emailDao, 'isOnline').returns(true);
                            return accountService._emailDao.onConnect(imapClient);
                        }).then(function() {
                            inbox = emailDao._account.folders.filter(function(folder) {
                                return folder.path === 'INBOX';
                            }).pop();
                            spam = emailDao._account.folders.filter(function(folder) {
                                return folder.path === '[Gmail]/Spam';
                            }).pop();
                            expect(inbox).to.exist;
                            expect(spam).to.exist;

                            // phantomjs is really slow, so setting the tcp socket timeouts to 200s will effectively disarm the timeout
                            imapClient._client.client.TIMEOUT_SOCKET_LOWER_BOUND = 999999999;
                            imapClient._listeningClient.client.TIMEOUT_SOCKET_LOWER_BOUND = 999999999;
                            smtpClient.TIMEOUT_SOCKET_LOWER_BOUND = 999999999;

                            done();
                        });
                    });
                });
            }
        }
    });

    afterEach(function(done) {
        openpgp.initWorker.restore();
        mailreader.startWorker.restore();

        imapClient.stopListeningForChanges().then(function() {
            return imapClient.logout();
        }).then(function() {
            return userStorage.clear();
        }).then(done);
    });

    describe('IMAP Integration Tests', function() {
        beforeEach(function(done) {
            setTimeout(function() {
                inbox.messages.sort(function(a, b) {
                    return a.uid - b.uid;
                });

                emailDao.getBody({
                    folder: inbox,
                    messages: inbox.messages
                }).then(function(messages) {
                    expect(messages.length).to.equal(imapMessages.length);
                }).then(done);
            }, 200);
        });

        describe('basic functionality', function() {
            it('should receive new messages', function(done) {
                emailDao.onIncomingMessage = function(messages) {
                    expect(messages.length).to.equal(1);
                    expect(messages[0].answered).to.be.true;
                    expect(messages[0].flagged).to.be.true;
                    expect(messages[0].unread).to.be.false;
                    done();
                };

                imapServer.appendMessage('INBOX', ['\\Flagged', '\\Seen', '\\Answered'], false, 'Message-id: <n1>\r\nSubject: new message\r\n\r\nhello world!');
            });

            it('should delete a message', function(done) {
                emailDao.deleteMessage({
                    folder: inbox,
                    message: inbox.messages[0]
                }).then(function() {
                    emailDao.openFolder({
                        folder: {
                            path: '[Gmail]/Trash'
                        }
                    }).then(function(folder) {
                        expect(folder.exists).to.equal(1);
                        done();
                    });
                });
            });

            it('should move a message', function(done) {
                emailDao.moveMessage({
                    folder: inbox,
                    destination: spam,
                    message: inbox.messages[0]
                }).then(function() {
                    emailDao.openFolder({
                        folder: {
                            path: '[Gmail]/Spam'
                        }
                    }).then(function(folder) {
                        expect(folder.exists).to.equal(1);
                        done();
                    });
                });
            });

            it('should get body', function() {
                expect(inbox.messages[2].body).to.equal('World 5!');
            });

            it('should insert images into html mail', function() {
                expect(inbox.messages[3].html).to.equal('<html><head><meta http-equiv="Content-Type" content="text/html charset=us-ascii"></head><body style="word-wrap: break-word; -webkit-nbsp-mode: space; -webkit-line-break: after-white-space;">asd<img apple-inline="yes" id="53B73BDD-69A0-4E8E-BA7B-3D2EF399C0D3" height="1" width="1" apple-width="yes" apple-height="yes" src="data:application/octet-stream;base64,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"></body></html>');
            });

            it('should set flags', function(done) {
                var message = inbox.messages[3];
                message.unread = false;
                message.answered = true;
                message.flagged = true;

                emailDao.setFlags({
                    folder: inbox,
                    message: message
                }).then(function() {
                    done();
                });
            });
        });

        describe('Real-world data mail parsing', function() {
            it('should parse Apple Mail (attachment - PGP/MIME): Encrypted', function(done) {
                emailDao.decryptBody({
                    message: inbox.messages[4],
                    folder: inbox
                }).then(function(message) {
                    expect(message.encrypted).to.be.true;
                    expect(message.signed).to.be.false;
                    expect(message.signaturesValid).to.be.undefined;
                    expect(message.attachments.length).to.equal(1);
                    expect(message.body).to.equal('test16');
                    done();
                });
            });

            it('should parse Apple Mail (attachment - PGP/MIME): Encrypted and signed', function(done) {
                emailDao.decryptBody({
                    message: inbox.messages[5],
                    folder: inbox
                }).then(function(message) {
                    expect(message.encrypted).to.be.true;
                    expect(message.signed).to.be.true;
                    expect(message.signaturesValid).to.be.true;
                    expect(message.attachments.length).to.equal(1);
                    expect(message.body).to.equal('test15');
                    done();
                });
            });

            it('should parse Apple Mail (no attachment): Encrypted and signed', function(done) {
                emailDao.decryptBody({
                    message: inbox.messages[6],
                    folder: inbox
                }).then(function(message) {
                    expect(message.encrypted).to.be.true;
                    expect(message.signed).to.be.true;
                    expect(message.signaturesValid).to.be.true;
                    expect(message.attachments.length).to.equal(0);
                    expect(message.body).to.equal('test12');
                    done();
                });
            });

            it('should parse Apple Mail (no attachment): Encrypted', function(done) {
                emailDao.decryptBody({
                    message: inbox.messages[7],
                    folder: inbox
                }).then(function(message) {
                    expect(message.encrypted).to.be.true;
                    expect(message.signed).to.be.false;
                    expect(message.signaturesValid).to.be.undefined;
                    expect(message.attachments.length).to.equal(0);
                    expect(message.body).to.equal('test13');
                    done();
                });
            });

            it('should parse Apple Mail (attachment - PGP/MIME): Signed', function() {
                expect(inbox.messages[8].encrypted).to.be.false;
                expect(inbox.messages[8].signed).to.be.true;
                expect(inbox.messages[8].signaturesValid).to.be.true;
                expect(inbox.messages[8].attachments.length).to.equal(1);
                expect(inbox.messages[8].body).to.equal('test17\n');
            });

            it('should parse Apple Mail (no attachment): Signed', function() {
                expect(inbox.messages[9].encrypted).to.be.false;
                expect(inbox.messages[9].signed).to.be.true;
                expect(inbox.messages[9].signaturesValid).to.be.true;
                expect(inbox.messages[9].attachments.length).to.equal(0);
                expect(inbox.messages[9].body).to.equal('test14');
            });

            it('should parse Thunderbird (attachment - PGP/MIME): Encrypted', function(done) {
                emailDao.decryptBody({
                    message: inbox.messages[10],
                    folder: inbox
                }).then(function(message) {
                    expect(message.encrypted).to.be.true;
                    expect(message.signed).to.be.false;
                    expect(message.signaturesValid).to.be.undefined;
                    expect(message.attachments.length).to.equal(1);
                    expect(message.body).to.equal('test10');
                    done();
                });
            });

            it('should parse Thunderbird (attachment - PGP/MIME): Encrypted and signed', function(done) {
                emailDao.decryptBody({
                    message: inbox.messages[11],
                    folder: inbox
                }).then(function(message) {
                    expect(message.encrypted).to.be.true;
                    expect(message.signed).to.be.true;
                    expect(message.signaturesValid).to.be.true;
                    expect(message.attachments.length).to.equal(1);
                    expect(message.body).to.equal('test9');
                    done();
                });
            });

            it('should parse Thunderbird (no attachment): Encrypted and signed', function(done) {
                emailDao.decryptBody({
                    message: inbox.messages[12],
                    folder: inbox
                }).then(function(message) {
                    expect(message.encrypted).to.be.true;
                    expect(message.signed).to.be.true;
                    expect(message.signaturesValid).to.be.true;
                    expect(message.attachments.length).to.equal(0);
                    expect(message.body).to.equal('test4\n');
                    done();
                });
            });

            it('should parse Thunderbird (no attachment): Encrypted', function(done) {
                emailDao.decryptBody({
                    message: inbox.messages[13],
                    folder: inbox
                }).then(function(message) {
                    expect(message.encrypted).to.be.true;
                    expect(message.signed).to.be.false;
                    expect(message.signaturesValid).to.be.undefined;
                    expect(message.attachments.length).to.equal(0);
                    expect(message.body).to.equal('test5\n');
                    done();
                });
            });

            it('should parse Thunderbird (no attachment): plaintext reply to an encrypted message', function(done) {
                emailDao.decryptBody({
                    message: inbox.messages[14],
                    folder: inbox
                }).then(function(message) {
                    expect(message.encrypted).to.be.false;
                    expect(message.signed).to.be.false;
                    expect(message.signaturesValid).to.be.undefined;
                    expect(message.attachments.length).to.equal(0);
                    expect(message.body).to.equal('test8\n\n23.06.14 21:12, safewithme kirjutas:\n> test8');
                    done();
                });
            });

            it('should parse Thunderbird (attachment - PGP/MIME): Signed', function() {
                expect(inbox.messages[15].encrypted).to.be.false;
                expect(inbox.messages[15].signed).to.be.true;
                expect(inbox.messages[15].signaturesValid).to.be.true;
                expect(inbox.messages[15].attachments.length).to.equal(1);
                expect(inbox.messages[15].body).to.equal('test11');
            });

            it('should parse Thunderbird (no attachment): Signed w/ PGP/INLINE', function() {
                expect(inbox.messages[16].encrypted).to.be.false;
                expect(inbox.messages[16].signed).to.be.true;
                expect(inbox.messages[16].signaturesValid).to.be.true;
                expect(inbox.messages[16].attachments.length).to.equal(0);
                expect(inbox.messages[16].body).to.equal('test6');
            });

            it('should parse Mailvelope: encrypted (unsigned) w/PGP/INLINE', function(done) {
                emailDao.decryptBody({
                    message: inbox.messages[17],
                    folder: inbox
                }).then(function(message) {
                    expect(message.encrypted).to.be.true;
                    expect(message.signed).to.be.false;
                    expect(message.signaturesValid).to.be.undefined;
                    expect(message.attachments.length).to.equal(0);
                    expect(message.body).to.equal('this is a test');
                    done();
                });
            });

            it('should parse Thunderbird (no attachment): Signed w/ PGP/INLINE including unsigned content spoofing attack', function() {
                expect(inbox.messages[19].encrypted).to.be.false;
                expect(inbox.messages[19].signed).to.be.true;
                expect(inbox.messages[19].signaturesValid).to.be.true;
                expect(inbox.messages[19].attachments.length).to.equal(0);
                expect(inbox.messages[19].body).to.equal('test6');
            });
        });
    });

    describe('SMTP Tests', function() {
        afterEach(function() {
            smtpServer.onmail.restore();
        });

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
            }, pgpMailer).then(function() {
                expect(smtpServer.onmail.callCount).to.equal(1);
                done();
            });
        });

        it('should send an encrypted message', function(done) {
            sinon.stub(smtpServer, 'onmail', function(mail) {
                expect(mail.from).to.equal(testAccount.user);
                expect(mail.to).to.deep.equal([testAccount.user]);

                expect(/^Content-Type: multipart\/mixed/.test(mail.body)).to.be.false;
                expect(/^Content-Type: multipart\/encrypted/.test(mail.body)).to.be.true;
                expect(mail.body).to.contain('-----BEGIN PGP MESSAGE-----');
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
            }, pgpMailer).then(function() {
                expect(smtpServer.onmail.callCount).to.equal(1);
                done();
            });
        });
    });

    describe('Compose-Send-Receive-Read round trip', function() {
        beforeEach(function() {
            sinon.stub(smtpServer, 'onmail', function(mail) {
                setTimeout(function() {
                    imapServer.appendMessage(inbox.path, [], false, mail.body);
                }, 1000);
            });
        });

        afterEach(function() {
            smtpServer.onmail.restore();
        });

        it('should send & receive a signed plaintext message', function(done) {
            var expectedBody = "asdasdasdasdasdasdasdasdasdasdasdasd asdasdasdasdasdasdasdasdasdasdasdasd";

            emailDao.onIncomingMessage = function(messages) {
                expect(messages[0].encrypted).to.be.false;
                expect(messages[0].signed).to.be.true;
                expect(messages[0].signaturesValid).to.be.true;
                expect(messages[0].attachments.length).to.equal(0);
                expect(messages[0].body).to.equal(expectedBody + str.signature + config.keyServerUrl + '/' + testAccount.user);
                done();
            };

            emailDao.sendPlaintext({
                smtpclient: smtpClient,
                email: {
                    from: [testAccount.user],
                    to: [testAccount.user],
                    subject: 'plaintext test',
                    body: expectedBody
                }
            }, pgpMailer).then(function() {});
        });

        it('should send & receive a signed encrypted message', function(done) {
            var expectedBody = "asdasdasdasdasdasdasdasdasdasdasdasd asdasdasdasdasdasdasdasdasdasdasdasd";

            emailDao.onIncomingMessage = function(messages) {
                return emailDao.decryptBody({
                    message: messages[0]
                }).then(function(message) {
                    expect(message.encrypted).to.be.true;
                    expect(message.signed).to.be.true;
                    expect(message.signaturesValid).to.be.true;
                    expect(message.attachments.length).to.equal(0);
                    expect(message.body).to.equal(expectedBody);
                    done();
                });
            };

            emailDao.sendEncrypted({
                smtpclient: smtpClient,

                email: {
                    from: [testAccount.user],
                    to: [testAccount.user],
                    subject: 'plaintext test',
                    body: expectedBody,
                    publicKeysArmored: [mockKeyPair.publicKey.publicKey]
                }
            }, pgpMailer).then(function() {});
        });
    });
});