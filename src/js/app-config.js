define(function(require) {
    'use strict';

    var _ = require('underscore'),
        app = {},
        appVersion, cloudUrl, keychainUrl, clientId;

    // parse manifest to get configurations for current runtime
    try {
        var manifest = chrome.runtime.getManifest();
        // get key server base url
        cloudUrl = _.find(manifest.permissions, function(permission) {
            return typeof permission === 'string' && permission.indexOf('https://keys') === 0;
        });
        // remove last '/' from url due to required syntax in manifest
        cloudUrl = cloudUrl.substring(0, cloudUrl.length - 1);
        // get keychain server base url
        keychainUrl = _.find(manifest.permissions, function(permission) {
            return typeof permission === 'string' && permission.indexOf('https://keychain') === 0;
        });
        // remove last '/' from url due to required syntax in manifest
        keychainUrl = keychainUrl.substring(0, keychainUrl.length - 1);
        // get client ID for OAuth requests
        clientId = manifest.oauth2.client_id;
        // get the app version
        appVersion = manifest.version;
    } catch (e) {}

    /**
     * Global app configurations
     */
    app.config = {
        cloudUrl: cloudUrl || 'https://keys.whiteout.io',
        privkeyServerUrl: keychainUrl || 'https://keychain.whiteout.io',
        serverPrivateKeyId: 'EE342F0DDBB0F3BE',
        symKeySize: 256,
        symIvSize: 96,
        asymKeySize: 2048,
        workerPath: 'js',
        reconnectInterval: 10000,
        gmail: {
            clientId: clientId || '440907777130.apps.googleusercontent.com',
            imap: {
                host: 'imap.gmail.com',
                port: 993,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIEdjCCA16gAwIBAgIIOCAMKXEOvgcwDQYJKoZIhvcNAQEFBQAwSTELMAkGA1UE\r\nBhMCVVMxEzARBgNVBAoTCkdvb2dsZSBJbmMxJTAjBgNVBAMTHEdvb2dsZSBJbnRl\r\ncm5ldCBBdXRob3JpdHkgRzIwHhcNMTQwNzAyMTMxMTUwWhcNMTQwOTMwMDAwMDAw\r\nWjBoMQswCQYDVQQGEwJVUzETMBEGA1UECAwKQ2FsaWZvcm5pYTEWMBQGA1UEBwwN\r\nTW91bnRhaW4gVmlldzETMBEGA1UECgwKR29vZ2xlIEluYzEXMBUGA1UEAwwOaW1h\r\ncC5nbWFpbC5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCQdG3a\r\nCqhUvm2qrrzjONFWWGNyuqO60DfuvMfoysUmfMuenZskA9GADbZzFFhpXaj9CgIR\r\nNyXxMb1JiQ2h/0t3t94OvEBDcfZvG2aSYDWnsXClVzwMXO0PN6Sy1B/dsMv2v+DZ\r\n5mnkCV8vGiJzimHv2lI+fpAoDrDZkpEZ5KMNbck7FWAVTOogdvQhlRYLijjDXFRS\r\nudbr1HDZIA3n24EbEiXTxkhrovKB3kvyYwkSPOeAD36Ct5B0DebEqnXiwnoYe5Cv\r\nz+twRdb1vnKFfeF5aJEvED1MidD7wkmZuVQoakCv4bJt+Prk+LTwFoUGBPio+3zs\r\nEdIxUbhuXPPevnODAgMBAAGjggFBMIIBPTAdBgNVHSUEFjAUBggrBgEFBQcDAQYI\r\nKwYBBQUHAwIwGQYDVR0RBBIwEIIOaW1hcC5nbWFpbC5jb20waAYIKwYBBQUHAQEE\r\nXDBaMCsGCCsGAQUFBzAChh9odHRwOi8vcGtpLmdvb2dsZS5jb20vR0lBRzIuY3J0\r\nMCsGCCsGAQUFBzABhh9odHRwOi8vY2xpZW50czEuZ29vZ2xlLmNvbS9vY3NwMB0G\r\nA1UdDgQWBBRGBrwFZ4atafE46eC+bikqv+yFkjAMBgNVHRMBAf8EAjAAMB8GA1Ud\r\nIwQYMBaAFErdBhYbvPZotXb1gba7Yhq6WoEvMBcGA1UdIAQQMA4wDAYKKwYBBAHW\r\neQIFATAwBgNVHR8EKTAnMCWgI6Ahhh9odHRwOi8vcGtpLmdvb2dsZS5jb20vR0lB\r\nRzIuY3JsMA0GCSqGSIb3DQEBBQUAA4IBAQAM+EmMM+dBjufjzV/4gK56ppI/BuBy\r\n7NT/AjTu+eNt/WRKouAqdtt9+jd3WRAskH1g/UEtfuh9lJhdJo7mJuWjeyHWQvLb\r\ndRzrp43FnADabNxJUFstddnqJoiGnKk90elLx8WJ5JQtP023oZpysunGUnhZNlpA\r\nqcqJW9TrwwTo3s1VQbuTsybglDG8eiNhgp+tBcDfcGUSY/HMXjerehr0nqP0cg5m\r\n1zGMsh5QEJ96MfOiRnP6urpzEYDQTMi2fahJpmqcyytfiazQexIC43fk+8rtgKWr\r\nO4BejBviN1FmTYn/H9qgDeAuxn94ldY5/5DuX1sgcvSZCmgKjOd/EpKv\r\n-----END CERTIFICATE-----',
                pinned: true
            },
            smtp: {
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIEdjCCA16gAwIBAgIIOuQOXm7sFPMwDQYJKoZIhvcNAQEFBQAwSTELMAkGA1UE\r\nBhMCVVMxEzARBgNVBAoTCkdvb2dsZSBJbmMxJTAjBgNVBAMTHEdvb2dsZSBJbnRl\r\ncm5ldCBBdXRob3JpdHkgRzIwHhcNMTMwOTEwMDc1NDQ3WhcNMTQwOTEwMDc1NDQ3\r\nWjBoMQswCQYDVQQGEwJVUzETMBEGA1UECAwKQ2FsaWZvcm5pYTEWMBQGA1UEBwwN\r\nTW91bnRhaW4gVmlldzETMBEGA1UECgwKR29vZ2xlIEluYzEXMBUGA1UEAwwOc210\r\ncC5nbWFpbC5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCpMKDa\r\nE9bW18yuVMulny5K5YLwf7ebEpINUVPZXvp7cO6vNjl+MCHjhbB2Rkg7QVJE8eNS\r\nV0Hpq3vOuz+RQ2rPKfaeM3MFBZJ+tKscC39XmlVtmyBW5AVWy5dlO7718MQCN/L5\r\nkpYSY6RinFrf5pIlf5XSGRCo3WYndguPP1A+X4gsDKjMaWhCP5KfczLHGTY+4T+d\r\n31lDSah8CbFeMvKav0SFnyRYM36YAvAk2HH1/64Tolbx9tMAW6e6q8dU1U6W5u6+\r\nBt7WjW1iYwwfML+ZorKR9p+V070nDDN42ZE8HVZw+hOl9eMl48L/eX0eKbSGZBC2\r\n1IK16eISmcFKML1bAgMBAAGjggFBMIIBPTAdBgNVHSUEFjAUBggrBgEFBQcDAQYI\r\nKwYBBQUHAwIwGQYDVR0RBBIwEIIOc210cC5nbWFpbC5jb20waAYIKwYBBQUHAQEE\r\nXDBaMCsGCCsGAQUFBzAChh9odHRwOi8vcGtpLmdvb2dsZS5jb20vR0lBRzIuY3J0\r\nMCsGCCsGAQUFBzABhh9odHRwOi8vY2xpZW50czEuZ29vZ2xlLmNvbS9vY3NwMB0G\r\nA1UdDgQWBBQEQ01ljbiIzNcZdvg6hhkpxvAmujAMBgNVHRMBAf8EAjAAMB8GA1Ud\r\nIwQYMBaAFErdBhYbvPZotXb1gba7Yhq6WoEvMBcGA1UdIAQQMA4wDAYKKwYBBAHW\r\neQIFATAwBgNVHR8EKTAnMCWgI6Ahhh9odHRwOi8vcGtpLmdvb2dsZS5jb20vR0lB\r\nRzIuY3JsMA0GCSqGSIb3DQEBBQUAA4IBAQAA3n1AtYa8ES0KDhRGEsXsWQEQp3m8\r\nX3gXB6Rfg1mDRFqap67XYZTgYtGdeUOkbmXvfUYbljyTeSIdTN6iD/tzzaiJUzPl\r\nSwCT/ylI2kSo/0Km34rA5/D84Ja/1SSdCzxx4HFU0FlOERNg7RxSsW6F+f/QmTmZ\r\nJ/3lYLI71meuut7O7G+BcFlXVphs5XSy65LkziTXikR+MRERjCKhv3AwP0oGB2+q\r\nAPMUqxtH6K6hmFE5ELtYjS4rKLbH08s8gy65y/EiaBaWKBlKG6s+r22uyxu2xmgo\r\nLFf94N1gVJXuaZXlCgVwThCtbekh8wxjHtcVw2HCZfzQemEr7oshVOX2\r\n-----END CERTIFICATE-----',
                pinned: true
            },
            ignoreUploadOnSent: true
        },
        yahoo: {
            imap: {
                host: 'imap.mail.yahoo.com',
                port: 993,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIFUjCCBDqgAwIBAgIQdThnkckQvgouzHOsQA7ctTANBgkqhkiG9w0BAQUFADCB\r\ntTELMAkGA1UEBhMCVVMxFzAVBgNVBAoTDlZlcmlTaWduLCBJbmMuMR8wHQYDVQQL\r\nExZWZXJpU2lnbiBUcnVzdCBOZXR3b3JrMTswOQYDVQQLEzJUZXJtcyBvZiB1c2Ug\r\nYXQgaHR0cHM6Ly93d3cudmVyaXNpZ24uY29tL3JwYSAoYykxMDEvMC0GA1UEAxMm\r\nVmVyaVNpZ24gQ2xhc3MgMyBTZWN1cmUgU2VydmVyIENBIC0gRzMwHhcNMTQwNDIy\r\nMDAwMDAwWhcNMTUwNDIzMjM1OTU5WjCBjDELMAkGA1UEBhMCVVMxEzARBgNVBAgT\r\nCkNhbGlmb3JuaWExEjAQBgNVBAcUCVN1bm55dmFsZTETMBEGA1UEChQKWWFob28g\r\nSW5jLjEfMB0GA1UECxQWSW5mb3JtYXRpb24gVGVjaG5vbG9neTEeMBwGA1UEAxQV\r\nKi5pbWFwLm1haWwueWFob28uY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB\r\nCgKCAQEAw36HN2sgtMNQ0TZlqGgfqInK/UT6y3ZgqDdmFRU9D5D5675hfxcwJoS+\r\nb0hIn/UixbZDpSLhNkjAkOTAbFEFWar7628D2dU5WtCUlFMiwg2TA0Un8B9EbUi5\r\nwDrqzXDyABVnBVR5I2eKwr5cuB9ldjxAabcCyqQhVKdH0+IskRpUrvxAb84uQtJg\r\nJyNieOZAWdxg9fkubk1YKw/MgJHnaY8P4lUlYY8fIY39d6gW6My8oT0IersrH1X1\r\n/oCmqUIGM1PawXBvvpPKYdI4fCH75/UaEQ41BFSUn1NsinFYZUPlVcBCOvLFEOQi\r\nuU+4Tjybq3x7NNhd3uBxfm4jo4h5zQIDAQABo4IBgzCCAX8wNQYDVR0RBC4wLIIV\r\nKi5pbWFwLm1haWwueWFob28uY29tghNpbWFwLm1haWwueWFob28uY29tMAkGA1Ud\r\nEwQCMAAwDgYDVR0PAQH/BAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMBBggrBgEF\r\nBQcDAjBlBgNVHSAEXjBcMFoGCmCGSAGG+EUBBzYwTDAjBggrBgEFBQcCARYXaHR0\r\ncHM6Ly9kLnN5bWNiLmNvbS9jcHMwJQYIKwYBBQUHAgIwGRoXaHR0cHM6Ly9kLnN5\r\nbWNiLmNvbS9ycGEwHwYDVR0jBBgwFoAUDURcFlNEwYJ+HSCrJfQBY9i+eaUwKwYD\r\nVR0fBCQwIjAgoB6gHIYaaHR0cDovL3NkLnN5bWNiLmNvbS9zZC5jcmwwVwYIKwYB\r\nBQUHAQEESzBJMB8GCCsGAQUFBzABhhNodHRwOi8vc2Quc3ltY2QuY29tMCYGCCsG\r\nAQUFBzAChhpodHRwOi8vc2Quc3ltY2IuY29tL3NkLmNydDANBgkqhkiG9w0BAQUF\r\nAAOCAQEAVxsglXJTtBTCoTwOd6j0iJQ+P9cxFVqHcmbshEfEQBlPwr4Sp9tLJ4kj\r\nfVi0XorWU6e6e57dtYtxpcPz+6WNSNKT0B0IBOTUTIBwSLJMHxEZI6gSS/fo1agt\r\n81B06rB8Rhn4yHwyDO/9uRvXbNYiEgpa5e6gIpXY6h6p1HscQMcuROaUA9ETvGd8\r\nDKG4XSZE7QAF9iB9WSLa/IQUD4sGMDaMp2q4XkoWZTnyL1bEDKwUvw9Z17PxVmrF\r\n8c7S5HTNU+1kyZw2LJRu3SgtsYXSWA88WFiKUPuqU+EBXmbrwLAwLAJ6mVc2bGFC\r\ng5fLGbtTscaARBlb1u3Iee2Fd419jg==\r\n-----END CERTIFICATE-----',
                pinned: true
            },
            smtp: {
                host: 'smtp.mail.yahoo.com',
                port: 465,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIHITCCBgmgAwIBAgIQBlVSvxlwsqw8Kc8eVV5EKTANBgkqhkiG9w0BAQUFADBm\r\nMQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3\r\nd3cuZGlnaWNlcnQuY29tMSUwIwYDVQQDExxEaWdpQ2VydCBIaWdoIEFzc3VyYW5j\r\nZSBDQS0zMB4XDTE0MDYwNTAwMDAwMFoXDTE1MDYyMzEyMDAwMFowYjELMAkGA1UE\r\nBhMCVVMxCzAJBgNVBAgTAkNBMRIwEAYDVQQHEwlTdW5ueXZhbGUxFDASBgNVBAoM\r\nC1lhaG9vISBJbmMuMRwwGgYDVQQDExNzbXRwLm1haWwueWFob28uY29tMIIBIjAN\r\nBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA339OSxTIuW6NVqKwYHFBbg4/tmEx\r\nMYpzohtObPaWgvLTsYdce+WlQFBU5rxaCMUtVsVAGJWs5uQRDVHXRLPnOWe+foqZ\r\n5ItgjYIQc1XeMv6BZEeaF3Bum5ehUyLB3y48cjbWxma1QlkZ8XAK0f9AS7ySWAen\r\no5OXJlMFAqXGtKMAhY46dzSY0wjgdrvgiomFRy0iQKV1DxGsXoXSMEszlUTQoNQ3\r\nWTsiA3O//cdWE06wWeA3/90cb7QkU3KflSoyfi878BQGpPR1L+rLNsqnc8QuucbD\r\nz4Q++rxGqgg4QYrOtmZfAn96TXhPWCwKld6FN+f3uV5ITOBFx44M5v1ILQIDAQAB\r\no4IDzTCCA8kwHwYDVR0jBBgwFoAUUOpzidsp+xCPnuUBINTeeZlIg/cwHQYDVR0O\r\nBBYEFEhOpSFQjO/QrSNfVwyInZUhyzhsMIICJAYDVR0RBIICGzCCAheCE3NtdHAu\r\nbWFpbC55YWhvby5jb22CFnNtdHAubWFpbC55YWhvby5jb20uYXKCFnNtdHAubWFp\r\nbC55YWhvby5jb20uYXWCFnNtdHAubWFpbC55YWhvby5jb20uYnKCFnNtdHAubWFp\r\nbC55YWhvby5jb20uY26CFnNtdHAubWFpbC55YWhvby5jb20uaGuCFnNtdHAubWFp\r\nbC55YWhvby5jb20ubXmCFnNtdHAubWFpbC55YWhvby5jb20ucGiCFnNtdHAubWFp\r\nbC55YWhvby5jb20uc2eCFnNtdHAubWFpbC55YWhvby5jb20udHeCFnNtdHAubWFp\r\nbC55YWhvby5jb20udm6CFXNtdHAubWFpbC55YWhvby5jby5pZIIVc210cC5tYWls\r\nLnlhaG9vLmNvLmlughVzbXRwLm1haWwueWFob28uY28ua3KCFXNtdHAubWFpbC55\r\nYWhvby5jby50aIIVc210cC5tYWlsLnlhaG9vLmNvLnVrghJzbXRwLm1haWwueWFo\r\nb28uY2GCEnNtdHAubWFpbC55YWhvby5jboISc210cC5tYWlsLnlhaG9vLmRlghJz\r\nbXRwLm1haWwueWFob28uZXOCEnNtdHAubWFpbC55YWhvby5mcoISc210cC5tYWls\r\nLnlhaG9vLml0gg9zbXRwLnk3bWFpbC5jb22CFHNtdHAuY29ycmVvLnlhaG9vLmVz\r\nMA4GA1UdDwEB/wQEAwIFoDAdBgNVHSUEFjAUBggrBgEFBQcDAQYIKwYBBQUHAwIw\r\nYQYDVR0fBFowWDAqoCigJoYkaHR0cDovL2NybDMuZGlnaWNlcnQuY29tL2NhMy1n\r\nMjguY3JsMCqgKKAmhiRodHRwOi8vY3JsNC5kaWdpY2VydC5jb20vY2EzLWcyOC5j\r\ncmwwQgYDVR0gBDswOTA3BglghkgBhv1sAQEwKjAoBggrBgEFBQcCARYcaHR0cHM6\r\nLy93d3cuZGlnaWNlcnQuY29tL0NQUzB7BggrBgEFBQcBAQRvMG0wJAYIKwYBBQUH\r\nMAGGGGh0dHA6Ly9vY3NwLmRpZ2ljZXJ0LmNvbTBFBggrBgEFBQcwAoY5aHR0cDov\r\nL2NhY2VydHMuZGlnaWNlcnQuY29tL0RpZ2lDZXJ0SGlnaEFzc3VyYW5jZUNBLTMu\r\nY3J0MAwGA1UdEwEB/wQCMAAwDQYJKoZIhvcNAQEFBQADggEBABshjUND4hADHGfe\r\ncV9XGXcr9h3u7mT5kgdcgGFhcrFAlwkzt0NUCbuN0X8DWHE72Tpb3zRE25CmUUJe\r\nktBbq9PQb4b5/Wt1htAEw0qUs3BsUbqejK9OHJ/11Jn2ek4+SLJuYlijzc7KM3F/\r\nyz7ZTZtKR0PglkXfqbpvWYGabYpfL2FRLoJ7alTLsMJcFxbSLYcAIMxufj7RyTBJ\r\nbKgRJl4wmP4+Zc2Q1p59mENY0u5HqVAAOmWc0jNb0/31+tRr5f6EgXxK++7TQOpF\r\n0TOaFsXlzRlpKfmIbzVr2nfwghV5/bRZj96TK3g1OoOz4C8ksK4INHnUdTAqZ18M\r\nvHpnJw4=\r\n-----END CERTIFICATE-----',
                pinned: true
            }
        },
        tonline: {
            imap: {
                host: 'secureimap.t-online.de',
                port: 993,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIHnjCCBoagAwIBAgIJAJ9peA0rvlFEMA0GCSqGSIb3DQEBBQUAMIHJMQswCQYD\r\nVQQGEwJERTElMCMGA1UEChMcVC1TeXN0ZW1zIEludGVybmF0aW9uYWwgR21iSDEf\r\nMB0GA1UECxMWVC1TeXN0ZW1zIFRydXN0IENlbnRlcjEMMAoGA1UECBMDTlJXMQ4w\r\nDAYDVQQREwU1NzI1MDEQMA4GA1UEBxMHTmV0cGhlbjEgMB4GA1UECRMXVW50ZXJl\r\nIEluZHVzdHJpZXN0ci4gMjAxIDAeBgNVBAMTF1RlbGVTZWMgU2VydmVyUGFzcyBE\r\nRS0xMB4XDTE0MDQxNzEyMDUzNFoXDTE2MDQyMjIzNTk1OVowga4xCzAJBgNVBAYT\r\nAkRFMRwwGgYDVQQKExNEZXV0c2NoZSBUZWxla29tIEFHMRMwEQYDVQQLDApQJkkg\r\nQU0vRENTMQ8wDQYDVQQIEwZIZXNzZW4xEjAQBgNVBAcTCURhcm1zdGFkdDEmMCQG\r\nCSqGSIb3DQEJARYXY2VydGFkbWluX3BpQHRlbGVrb20uZGUxHzAdBgNVBAMTFnNl\r\nY3VyZWltYXAudC1vbmxpbmUuZGUwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK\r\nAoIBAQDcJrmKStOpx5r0uzT+FkSY951qgeBi5hwo+XOir1TOTAjFSDvWPcgLwNRV\r\nDWlg/iCy8KkVJY3jUz6a/JOf4ovBOubKOyeH/UH5GYOQPy6ph9xCEF9f2QYT4uYT\r\nu5OYpfSBALNQxa37E3KYHq4n8GNTtQD+XQ7bO34Re5njCB4mAIEpxaEMTzRr79q0\r\n4G5LCzWXdDuobaojm1uFnPmei9tJBEVF3Bb5sGj+3n7GhsaEAHMyIlP4M0oiAEL0\r\n0FjqmQLoZwDv9J2+PoKg4wwuHjeXDF5zdd1btM0DK0F0fyxarxOfBA/e62lUvvrp\r\nUT+Lg4rHSfVWTgcTz6Fn2jHS+TCXAgMBAAGjggOgMIIDnDAfBgNVHSMEGDAWgBRi\r\nTxPONmeEzRn8oE8Zi+8VVAEyHDAOBgNVHQ8BAf8EBAMCBaAwHQYDVR0lBBYwFAYI\r\nKwYBBQUHAwIGCCsGAQUFBwMBMB0GA1UdDgQWBBRCC+Q6QBJOFkh7mq9vPMPuilfi\r\nMTBZBgNVHSAEUjBQMEQGCSsGAQQBvUcNAjA3MDUGCCsGAQUFBwIBFilodHRwOi8v\r\nd3d3LnRlbGVzZWMuZGUvc2VydmVycGFzcy9jcHMuaHRtbDAIBgZngQwBAgIwggEh\r\nBgNVHR8EggEYMIIBFDBFoEOgQYY/aHR0cDovL2NybC5zZXJ2ZXJwYXNzLnRlbGVz\r\nZWMuZGUvcmwvVGVsZVNlY19TZXJ2ZXJQYXNzX0RFLTEuY3JsMIHKoIHHoIHEhoHB\r\nbGRhcDovL2xkYXAuc2VydmVycGFzcy50ZWxlc2VjLmRlL2NuPVRlbGVTZWMlMjBT\r\nZXJ2ZXJQYXNzJTIwREUtMSxvdT1ULVN5c3RlbXMlMjBUcnVzdCUyMENlbnRlcixv\r\nPVQtU3lzdGVtcyUyMEludGVybmF0aW9uYWwlMjBHbWJILGM9ZGU/Y2VydGlmaWNh\r\ndGVSZXZvY2F0aW9ubGlzdD9iYXNlP2NlcnRpZmljYXRlUmV2b2NhdGlvbmxpc3Q9\r\nKjCCATkGCCsGAQUFBwEBBIIBKzCCAScwMwYIKwYBBQUHMAGGJ2h0dHA6Ly9vY3Nw\r\nLnNlcnZlcnBhc3MudGVsZXNlYy5kZS9vY3NwcjBMBggrBgEFBQcwAoZAaHR0cDov\r\nL2NybC5zZXJ2ZXJwYXNzLnRlbGVzZWMuZGUvY3J0L1RlbGVTZWNfU2VydmVyUGFz\r\nc19ERS0xLmNlcjCBoQYIKwYBBQUHMAKGgZRsZGFwOi8vbGRhcC5zZXJ2ZXJwYXNz\r\nLnRlbGVzZWMuZGUvY249VGVsZVNlYyUyMFNlcnZlclBhc3MlMjBERS0xLG91PVQt\r\nU3lzdGVtcyUyMFRydXN0JTIwQ2VudGVyLG89VC1TeXN0ZW1zJTIwSW50ZXJuYXRp\r\nb25hbCUyMEdtYkgsYz1kZT9jQUNlcnRpZmljYXRlMAwGA1UdEwEB/wQCMAAwYAYD\r\nVR0RBFkwV4IWc2VjdXJlaW1hcC50LW9ubGluZS5kZYIUaW1hcG1haWwudC1vbmxp\r\nbmUuZGWCFWltYXAtbWFpbC50LW9ubGluZS5kZYIQaW1hcC50LW9ubGluZS5kZTAN\r\nBgkqhkiG9w0BAQUFAAOCAQEAB7fRFmLSpT5qMcCL4V4gf7/cOrNZK/7F/X9aF6T9\r\n9xFbzWhq7tti0rsrfvOgWk6It3YMEc/04OBoXnh43xg3tBWE16cz2ptr6YxAyoj8\r\nhn9p0x9coW1Cw2qFMPZi1IkwQpOm2pF/bXgqNEerhXKTZYnrko2mVcPnSoKcpRwL\r\n/55qVH88DmYQXnwhVgwzJYK0TP8E1m9MlUvtIPVudSOwkDS0tRlEOwnYXQOP1CCk\r\nYo3nSt3N1yjQEe8scx+4miF4Y7WQ4cKx0w2huwV9snp32h8kdtvvRxHSlMsQKxFu\r\nPQZk2EDE5pHTgzojgQkG7YTep+hh2DQl7piv+jbjM+Sxbw==\r\n-----END CERTIFICATE-----',
                pinned: true
            },
            smtp: {
                host: 'securesmtp.t-online.de',
                port: 465,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIH+zCCBuOgAwIBAgIJAPW7+G3hGuGWMA0GCSqGSIb3DQEBBQUAMIHJMQswCQYD\r\nVQQGEwJERTElMCMGA1UEChMcVC1TeXN0ZW1zIEludGVybmF0aW9uYWwgR21iSDEf\r\nMB0GA1UECxMWVC1TeXN0ZW1zIFRydXN0IENlbnRlcjEMMAoGA1UECBMDTlJXMQ4w\r\nDAYDVQQREwU1NzI1MDEQMA4GA1UEBxMHTmV0cGhlbjEgMB4GA1UECRMXVW50ZXJl\r\nIEluZHVzdHJpZXN0ci4gMjAxIDAeBgNVBAMTF1RlbGVTZWMgU2VydmVyUGFzcyBE\r\nRS0xMB4XDTE0MDQxNzA5MTk0NloXDTE2MDQyMjIzNTk1OVowga4xCzAJBgNVBAYT\r\nAkRFMRwwGgYDVQQKExNEZXV0c2NoZSBUZWxla29tIEFHMRMwEQYDVQQLDApQJkkg\r\nQU0vRENTMQ8wDQYDVQQIEwZIZXNzZW4xEjAQBgNVBAcTCURhcm1zdGFkdDEmMCQG\r\nCSqGSIb3DQEJARYXY2VydGFkbWluX3BpQHRlbGVrb20uZGUxHzAdBgNVBAMTFnNl\r\nY3VyZXNtdHAudC1vbmxpbmUuZGUwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK\r\nAoIBAQC7LE0RYPww4qKM0rO4BPKU50cr7/VpPXVv5Z+sq1r+qQ4hTjm/zqtWSmJU\r\nP45/Akp8EPBuqf2Kx0KBRhP/SNxDdlvy68JiLID2WNhKA6t1q0njJoxx8FVOiEqU\r\nQYgk1BNk+MbTFT4bJpnoTE7Nz+KW07XMVlGzm2femojPwxw+Hvbfi/6dMMGbCyU6\r\n2rQVihCFdE7jaZdPnsP1Y6+0B42+siP8iIBoJtHac9tT14J6sOZ8f3P4GQuVI/Ky\r\nO7SBgoqDilgQvRFJLsRqyGE1X4DqFV2Po4DbriRaHVOZtM0CfU5cVuesX7fCE35x\r\nyYyYXJiw4AU794rjR/nHy+0xwot5AgMBAAGjggP9MIID+TAfBgNVHSMEGDAWgBRi\r\nTxPONmeEzRn8oE8Zi+8VVAEyHDAOBgNVHQ8BAf8EBAMCBaAwHQYDVR0lBBYwFAYI\r\nKwYBBQUHAwIGCCsGAQUFBwMBMB0GA1UdDgQWBBQEF2eCJX54KC3LnK1hkboZHtgU\r\ndjBZBgNVHSAEUjBQMEQGCSsGAQQBvUcNAjA3MDUGCCsGAQUFBwIBFilodHRwOi8v\r\nd3d3LnRlbGVzZWMuZGUvc2VydmVycGFzcy9jcHMuaHRtbDAIBgZngQwBAgIwggEh\r\nBgNVHR8EggEYMIIBFDBFoEOgQYY/aHR0cDovL2NybC5zZXJ2ZXJwYXNzLnRlbGVz\r\nZWMuZGUvcmwvVGVsZVNlY19TZXJ2ZXJQYXNzX0RFLTEuY3JsMIHKoIHHoIHEhoHB\r\nbGRhcDovL2xkYXAuc2VydmVycGFzcy50ZWxlc2VjLmRlL2NuPVRlbGVTZWMlMjBT\r\nZXJ2ZXJQYXNzJTIwREUtMSxvdT1ULVN5c3RlbXMlMjBUcnVzdCUyMENlbnRlcixv\r\nPVQtU3lzdGVtcyUyMEludGVybmF0aW9uYWwlMjBHbWJILGM9ZGU/Y2VydGlmaWNh\r\ndGVSZXZvY2F0aW9ubGlzdD9iYXNlP2NlcnRpZmljYXRlUmV2b2NhdGlvbmxpc3Q9\r\nKjCCATkGCCsGAQUFBwEBBIIBKzCCAScwMwYIKwYBBQUHMAGGJ2h0dHA6Ly9vY3Nw\r\nLnNlcnZlcnBhc3MudGVsZXNlYy5kZS9vY3NwcjBMBggrBgEFBQcwAoZAaHR0cDov\r\nL2NybC5zZXJ2ZXJwYXNzLnRlbGVzZWMuZGUvY3J0L1RlbGVTZWNfU2VydmVyUGFz\r\nc19ERS0xLmNlcjCBoQYIKwYBBQUHMAKGgZRsZGFwOi8vbGRhcC5zZXJ2ZXJwYXNz\r\nLnRlbGVzZWMuZGUvY249VGVsZVNlYyUyMFNlcnZlclBhc3MlMjBERS0xLG91PVQt\r\nU3lzdGVtcyUyMFRydXN0JTIwQ2VudGVyLG89VC1TeXN0ZW1zJTIwSW50ZXJuYXRp\r\nb25hbCUyMEdtYkgsYz1kZT9jQUNlcnRpZmljYXRlMAwGA1UdEwEB/wQCMAAwgbwG\r\nA1UdEQSBtDCBsYIWc2VjdXJlc210cC50LW9ubGluZS5kZYIUc210cG1haWwudC1v\r\nbmxpbmUuZGWCFXNtdHAtbWFpbC50LW9ubGluZS5kZYIXc2VjdXJlLXNtdHAudC1v\r\nbmxpbmUuZGWCE3Vtc2dhdGUudC1vbmxpbmUuZGWCEWFzbXRwLnQtb25saW5lLmRl\r\nghdzZWN1cmVhc210cC50LW9ubGluZS5kZYIQc210cC50LW9ubGluZS5kZTANBgkq\r\nhkiG9w0BAQUFAAOCAQEAaed1t1h37qvROLO0M4UoOFkUvK3p+YrE89A+p/RCddGP\r\nCL7L1ywQXmo7VLyfdeF0X3yjWDvVq4Mm4QABZfhc5I3I282qICpv8bIGCefrZ5dU\r\n3zAkKVtRjn3BD4dbYCW/sIWnccl7HEiTZvTF1F1T+5Pev1N2YYMVshu7FJ8obXEa\r\n5q2xG/BLFr73AHrqpCq6JNp9nnZCCpu/IuZqfHcrPrQbpjxMk9K05XPBkRRqW8o8\r\n8cdmM+4zQSxCvDv7tYAIGKAX5vM3YTIv0Rah92/BFv8K7uc2w8aFnVDYglJ9j5Yj\r\nZwEQiXacs/agdmKuAKer/YPKM1mf1bZDzd6gWZpFJA==\r\n-----END CERTIFICATE-----',
                pinned: true
            }
        },
        checkOutboxInterval: 5000,
        iconPath: '/img/icon.png',
        verificationUrl: '/verify/',
        verificationUuidLength: 36,
        dbVersion: 4,
        appVersion: appVersion,
        outboxMailboxPath: 'OUTBOX',
        outboxMailboxType: 'Outbox'
    };

    /**
     * Strings are maintained here
     */
    app.string = {
        fallbackSubject: '(no subject)',
        invitationSubject: 'Invitation to a private conversation',
        invitationMessage: 'Hi,\n\nI use Whiteout Mail to send and receive encrypted email. I would like to exchange encrypted messages with you as well.\n\nPlease install the Whiteout Mail application. This application makes it easy to read and write messages securely with PGP encryption applied.\n\nGo to the Whiteout Networks homepage to learn more and to download the application: https://whiteout.io\n\n',
        message: 'Hi,\n\nthis is a private conversation. To read my encrypted message below, simply open it in Whiteout Mail.\nOpen Whiteout Mail: https://chrome.google.com/webstore/detail/jjgghafhamholjigjoghcfcekhkonijg\n\n\n',
        signature: '\n\n\n--\nSent from Whiteout Mail - Email encryption for the rest of us\nhttps://whiteout.io\n\n',
        webSite: 'http://whiteout.io',
        verificationSubject: '[whiteout] New public key uploaded',
        sendBtnClear: 'Send',
        sendBtnSecure: 'Send securely',
        updatePublicKeyTitle: 'Public Key Updated',
        updatePublicKeyMsgNewKey: '{0} updated his key and may not be able to read encrypted messages sent with his old key. Update the key?',
        updatePublicKeyMsgRemovedKey: '{0} revoked his key and may no longer be able to read encrypted messages. Remove the key?',
        updatePublicKeyPosBtn: 'Yes',
        updatePublicKeyNegBtn: 'No',
        outdatedCertificateTitle: 'Warning',
        outdatedCertificateMessage: 'The SSL certificate for the mail server {0} changed, the connection was refused.',
        updateCertificateTitle: 'Warning',
        updateCertificateMessage: 'The SSL certificate for the mail server {0} changed. Do you want to proceed?',
        updateCertificatePosBtn: 'Yes',
        updateCertificateNegBtn: 'No',
        bugReportTitle: 'Report a bug',
        bugReportSubject: '[Bug] I want to report a bug',
        bugReportBody: 'Steps to reproduce\n1. \n2. \n3. \n\nWhat happens?\n\n\nWhat do you expect to happen instead?\n\n\n\n== PLEASE DONT PUT ANY KEYS HERE! ==\n\n\n## Log\n\nBelow is the log. It includes your interactions with your email provider in an anonymized way from the point where you started the app for the last time. Any information provided by you will be used for the porpose of locating and fixing the bug you reported. It will be deleted subsequently. However, you can edit this log and/or remove log data in the event that something would show up.\n\n',
        supportAddress: 'mail.support@whiteout.io'
    };

    return app;
});