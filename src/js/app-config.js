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
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIEBDCCAuygAwIBAgIDAjppMA0GCSqGSIb3DQEBBQUAMEIxCzAJBgNVBAYTAlVT\r\nMRYwFAYDVQQKEw1HZW9UcnVzdCBJbmMuMRswGQYDVQQDExJHZW9UcnVzdCBHbG9i\r\nYWwgQ0EwHhcNMTMwNDA1MTUxNTU1WhcNMTUwNDA0MTUxNTU1WjBJMQswCQYDVQQG\r\nEwJVUzETMBEGA1UEChMKR29vZ2xlIEluYzElMCMGA1UEAxMcR29vZ2xlIEludGVy\r\nbmV0IEF1dGhvcml0eSBHMjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB\r\nAJwqBHdc2FCROgajguDYUEi8iT/xGXAaiEZ+4I/F8YnOIe5a/mENtzJEiaB0C1NP\r\nVaTOgmKV7utZX8bhBYASxF6UP7xbSDj0U/ck5vuR6RXEz/RTDfRK/J9U3n2+oGtv\r\nh8DQUB8oMANA2ghzUWx//zo8pzcGjr1LEQTrfSTe5vn8MXH7lNVg8y5Kr0LSy+rE\r\nahqyzFPdFUuLH8gZYR/Nnag+YyuENWllhMgZxUYi+FOVvuOAShDGKuy6lyARxzmZ\r\nEASg8GF6lSWMTlJ14rbtCMoU/M4iarNOz0YDl5cDfsCx3nuvRTPPuj5xt970JSXC\r\nDTWJnZ37DhF5iR43xa+OcmkCAwEAAaOB+zCB+DAfBgNVHSMEGDAWgBTAephojYn7\r\nqwVkDBF9qn1luMrMTjAdBgNVHQ4EFgQUSt0GFhu89mi1dvWBtrtiGrpagS8wEgYD\r\nVR0TAQH/BAgwBgEB/wIBADAOBgNVHQ8BAf8EBAMCAQYwOgYDVR0fBDMwMTAvoC2g\r\nK4YpaHR0cDovL2NybC5nZW90cnVzdC5jb20vY3Jscy9ndGdsb2JhbC5jcmwwPQYI\r\nKwYBBQUHAQEEMTAvMC0GCCsGAQUFBzABhiFodHRwOi8vZ3RnbG9iYWwtb2NzcC5n\r\nZW90cnVzdC5jb20wFwYDVR0gBBAwDjAMBgorBgEEAdZ5AgUBMA0GCSqGSIb3DQEB\r\nBQUAA4IBAQA21waAESetKhSbOHezI6B1WLuxfoNCunLaHtiONgaX4PCVOzf9G0JY\r\n/iLIa704XtE7JW4S615ndkZAkNoUyHgN7ZVm2o6Gb4ChulYylYbc3GrKBIxbf/a/\r\nzG+FA1jDaFETzf3I93k9mTXwVqO94FntT0QJo544evZG0R0SnU++0ED8Vf4GXjza\r\nHFa9llF7b1cq26KqltyMdMKVvvBulRP/F/A8rLIQjcxz++iPAsbw+zOzlTvjwsto\r\nWHPbqCRiOwY1nQ2pM714A5AuTHhdUDqB1O6gyHA43LL5Z/qHQF1hwFGPa4NrzQU6\r\nyuGnBXj8ytqU0CwIPX4WecigUCAkVDNx\r\n-----END CERTIFICATE-----',
                pinned: true,
                ignoreTLS: false
            },
            smtp: {
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIEBDCCAuygAwIBAgIDAjppMA0GCSqGSIb3DQEBBQUAMEIxCzAJBgNVBAYTAlVT\r\nMRYwFAYDVQQKEw1HZW9UcnVzdCBJbmMuMRswGQYDVQQDExJHZW9UcnVzdCBHbG9i\r\nYWwgQ0EwHhcNMTMwNDA1MTUxNTU1WhcNMTUwNDA0MTUxNTU1WjBJMQswCQYDVQQG\r\nEwJVUzETMBEGA1UEChMKR29vZ2xlIEluYzElMCMGA1UEAxMcR29vZ2xlIEludGVy\r\nbmV0IEF1dGhvcml0eSBHMjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB\r\nAJwqBHdc2FCROgajguDYUEi8iT/xGXAaiEZ+4I/F8YnOIe5a/mENtzJEiaB0C1NP\r\nVaTOgmKV7utZX8bhBYASxF6UP7xbSDj0U/ck5vuR6RXEz/RTDfRK/J9U3n2+oGtv\r\nh8DQUB8oMANA2ghzUWx//zo8pzcGjr1LEQTrfSTe5vn8MXH7lNVg8y5Kr0LSy+rE\r\nahqyzFPdFUuLH8gZYR/Nnag+YyuENWllhMgZxUYi+FOVvuOAShDGKuy6lyARxzmZ\r\nEASg8GF6lSWMTlJ14rbtCMoU/M4iarNOz0YDl5cDfsCx3nuvRTPPuj5xt970JSXC\r\nDTWJnZ37DhF5iR43xa+OcmkCAwEAAaOB+zCB+DAfBgNVHSMEGDAWgBTAephojYn7\r\nqwVkDBF9qn1luMrMTjAdBgNVHQ4EFgQUSt0GFhu89mi1dvWBtrtiGrpagS8wEgYD\r\nVR0TAQH/BAgwBgEB/wIBADAOBgNVHQ8BAf8EBAMCAQYwOgYDVR0fBDMwMTAvoC2g\r\nK4YpaHR0cDovL2NybC5nZW90cnVzdC5jb20vY3Jscy9ndGdsb2JhbC5jcmwwPQYI\r\nKwYBBQUHAQEEMTAvMC0GCCsGAQUFBzABhiFodHRwOi8vZ3RnbG9iYWwtb2NzcC5n\r\nZW90cnVzdC5jb20wFwYDVR0gBBAwDjAMBgorBgEEAdZ5AgUBMA0GCSqGSIb3DQEB\r\nBQUAA4IBAQA21waAESetKhSbOHezI6B1WLuxfoNCunLaHtiONgaX4PCVOzf9G0JY\r\n/iLIa704XtE7JW4S615ndkZAkNoUyHgN7ZVm2o6Gb4ChulYylYbc3GrKBIxbf/a/\r\nzG+FA1jDaFETzf3I93k9mTXwVqO94FntT0QJo544evZG0R0SnU++0ED8Vf4GXjza\r\nHFa9llF7b1cq26KqltyMdMKVvvBulRP/F/A8rLIQjcxz++iPAsbw+zOzlTvjwsto\r\nWHPbqCRiOwY1nQ2pM714A5AuTHhdUDqB1O6gyHA43LL5Z/qHQF1hwFGPa4NrzQU6\r\nyuGnBXj8ytqU0CwIPX4WecigUCAkVDNx\r\n-----END CERTIFICATE-----',
                pinned: true,
                ignoreTLS: false
            },
            ignoreUploadOnSent: true
        },
        yahoo: {
            imap: {
                host: 'imap.mail.yahoo.com',
                port: 993,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIFUjCCBDqgAwIBAgIQdThnkckQvgouzHOsQA7ctTANBgkqhkiG9w0BAQUFADCB\r\ntTELMAkGA1UEBhMCVVMxFzAVBgNVBAoTDlZlcmlTaWduLCBJbmMuMR8wHQYDVQQL\r\nExZWZXJpU2lnbiBUcnVzdCBOZXR3b3JrMTswOQYDVQQLEzJUZXJtcyBvZiB1c2Ug\r\nYXQgaHR0cHM6Ly93d3cudmVyaXNpZ24uY29tL3JwYSAoYykxMDEvMC0GA1UEAxMm\r\nVmVyaVNpZ24gQ2xhc3MgMyBTZWN1cmUgU2VydmVyIENBIC0gRzMwHhcNMTQwNDIy\r\nMDAwMDAwWhcNMTUwNDIzMjM1OTU5WjCBjDELMAkGA1UEBhMCVVMxEzARBgNVBAgT\r\nCkNhbGlmb3JuaWExEjAQBgNVBAcUCVN1bm55dmFsZTETMBEGA1UEChQKWWFob28g\r\nSW5jLjEfMB0GA1UECxQWSW5mb3JtYXRpb24gVGVjaG5vbG9neTEeMBwGA1UEAxQV\r\nKi5pbWFwLm1haWwueWFob28uY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB\r\nCgKCAQEAw36HN2sgtMNQ0TZlqGgfqInK/UT6y3ZgqDdmFRU9D5D5675hfxcwJoS+\r\nb0hIn/UixbZDpSLhNkjAkOTAbFEFWar7628D2dU5WtCUlFMiwg2TA0Un8B9EbUi5\r\nwDrqzXDyABVnBVR5I2eKwr5cuB9ldjxAabcCyqQhVKdH0+IskRpUrvxAb84uQtJg\r\nJyNieOZAWdxg9fkubk1YKw/MgJHnaY8P4lUlYY8fIY39d6gW6My8oT0IersrH1X1\r\n/oCmqUIGM1PawXBvvpPKYdI4fCH75/UaEQ41BFSUn1NsinFYZUPlVcBCOvLFEOQi\r\nuU+4Tjybq3x7NNhd3uBxfm4jo4h5zQIDAQABo4IBgzCCAX8wNQYDVR0RBC4wLIIV\r\nKi5pbWFwLm1haWwueWFob28uY29tghNpbWFwLm1haWwueWFob28uY29tMAkGA1Ud\r\nEwQCMAAwDgYDVR0PAQH/BAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMBBggrBgEF\r\nBQcDAjBlBgNVHSAEXjBcMFoGCmCGSAGG+EUBBzYwTDAjBggrBgEFBQcCARYXaHR0\r\ncHM6Ly9kLnN5bWNiLmNvbS9jcHMwJQYIKwYBBQUHAgIwGRoXaHR0cHM6Ly9kLnN5\r\nbWNiLmNvbS9ycGEwHwYDVR0jBBgwFoAUDURcFlNEwYJ+HSCrJfQBY9i+eaUwKwYD\r\nVR0fBCQwIjAgoB6gHIYaaHR0cDovL3NkLnN5bWNiLmNvbS9zZC5jcmwwVwYIKwYB\r\nBQUHAQEESzBJMB8GCCsGAQUFBzABhhNodHRwOi8vc2Quc3ltY2QuY29tMCYGCCsG\r\nAQUFBzAChhpodHRwOi8vc2Quc3ltY2IuY29tL3NkLmNydDANBgkqhkiG9w0BAQUF\r\nAAOCAQEAVxsglXJTtBTCoTwOd6j0iJQ+P9cxFVqHcmbshEfEQBlPwr4Sp9tLJ4kj\r\nfVi0XorWU6e6e57dtYtxpcPz+6WNSNKT0B0IBOTUTIBwSLJMHxEZI6gSS/fo1agt\r\n81B06rB8Rhn4yHwyDO/9uRvXbNYiEgpa5e6gIpXY6h6p1HscQMcuROaUA9ETvGd8\r\nDKG4XSZE7QAF9iB9WSLa/IQUD4sGMDaMp2q4XkoWZTnyL1bEDKwUvw9Z17PxVmrF\r\n8c7S5HTNU+1kyZw2LJRu3SgtsYXSWA88WFiKUPuqU+EBXmbrwLAwLAJ6mVc2bGFC\r\ng5fLGbtTscaARBlb1u3Iee2Fd419jg==\r\n-----END CERTIFICATE-----',
                pinned: true,
                ignoreTLS: false
            },
            smtp: {
                host: 'smtp.mail.yahoo.com',
                port: 465,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIHITCCBgmgAwIBAgIQBlVSvxlwsqw8Kc8eVV5EKTANBgkqhkiG9w0BAQUFADBm\r\nMQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3\r\nd3cuZGlnaWNlcnQuY29tMSUwIwYDVQQDExxEaWdpQ2VydCBIaWdoIEFzc3VyYW5j\r\nZSBDQS0zMB4XDTE0MDYwNTAwMDAwMFoXDTE1MDYyMzEyMDAwMFowYjELMAkGA1UE\r\nBhMCVVMxCzAJBgNVBAgTAkNBMRIwEAYDVQQHEwlTdW5ueXZhbGUxFDASBgNVBAoM\r\nC1lhaG9vISBJbmMuMRwwGgYDVQQDExNzbXRwLm1haWwueWFob28uY29tMIIBIjAN\r\nBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA339OSxTIuW6NVqKwYHFBbg4/tmEx\r\nMYpzohtObPaWgvLTsYdce+WlQFBU5rxaCMUtVsVAGJWs5uQRDVHXRLPnOWe+foqZ\r\n5ItgjYIQc1XeMv6BZEeaF3Bum5ehUyLB3y48cjbWxma1QlkZ8XAK0f9AS7ySWAen\r\no5OXJlMFAqXGtKMAhY46dzSY0wjgdrvgiomFRy0iQKV1DxGsXoXSMEszlUTQoNQ3\r\nWTsiA3O//cdWE06wWeA3/90cb7QkU3KflSoyfi878BQGpPR1L+rLNsqnc8QuucbD\r\nz4Q++rxGqgg4QYrOtmZfAn96TXhPWCwKld6FN+f3uV5ITOBFx44M5v1ILQIDAQAB\r\no4IDzTCCA8kwHwYDVR0jBBgwFoAUUOpzidsp+xCPnuUBINTeeZlIg/cwHQYDVR0O\r\nBBYEFEhOpSFQjO/QrSNfVwyInZUhyzhsMIICJAYDVR0RBIICGzCCAheCE3NtdHAu\r\nbWFpbC55YWhvby5jb22CFnNtdHAubWFpbC55YWhvby5jb20uYXKCFnNtdHAubWFp\r\nbC55YWhvby5jb20uYXWCFnNtdHAubWFpbC55YWhvby5jb20uYnKCFnNtdHAubWFp\r\nbC55YWhvby5jb20uY26CFnNtdHAubWFpbC55YWhvby5jb20uaGuCFnNtdHAubWFp\r\nbC55YWhvby5jb20ubXmCFnNtdHAubWFpbC55YWhvby5jb20ucGiCFnNtdHAubWFp\r\nbC55YWhvby5jb20uc2eCFnNtdHAubWFpbC55YWhvby5jb20udHeCFnNtdHAubWFp\r\nbC55YWhvby5jb20udm6CFXNtdHAubWFpbC55YWhvby5jby5pZIIVc210cC5tYWls\r\nLnlhaG9vLmNvLmlughVzbXRwLm1haWwueWFob28uY28ua3KCFXNtdHAubWFpbC55\r\nYWhvby5jby50aIIVc210cC5tYWlsLnlhaG9vLmNvLnVrghJzbXRwLm1haWwueWFo\r\nb28uY2GCEnNtdHAubWFpbC55YWhvby5jboISc210cC5tYWlsLnlhaG9vLmRlghJz\r\nbXRwLm1haWwueWFob28uZXOCEnNtdHAubWFpbC55YWhvby5mcoISc210cC5tYWls\r\nLnlhaG9vLml0gg9zbXRwLnk3bWFpbC5jb22CFHNtdHAuY29ycmVvLnlhaG9vLmVz\r\nMA4GA1UdDwEB/wQEAwIFoDAdBgNVHSUEFjAUBggrBgEFBQcDAQYIKwYBBQUHAwIw\r\nYQYDVR0fBFowWDAqoCigJoYkaHR0cDovL2NybDMuZGlnaWNlcnQuY29tL2NhMy1n\r\nMjguY3JsMCqgKKAmhiRodHRwOi8vY3JsNC5kaWdpY2VydC5jb20vY2EzLWcyOC5j\r\ncmwwQgYDVR0gBDswOTA3BglghkgBhv1sAQEwKjAoBggrBgEFBQcCARYcaHR0cHM6\r\nLy93d3cuZGlnaWNlcnQuY29tL0NQUzB7BggrBgEFBQcBAQRvMG0wJAYIKwYBBQUH\r\nMAGGGGh0dHA6Ly9vY3NwLmRpZ2ljZXJ0LmNvbTBFBggrBgEFBQcwAoY5aHR0cDov\r\nL2NhY2VydHMuZGlnaWNlcnQuY29tL0RpZ2lDZXJ0SGlnaEFzc3VyYW5jZUNBLTMu\r\nY3J0MAwGA1UdEwEB/wQCMAAwDQYJKoZIhvcNAQEFBQADggEBABshjUND4hADHGfe\r\ncV9XGXcr9h3u7mT5kgdcgGFhcrFAlwkzt0NUCbuN0X8DWHE72Tpb3zRE25CmUUJe\r\nktBbq9PQb4b5/Wt1htAEw0qUs3BsUbqejK9OHJ/11Jn2ek4+SLJuYlijzc7KM3F/\r\nyz7ZTZtKR0PglkXfqbpvWYGabYpfL2FRLoJ7alTLsMJcFxbSLYcAIMxufj7RyTBJ\r\nbKgRJl4wmP4+Zc2Q1p59mENY0u5HqVAAOmWc0jNb0/31+tRr5f6EgXxK++7TQOpF\r\n0TOaFsXlzRlpKfmIbzVr2nfwghV5/bRZj96TK3g1OoOz4C8ksK4INHnUdTAqZ18M\r\nvHpnJw4=\r\n-----END CERTIFICATE-----',
                pinned: true,
                ignoreTLS: false
            }
        },
        tonline: {
            imap: {
                host: 'secureimap.t-online.de',
                port: 993,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIGmzCCBYOgAwIBAgIIIbZ3foy9DqgwDQYJKoZIhvcNAQEFBQAwcTELMAkGA1UE\r\nBhMCREUxHDAaBgNVBAoTE0RldXRzY2hlIFRlbGVrb20gQUcxHzAdBgNVBAsTFlQt\r\nVGVsZVNlYyBUcnVzdCBDZW50ZXIxIzAhBgNVBAMTGkRldXRzY2hlIFRlbGVrb20g\r\nUm9vdCBDQSAyMB4XDTEzMDMwMTEzNTgyOVoXDTE5MDcwOTIzNTkwMFowgckxCzAJ\r\nBgNVBAYTAkRFMSUwIwYDVQQKExxULVN5c3RlbXMgSW50ZXJuYXRpb25hbCBHbWJI\r\nMR8wHQYDVQQLExZULVN5c3RlbXMgVHJ1c3QgQ2VudGVyMQwwCgYDVQQIEwNOUlcx\r\nDjAMBgNVBBETBTU3MjUwMRAwDgYDVQQHEwdOZXRwaGVuMSAwHgYDVQQJExdVbnRl\r\ncmUgSW5kdXN0cmllc3RyLiAyMDEgMB4GA1UEAxMXVGVsZVNlYyBTZXJ2ZXJQYXNz\r\nIERFLTEwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCwg+9QiuYAxX9/\r\n4F9XRZrS1o0q+aa9L/5/K3vc+RqPpliiZ24vTkJc1JDpXrbWXS25uT3yzHukQrhI\r\nq0AbcRqNEAeFi5EhUiEM/vtb4BYGHdqfXQ3etgYYcCtJ43NAHaSgsyQ9kyGV2lmM\r\nwkeAX3qZ2CGE9/cR6w+bOogHArBdk2JaHG09myNZDytr6oUbWLjLd/qhC9YzyZSX\r\nbZgE/kh5L5Y6P9paw2pDdn7+Ni4pXzlmoj1k43uiz+h2ibe3DO9dKMZAaEKeyG1O\r\ng0f0r53M8O+8Bm2sXtWelrAgrfFlISgWzO1hkNs12rWpr4c5Ygde/behx9OQmPwp\r\nmS+e3WvTAgMBAAGjggLcMIIC2DAOBgNVHQ8BAf8EBAMCAQYwHQYDVR0OBBYEFGJP\r\nE842Z4TNGfygTxmL7xVUATIcMB8GA1UdIwQYMBaAFDHDeRu69VPXF+CJei0XbAqz\r\nK50zMBIGA1UdEwEB/wQIMAYBAf8CAQAwWQYDVR0gBFIwUDBEBgkrBgEEAb1HDQIw\r\nNzA1BggrBgEFBQcCARYpaHR0cDovL3d3dy50ZWxlc2VjLmRlL3NlcnZlcnBhc3Mv\r\nY3BzLmh0bWwwCAYGZ4EMAQICMIHvBgNVHR8EgecwgeQwOqA4oDaGNGh0dHA6Ly9j\r\ncmwuc2VydmVycGFzcy50ZWxlc2VjLmRlL3JsL0RUX1JPT1RfQ0FfMi5jcmwwgaWg\r\ngaKggZ+GgZxsZGFwOi8vbGRhcC5zZXJ2ZXJwYXNzLnRlbGVzZWMuZGUvQ049RGV1\r\ndHNjaGUlMjBUZWxla29tJTIwUm9vdCUyMENBJTIwMixPVT1ULVRlbGVTZWMlMjBU\r\ncnVzdCUyMENlbnRlcixPPURldXRzY2hlJTIwVGVsZWtvbSUyMEFHLEM9REU/QXV0\r\naG9yaXR5UmV2b2NhdGlvbkxpc3QwggEjBggrBgEFBQcBAQSCARUwggERMCoGCCsG\r\nAQUFBzABhh5odHRwOi8vb2NzcDAyLnRlbGVzZWMuZGUvb2NzcHIwQQYIKwYBBQUH\r\nMAKGNWh0dHA6Ly9jcmwuc2VydmVycGFzcy50ZWxlc2VjLmRlL2NydC9EVF9ST09U\r\nX0NBXzIuY2VyMIGfBggrBgEFBQcwAoaBkmxkYXA6Ly9sZGFwLnNlcnZlcnBhc3Mu\r\ndGVsZXNlYy5kZS9DTj1EZXV0c2NoZSUyMFRlbGVrb20lMjBSb290JTIwQ0ElMjAy\r\nLE9VPVQtVGVsZVNlYyUyMFRydXN0JTIwQ2VudGVyLE89RGV1dHNjaGUlMjBUZWxl\r\na29tJTIwQUcsQz1ERT9jQUNlcnRpZmljYXRlMA0GCSqGSIb3DQEBBQUAA4IBAQBO\r\nE04qoEkEc9ad+WwSurVYfcDdjGvpqrtbI89woXDsWLQTMhA7D7jVuls90SJns0vc\r\nK9qoYkEGt0/ZlawLe2lyNWtueHfUf+dgleUunwHYLxuj3jQ2ERzQLVLrswjecRpX\r\nvGAGej89WpGQ9PMq27WGNC5WCmzVC9rk5naFgacsbwKwyjU0LoBArtAQnAAlpHDw\r\nPenv1Pe7MhUkCK0LqdTvkI/AHFzPYg/l5E3j8lQQ8hiKx8U6wf9xVKECLA2RlRqY\r\nUX2rpjQNxnvEq/mEQv3x3mLOEFJ3TAKI+soDgOOi0OG8+ywhm6S+7Z9lTlJ+BcD6\r\noy1MNKd4CQbltHLMTFUH\r\n-----END CERTIFICATE-----',
                pinned: true,
                ignoreTLS: false
            },
            smtp: {
                host: 'securesmtp.t-online.de',
                port: 465,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIGmzCCBYOgAwIBAgIIIbZ3foy9DqgwDQYJKoZIhvcNAQEFBQAwcTELMAkGA1UE\r\nBhMCREUxHDAaBgNVBAoTE0RldXRzY2hlIFRlbGVrb20gQUcxHzAdBgNVBAsTFlQt\r\nVGVsZVNlYyBUcnVzdCBDZW50ZXIxIzAhBgNVBAMTGkRldXRzY2hlIFRlbGVrb20g\r\nUm9vdCBDQSAyMB4XDTEzMDMwMTEzNTgyOVoXDTE5MDcwOTIzNTkwMFowgckxCzAJ\r\nBgNVBAYTAkRFMSUwIwYDVQQKExxULVN5c3RlbXMgSW50ZXJuYXRpb25hbCBHbWJI\r\nMR8wHQYDVQQLExZULVN5c3RlbXMgVHJ1c3QgQ2VudGVyMQwwCgYDVQQIEwNOUlcx\r\nDjAMBgNVBBETBTU3MjUwMRAwDgYDVQQHEwdOZXRwaGVuMSAwHgYDVQQJExdVbnRl\r\ncmUgSW5kdXN0cmllc3RyLiAyMDEgMB4GA1UEAxMXVGVsZVNlYyBTZXJ2ZXJQYXNz\r\nIERFLTEwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCwg+9QiuYAxX9/\r\n4F9XRZrS1o0q+aa9L/5/K3vc+RqPpliiZ24vTkJc1JDpXrbWXS25uT3yzHukQrhI\r\nq0AbcRqNEAeFi5EhUiEM/vtb4BYGHdqfXQ3etgYYcCtJ43NAHaSgsyQ9kyGV2lmM\r\nwkeAX3qZ2CGE9/cR6w+bOogHArBdk2JaHG09myNZDytr6oUbWLjLd/qhC9YzyZSX\r\nbZgE/kh5L5Y6P9paw2pDdn7+Ni4pXzlmoj1k43uiz+h2ibe3DO9dKMZAaEKeyG1O\r\ng0f0r53M8O+8Bm2sXtWelrAgrfFlISgWzO1hkNs12rWpr4c5Ygde/behx9OQmPwp\r\nmS+e3WvTAgMBAAGjggLcMIIC2DAOBgNVHQ8BAf8EBAMCAQYwHQYDVR0OBBYEFGJP\r\nE842Z4TNGfygTxmL7xVUATIcMB8GA1UdIwQYMBaAFDHDeRu69VPXF+CJei0XbAqz\r\nK50zMBIGA1UdEwEB/wQIMAYBAf8CAQAwWQYDVR0gBFIwUDBEBgkrBgEEAb1HDQIw\r\nNzA1BggrBgEFBQcCARYpaHR0cDovL3d3dy50ZWxlc2VjLmRlL3NlcnZlcnBhc3Mv\r\nY3BzLmh0bWwwCAYGZ4EMAQICMIHvBgNVHR8EgecwgeQwOqA4oDaGNGh0dHA6Ly9j\r\ncmwuc2VydmVycGFzcy50ZWxlc2VjLmRlL3JsL0RUX1JPT1RfQ0FfMi5jcmwwgaWg\r\ngaKggZ+GgZxsZGFwOi8vbGRhcC5zZXJ2ZXJwYXNzLnRlbGVzZWMuZGUvQ049RGV1\r\ndHNjaGUlMjBUZWxla29tJTIwUm9vdCUyMENBJTIwMixPVT1ULVRlbGVTZWMlMjBU\r\ncnVzdCUyMENlbnRlcixPPURldXRzY2hlJTIwVGVsZWtvbSUyMEFHLEM9REU/QXV0\r\naG9yaXR5UmV2b2NhdGlvbkxpc3QwggEjBggrBgEFBQcBAQSCARUwggERMCoGCCsG\r\nAQUFBzABhh5odHRwOi8vb2NzcDAyLnRlbGVzZWMuZGUvb2NzcHIwQQYIKwYBBQUH\r\nMAKGNWh0dHA6Ly9jcmwuc2VydmVycGFzcy50ZWxlc2VjLmRlL2NydC9EVF9ST09U\r\nX0NBXzIuY2VyMIGfBggrBgEFBQcwAoaBkmxkYXA6Ly9sZGFwLnNlcnZlcnBhc3Mu\r\ndGVsZXNlYy5kZS9DTj1EZXV0c2NoZSUyMFRlbGVrb20lMjBSb290JTIwQ0ElMjAy\r\nLE9VPVQtVGVsZVNlYyUyMFRydXN0JTIwQ2VudGVyLE89RGV1dHNjaGUlMjBUZWxl\r\na29tJTIwQUcsQz1ERT9jQUNlcnRpZmljYXRlMA0GCSqGSIb3DQEBBQUAA4IBAQBO\r\nE04qoEkEc9ad+WwSurVYfcDdjGvpqrtbI89woXDsWLQTMhA7D7jVuls90SJns0vc\r\nK9qoYkEGt0/ZlawLe2lyNWtueHfUf+dgleUunwHYLxuj3jQ2ERzQLVLrswjecRpX\r\nvGAGej89WpGQ9PMq27WGNC5WCmzVC9rk5naFgacsbwKwyjU0LoBArtAQnAAlpHDw\r\nPenv1Pe7MhUkCK0LqdTvkI/AHFzPYg/l5E3j8lQQ8hiKx8U6wf9xVKECLA2RlRqY\r\nUX2rpjQNxnvEq/mEQv3x3mLOEFJ3TAKI+soDgOOi0OG8+ywhm6S+7Z9lTlJ+BcD6\r\noy1MNKd4CQbltHLMTFUH\r\n-----END CERTIFICATE-----',
                pinned: true,
                ignoreTLS: false
            }
        },
        outlook: {
            imap: {
                host: 'imap-mail.outlook.com',
                port: 993,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIFQjCCBCqgAwIBAgISESHl0vjrML7zKmGlv42YL75vMA0GCSqGSIb3DQEBBQUA\r\nMF0xCzAJBgNVBAYTAkJFMRkwFwYDVQQKExBHbG9iYWxTaWduIG52LXNhMTMwMQYD\r\nVQQDEypHbG9iYWxTaWduIE9yZ2FuaXphdGlvbiBWYWxpZGF0aW9uIENBIC0gRzIw\r\nHhcNMTMwNDI0MjAzNTA5WhcNMTYwNDI0MjAzNTA5WjBsMQswCQYDVQQGEwJVUzET\r\nMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMV\r\nTWljcm9zb2Z0IENvcnBvcmF0aW9uMRYwFAYDVQQDDA0qLmhvdG1haWwuY29tMIIB\r\nIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAumSiBWrzHZf6WFP5a/j4+K7D\r\n1izLoYKj5Omll0pdxKvKcBRDf+iaIkCbSOPNpx2uWGZdwNwkabYCQavaBf2ebwmS\r\nS8i1CJpHflO+k0qYd5WUi7sSsZ3+6RaCMdLoDIPGyYMQuy7TFtVO7LSt5+qscyyi\r\nET8c3lE2aj/XW13UZvRrV65ZJvMjUtwaDnIcAxGeasYoebLsKdqHQ2uTr4PmNwCc\r\nviGVFSOzkGAoC0PfyqKB2xUWy3Kc5zRI2xvUW8Jb2b/9Ze3g55pIUzKsjpglkQTm\r\nedVPSYYPGNz6Kl/ZshBXdBAk398q1JkSmUaTMa2hJgBbcC+73ax40AJDGJlz+QID\r\nAQABo4IB6zCCAecwDgYDVR0PAQH/BAQDAgWgMEkGA1UdIARCMEAwPgYGZ4EMAQIC\r\nMDQwMgYIKwYBBQUHAgEWJmh0dHBzOi8vd3d3Lmdsb2JhbHNpZ24uY29tL3JlcG9z\r\naXRvcnkvMEAGA1UdEQQ5MDeCDSouaG90bWFpbC5jb22CCioubGl2ZS5jb22CDSou\r\nb3V0bG9vay5jb22CC2hvdG1haWwuY29tMAkGA1UdEwQCMAAwHQYDVR0lBBYwFAYI\r\nKwYBBQUHAwEGCCsGAQUFBwMCMEUGA1UdHwQ+MDwwOqA4oDaGNGh0dHA6Ly9jcmwu\r\nZ2xvYmFsc2lnbi5jb20vZ3MvZ3Nvcmdhbml6YXRpb252YWxnMi5jcmwwgZYGCCsG\r\nAQUFBwEBBIGJMIGGMEcGCCsGAQUFBzAChjtodHRwOi8vc2VjdXJlLmdsb2JhbHNp\r\nZ24uY29tL2NhY2VydC9nc29yZ2FuaXphdGlvbnZhbGcyLmNydDA7BggrBgEFBQcw\r\nAYYvaHR0cDovL29jc3AyLmdsb2JhbHNpZ24uY29tL2dzb3JnYW5pemF0aW9udmFs\r\nZzIwHQYDVR0OBBYEFHbgHqTLsXDt7uMRyE62rnDEfLn9MB8GA1UdIwQYMBaAFF1G\r\nso3ES3Qcu+31c7Y6tziPdZ5+MA0GCSqGSIb3DQEBBQUAA4IBAQByy1+3N6ZRVooI\r\nxqw8Ng+UFz0g7UHkbPEnvTu1uxJ2AojFuP/P1PAk+/6uMRvpPlWg/5uqmOIWxKxJ\r\nLo6xSbkDf4LN+KYwes3XSuPyziZ4QbPnehHhZ0377iiA8fpRJADg9NWKCRHh5aAd\r\ne9QvJUW/GgYkBN+F4yYc2jIjR3Rehv4JYOKS3iXO9OoHsDS2CcCFaS2imgQVfYLg\r\nslBwT/A08PCOhW5huiluSmih7x5Qf7sFDv8jineu6ehKzi8pKnOq4k8G4QiWn38Y\r\nCeiBkkwFOwj7T3M/ITiiSS9DHDGeokj16eBi83Zx3YYiJ9YZvnQ+4GvqJ5eJJ6pR\r\nKKvemr+m\r\n-----END CERTIFICATE-----',
                pinned: true,
                ignoreTLS: false
            },
            smtp: {
                host: 'smtp-mail.outlook.com',
                port: 587,
                secure: false,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIFQjCCBCqgAwIBAgISESHl0vjrML7zKmGlv42YL75vMA0GCSqGSIb3DQEBBQUA\r\nMF0xCzAJBgNVBAYTAkJFMRkwFwYDVQQKExBHbG9iYWxTaWduIG52LXNhMTMwMQYD\r\nVQQDEypHbG9iYWxTaWduIE9yZ2FuaXphdGlvbiBWYWxpZGF0aW9uIENBIC0gRzIw\r\nHhcNMTMwNDI0MjAzNTA5WhcNMTYwNDI0MjAzNTA5WjBsMQswCQYDVQQGEwJVUzET\r\nMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMV\r\nTWljcm9zb2Z0IENvcnBvcmF0aW9uMRYwFAYDVQQDDA0qLmhvdG1haWwuY29tMIIB\r\nIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAumSiBWrzHZf6WFP5a/j4+K7D\r\n1izLoYKj5Omll0pdxKvKcBRDf+iaIkCbSOPNpx2uWGZdwNwkabYCQavaBf2ebwmS\r\nS8i1CJpHflO+k0qYd5WUi7sSsZ3+6RaCMdLoDIPGyYMQuy7TFtVO7LSt5+qscyyi\r\nET8c3lE2aj/XW13UZvRrV65ZJvMjUtwaDnIcAxGeasYoebLsKdqHQ2uTr4PmNwCc\r\nviGVFSOzkGAoC0PfyqKB2xUWy3Kc5zRI2xvUW8Jb2b/9Ze3g55pIUzKsjpglkQTm\r\nedVPSYYPGNz6Kl/ZshBXdBAk398q1JkSmUaTMa2hJgBbcC+73ax40AJDGJlz+QID\r\nAQABo4IB6zCCAecwDgYDVR0PAQH/BAQDAgWgMEkGA1UdIARCMEAwPgYGZ4EMAQIC\r\nMDQwMgYIKwYBBQUHAgEWJmh0dHBzOi8vd3d3Lmdsb2JhbHNpZ24uY29tL3JlcG9z\r\naXRvcnkvMEAGA1UdEQQ5MDeCDSouaG90bWFpbC5jb22CCioubGl2ZS5jb22CDSou\r\nb3V0bG9vay5jb22CC2hvdG1haWwuY29tMAkGA1UdEwQCMAAwHQYDVR0lBBYwFAYI\r\nKwYBBQUHAwEGCCsGAQUFBwMCMEUGA1UdHwQ+MDwwOqA4oDaGNGh0dHA6Ly9jcmwu\r\nZ2xvYmFsc2lnbi5jb20vZ3MvZ3Nvcmdhbml6YXRpb252YWxnMi5jcmwwgZYGCCsG\r\nAQUFBwEBBIGJMIGGMEcGCCsGAQUFBzAChjtodHRwOi8vc2VjdXJlLmdsb2JhbHNp\r\nZ24uY29tL2NhY2VydC9nc29yZ2FuaXphdGlvbnZhbGcyLmNydDA7BggrBgEFBQcw\r\nAYYvaHR0cDovL29jc3AyLmdsb2JhbHNpZ24uY29tL2dzb3JnYW5pemF0aW9udmFs\r\nZzIwHQYDVR0OBBYEFHbgHqTLsXDt7uMRyE62rnDEfLn9MB8GA1UdIwQYMBaAFF1G\r\nso3ES3Qcu+31c7Y6tziPdZ5+MA0GCSqGSIb3DQEBBQUAA4IBAQByy1+3N6ZRVooI\r\nxqw8Ng+UFz0g7UHkbPEnvTu1uxJ2AojFuP/P1PAk+/6uMRvpPlWg/5uqmOIWxKxJ\r\nLo6xSbkDf4LN+KYwes3XSuPyziZ4QbPnehHhZ0377iiA8fpRJADg9NWKCRHh5aAd\r\ne9QvJUW/GgYkBN+F4yYc2jIjR3Rehv4JYOKS3iXO9OoHsDS2CcCFaS2imgQVfYLg\r\nslBwT/A08PCOhW5huiluSmih7x5Qf7sFDv8jineu6ehKzi8pKnOq4k8G4QiWn38Y\r\nCeiBkkwFOwj7T3M/ITiiSS9DHDGeokj16eBi83Zx3YYiJ9YZvnQ+4GvqJ5eJJ6pR\r\nKKvemr+m\r\n-----END CERTIFICATE-----',
                pinned: true,
                ignoreTLS: false
            }
        },
        gmx: {
            imap: {
                host: 'imap.gmx.net',
                port: 993,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIHUDCCBjigAwIBAgIIM52e2Oc5J8kwDQYJKoZIhvcNAQEFBQAwgckxCzAJBgNV\r\nBAYTAkRFMSUwIwYDVQQKExxULVN5c3RlbXMgSW50ZXJuYXRpb25hbCBHbWJIMR8w\r\nHQYDVQQLExZULVN5c3RlbXMgVHJ1c3QgQ2VudGVyMQwwCgYDVQQIEwNOUlcxDjAM\r\nBgNVBBETBTU3MjUwMRAwDgYDVQQHEwdOZXRwaGVuMSAwHgYDVQQJExdVbnRlcmUg\r\nSW5kdXN0cmllc3RyLiAyMDEgMB4GA1UEAxMXVGVsZVNlYyBTZXJ2ZXJQYXNzIERF\r\nLTEwHhcNMTMxMTEyMTAxNzMxWhcNMTYxMTE3MjM1OTU5WjCBnTELMAkGA1UEBhMC\r\nREUxHjAcBgNVBAoMFTEmMSBNYWlsICYgTWVkaWEgR21iSDEdMBsGA1UECBMUUmhp\r\nbmVsYW5kLVBhbGF0aW5hdGUxEjAQBgNVBAcTCU1vbnRhYmF1cjEkMCIGCSqGSIb3\r\nDQEJARYVc2VydmVyLWNlcnRzQDF1bmQxLmRlMRUwEwYDVQQDEwxpbWFwLmdteC5u\r\nZXQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDHP3QN1ztX5m8LaC9m\r\nt2nrcLBEfxb61FQCieXW4OV/D5HEy7vgQIAeS+pg2/9ClawprQFbLUa46owUcJuq\r\no2SaefsYqjRhIP/tPeyGRJQmfnyCRRoHIYno57/bz2qmHjzvkqEUMvNGVVej7BJv\r\nGukNKPXYicodkRodF3EicTPnGitGeXOsAxyPuCPIsBPAMuuuBzKenS7nj+yseSGe\r\nkM7/kjtNgbjDyBXi2BvoUS/U+Gm9p1lq0ymT9fhGj/k9/Qz312GHYxfZB1bhL0pk\r\nadF25P8fTIy5tKMWqJfgCF+eaOwgkYecxeCcrt2E3D8ThLvmkBRrXsTT51ZzD7sp\r\n7hPpAgMBAAGjggNkMIIDYDAfBgNVHSMEGDAWgBRiTxPONmeEzRn8oE8Zi+8VVAEy\r\nHDAOBgNVHQ8BAf8EBAMCBaAwHQYDVR0lBBYwFAYIKwYBBQUHAwIGCCsGAQUFBwMB\r\nMB0GA1UdDgQWBBRfb2gYyD6V+oBN2Ii5WQj0AddemjBZBgNVHSAEUjBQMEQGCSsG\r\nAQQBvUcNAjA3MDUGCCsGAQUFBwIBFilodHRwOi8vd3d3LnRlbGVzZWMuZGUvc2Vy\r\ndmVycGFzcy9jcHMuaHRtbDAIBgZngQwBAgIwggEhBgNVHR8EggEYMIIBFDBFoEOg\r\nQYY/aHR0cDovL2NybC5zZXJ2ZXJwYXNzLnRlbGVzZWMuZGUvcmwvVGVsZVNlY19T\r\nZXJ2ZXJQYXNzX0RFLTEuY3JsMIHKoIHHoIHEhoHBbGRhcDovL2xkYXAuc2VydmVy\r\ncGFzcy50ZWxlc2VjLmRlL2NuPVRlbGVTZWMlMjBTZXJ2ZXJQYXNzJTIwREUtMSxv\r\ndT1ULVN5c3RlbXMlMjBUcnVzdCUyMENlbnRlcixvPVQtU3lzdGVtcyUyMEludGVy\r\nbmF0aW9uYWwlMjBHbWJILGM9ZGU/Y2VydGlmaWNhdGVSZXZvY2F0aW9ubGlzdD9i\r\nYXNlP2NlcnRpZmljYXRlUmV2b2NhdGlvbmxpc3Q9KjCCATkGCCsGAQUFBwEBBIIB\r\nKzCCAScwMwYIKwYBBQUHMAGGJ2h0dHA6Ly9vY3NwLnNlcnZlcnBhc3MudGVsZXNl\r\nYy5kZS9vY3NwcjBMBggrBgEFBQcwAoZAaHR0cDovL2NybC5zZXJ2ZXJwYXNzLnRl\r\nbGVzZWMuZGUvY3J0L1RlbGVTZWNfU2VydmVyUGFzc19ERS0xLmNlcjCBoQYIKwYB\r\nBQUHMAKGgZRsZGFwOi8vbGRhcC5zZXJ2ZXJwYXNzLnRlbGVzZWMuZGUvY249VGVs\r\nZVNlYyUyMFNlcnZlclBhc3MlMjBERS0xLG91PVQtU3lzdGVtcyUyMFRydXN0JTIw\r\nQ2VudGVyLG89VC1TeXN0ZW1zJTIwSW50ZXJuYXRpb25hbCUyMEdtYkgsYz1kZT9j\r\nQUNlcnRpZmljYXRlMAwGA1UdEwEB/wQCMAAwJAYDVR0RBB0wG4IMaW1hcC5nbXgu\r\nbmV0ggtpbWFwLmdteC5kZTANBgkqhkiG9w0BAQUFAAOCAQEADl442s2ouynDNEzl\r\nBPzhCxjp47TmKzgzrCGh1AH3+UOkw54mYU65UaY9cJ51jgOu+pjNB4KxVfcqyG5O\r\nJcowS09ZtZ+khb1OkzXAAbEqNj0oyH/1K550d5Ir5VbXF0ZdVKVTzEFRyjvUt5NJ\r\n/b6Q2bbY/sPm8QiK9SPaYkO5/3J1KB0u7PkqqfOhZ9UJE6mIN66T2bpFmAwle3zL\r\n6+L/VwYSgUNs/w2l6xWlYP3pFFaT12TO43Q057I3vP7yCt3QE/VLDpdQOQ3H0oy2\r\nJQGPJLFby9MPYNkmEmwjh4e95TAY4ZkZMe08ix0J1Smy8DwjTz6SXqYC+EC/PQlh\r\nE0UHxA==\r\n-----END CERTIFICATE-----',
                pinned: true,
                ignoreTLS: false
            },
            smtp: {
                host: 'mail.gmx.net',
                port: 587,
                secure: false,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIHbDCCBlSgAwIBAgIJAJ74Ek9UaA0TMA0GCSqGSIb3DQEBBQUAMIHJMQswCQYD\r\nVQQGEwJERTElMCMGA1UEChMcVC1TeXN0ZW1zIEludGVybmF0aW9uYWwgR21iSDEf\r\nMB0GA1UECxMWVC1TeXN0ZW1zIFRydXN0IENlbnRlcjEMMAoGA1UECBMDTlJXMQ4w\r\nDAYDVQQREwU1NzI1MDEQMA4GA1UEBxMHTmV0cGhlbjEgMB4GA1UECRMXVW50ZXJl\r\nIEluZHVzdHJpZXN0ci4gMjAxIDAeBgNVBAMTF1RlbGVTZWMgU2VydmVyUGFzcyBE\r\nRS0xMB4XDTEzMTExMjEwMTY0N1oXDTE2MTExNzIzNTk1OVowgZ0xCzAJBgNVBAYT\r\nAkRFMR4wHAYDVQQKDBUxJjEgTWFpbCAmIE1lZGlhIEdtYkgxHTAbBgNVBAgTFFJo\r\naW5lbGFuZC1QYWxhdGluYXRlMRIwEAYDVQQHEwlNb250YWJhdXIxJDAiBgkqhkiG\r\n9w0BCQEWFXNlcnZlci1jZXJ0c0AxdW5kMS5kZTEVMBMGA1UEAxMMbWFpbC5nbXgu\r\nbmV0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsEUYppbJXUpQELIL\r\nETAFUwreDfSmbyi9gJPUqquogROHEoRV+bBFZ2YCiHgLU8AggcLmM74HAQMFt8F5\r\neS2OyuEar3E3tNW5XFiI1QblTtY3B7o1coKyq/i+tV3b1jGq4+1aJeeD3UpcraBm\r\nk2XuQgQ6WAeY+XCYyI/OzZ56ZjQ17LHMMI0ayu7SSV+VBpG9loC9E5A82iVtZsqo\r\nSaUZpZf/xICpUgNJ+RlalSsoE6FdCywE/gEEmkpAUh+Mv0WvHITk6aqtMFWex8tE\r\n8cwJGQbmJGt9x8BExbhMY6uQ+HsnsDCPCMVh5JGKx7/e+qyxtHYGChOeI16m2+MT\r\nz47jSQIDAQABo4IDfzCCA3swHwYDVR0jBBgwFoAUYk8TzjZnhM0Z/KBPGYvvFVQB\r\nMhwwDgYDVR0PAQH/BAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMCBggrBgEFBQcD\r\nATAdBgNVHQ4EFgQUH8mLfxsd5FEh9M+3t3rP6qLiFTEwWQYDVR0gBFIwUDBEBgkr\r\nBgEEAb1HDQIwNzA1BggrBgEFBQcCARYpaHR0cDovL3d3dy50ZWxlc2VjLmRlL3Nl\r\ncnZlcnBhc3MvY3BzLmh0bWwwCAYGZ4EMAQICMIIBIQYDVR0fBIIBGDCCARQwRaBD\r\noEGGP2h0dHA6Ly9jcmwuc2VydmVycGFzcy50ZWxlc2VjLmRlL3JsL1RlbGVTZWNf\r\nU2VydmVyUGFzc19ERS0xLmNybDCByqCBx6CBxIaBwWxkYXA6Ly9sZGFwLnNlcnZl\r\ncnBhc3MudGVsZXNlYy5kZS9jbj1UZWxlU2VjJTIwU2VydmVyUGFzcyUyMERFLTEs\r\nb3U9VC1TeXN0ZW1zJTIwVHJ1c3QlMjBDZW50ZXIsbz1ULVN5c3RlbXMlMjBJbnRl\r\ncm5hdGlvbmFsJTIwR21iSCxjPWRlP2NlcnRpZmljYXRlUmV2b2NhdGlvbmxpc3Q/\r\nYmFzZT9jZXJ0aWZpY2F0ZVJldm9jYXRpb25saXN0PSowggE5BggrBgEFBQcBAQSC\r\nASswggEnMDMGCCsGAQUFBzABhidodHRwOi8vb2NzcC5zZXJ2ZXJwYXNzLnRlbGVz\r\nZWMuZGUvb2NzcHIwTAYIKwYBBQUHMAKGQGh0dHA6Ly9jcmwuc2VydmVycGFzcy50\r\nZWxlc2VjLmRlL2NydC9UZWxlU2VjX1NlcnZlclBhc3NfREUtMS5jZXIwgaEGCCsG\r\nAQUFBzAChoGUbGRhcDovL2xkYXAuc2VydmVycGFzcy50ZWxlc2VjLmRlL2NuPVRl\r\nbGVTZWMlMjBTZXJ2ZXJQYXNzJTIwREUtMSxvdT1ULVN5c3RlbXMlMjBUcnVzdCUy\r\nMENlbnRlcixvPVQtU3lzdGVtcyUyMEludGVybmF0aW9uYWwlMjBHbWJILGM9ZGU/\r\nY0FDZXJ0aWZpY2F0ZTAMBgNVHRMBAf8EAjAAMD8GA1UdEQQ4MDaCDG1haWwuZ214\r\nLm5ldIILbWFpbC5nbXguZGWCDHNtdHAuZ214Lm5ldIILc210cC5nbXguZGUwDQYJ\r\nKoZIhvcNAQEFBQADggEBAJ5SKsBXoOTO0ztsFh8RVd/iu6sijEMpKVF+/cs74TZN\r\nK1QWIz8Ay1f3SUPWXTvkmvayUXWGtxZfYoRIrx3feWBdUozJxe0wz1O3tDQOQgRX\r\nnkcwk7nibTUmW2rk5AIwV0jzOHtIbAGjSdc6my0543e7dVkhcuoCOC+g2NmD+pHF\r\ni1KpmqTLecDlFvprIZUJ23AT1uTnuXYg/tFHeDn3ga00Gce82xZQJelRirJs01SR\r\nDGEBaPXBjJVJNoAP/qEy3jQNRWo5TbSgwn3DTR81FJvltmf0c+zlt4fmcpjpr5ni\r\nFvK7L0rZQL5MOGHPpgRIukEBZCowYr3OYpZYBEaB94I=\r\n-----END CERTIFICATE-----',
                pinned: true,
                ignoreTLS: false
            }
        },
        webde: {
            imap: {
                host: 'imap.web.de',
                port: 993,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIHUjCCBjqgAwIBAgIIHvqUOScyxYUwDQYJKoZIhvcNAQEFBQAwgckxCzAJBgNV\r\nBAYTAkRFMSUwIwYDVQQKExxULVN5c3RlbXMgSW50ZXJuYXRpb25hbCBHbWJIMR8w\r\nHQYDVQQLExZULVN5c3RlbXMgVHJ1c3QgQ2VudGVyMQwwCgYDVQQIEwNOUlcxDjAM\r\nBgNVBBETBTU3MjUwMRAwDgYDVQQHEwdOZXRwaGVuMSAwHgYDVQQJExdVbnRlcmUg\r\nSW5kdXN0cmllc3RyLiAyMDEgMB4GA1UEAxMXVGVsZVNlYyBTZXJ2ZXJQYXNzIERF\r\nLTEwHhcNMTMwODIxMDgzMTE2WhcNMTYwODI2MjM1OTU5WjCBrTELMAkGA1UEBhMC\r\nREUxHjAcBgNVBAoMFTEmMSBNYWlsICYgTWVkaWEgR21iSDEPMA0GA1UECxMGV0VC\r\nLkRFMR0wGwYDVQQIExRSaGluZWxhbmQtUGFsYXRpbmF0ZTESMBAGA1UEBxMJTW9u\r\ndGFiYXVyMSQwIgYJKoZIhvcNAQkBFhVzZXJ2ZXItY2VydHNAMXVuZDEuZGUxFDAS\r\nBgNVBAMTC2ltYXAud2ViLmRlMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKC\r\nAQEA5dvpcnYczFs9GANTYN5N3mP6ATFVm7P4nYhRIQMj/YssSjmbrOPIEbe12JNC\r\nRO9CI7Z4Dnk42BM5TiH+QKGpcfnitofOv4gKPjwCMcPDHfY152/+YDaiyU/md2Hg\r\n/WrZ/50KwC8Sw1tZkYDXWB0zeJkfPdS2r4ATNrpMR0fYcG08+elz5T2SWNg+c1xL\r\nKFdCh33wZLkijOfW0HA164QjXaLPBjxa+GyZFY19ywOQ85KdFVVLmGUrLz8n4ZLc\r\n7K6KUuzYttnUuVxctFauQ4DRHE/CfUvvNHHgn5d+A2XS7jNUgmUb0gjzy3OtlTP3\r\ngM4ostVufmnlS7qqFDR7A3v4lQIDAQABo4IDVjCCA1IwHwYDVR0jBBgwFoAUYk8T\r\nzjZnhM0Z/KBPGYvvFVQBMhwwDgYDVR0PAQH/BAQDAgWgMB0GA1UdJQQWMBQGCCsG\r\nAQUFBwMCBggrBgEFBQcDATAdBgNVHQ4EFgQUDH66P/Y4NlKGphPniIzmutEI9ocw\r\nWQYDVR0gBFIwUDBEBgkrBgEEAb1HDQIwNzA1BggrBgEFBQcCARYpaHR0cDovL3d3\r\ndy50ZWxlc2VjLmRlL3NlcnZlcnBhc3MvY3BzLmh0bWwwCAYGZ4EMAQICMIIBIQYD\r\nVR0fBIIBGDCCARQwRaBDoEGGP2h0dHA6Ly9jcmwuc2VydmVycGFzcy50ZWxlc2Vj\r\nLmRlL3JsL1RlbGVTZWNfU2VydmVyUGFzc19ERS0xLmNybDCByqCBx6CBxIaBwWxk\r\nYXA6Ly9sZGFwLnNlcnZlcnBhc3MudGVsZXNlYy5kZS9jbj1UZWxlU2VjJTIwU2Vy\r\ndmVyUGFzcyUyMERFLTEsb3U9VC1TeXN0ZW1zJTIwVHJ1c3QlMjBDZW50ZXIsbz1U\r\nLVN5c3RlbXMlMjBJbnRlcm5hdGlvbmFsJTIwR21iSCxjPWRlP2NlcnRpZmljYXRl\r\nUmV2b2NhdGlvbmxpc3Q/YmFzZT9jZXJ0aWZpY2F0ZVJldm9jYXRpb25saXN0PSow\r\nggE5BggrBgEFBQcBAQSCASswggEnMDMGCCsGAQUFBzABhidodHRwOi8vb2NzcC5z\r\nZXJ2ZXJwYXNzLnRlbGVzZWMuZGUvb2NzcHIwTAYIKwYBBQUHMAKGQGh0dHA6Ly9j\r\ncmwuc2VydmVycGFzcy50ZWxlc2VjLmRlL2NydC9UZWxlU2VjX1NlcnZlclBhc3Nf\r\nREUtMS5jZXIwgaEGCCsGAQUFBzAChoGUbGRhcDovL2xkYXAuc2VydmVycGFzcy50\r\nZWxlc2VjLmRlL2NuPVRlbGVTZWMlMjBTZXJ2ZXJQYXNzJTIwREUtMSxvdT1ULVN5\r\nc3RlbXMlMjBUcnVzdCUyMENlbnRlcixvPVQtU3lzdGVtcyUyMEludGVybmF0aW9u\r\nYWwlMjBHbWJILGM9ZGU/Y0FDZXJ0aWZpY2F0ZTAMBgNVHRMBAf8EAjAAMBYGA1Ud\r\nEQQPMA2CC2ltYXAud2ViLmRlMA0GCSqGSIb3DQEBBQUAA4IBAQAp7MQjjOWQ0M7N\r\n21GrPDfWSMR3eJnuMs37I9G2t9i99w7xKtmoVBPyYMORL1zRHn/DEguo4j5ua7CH\r\nrKLh9Sd1wDKqVWGFxvmP4f/mvEx5YVI68mg+M2VQf/h58IXTTZRbUcsv3HVeruI6\r\npgQNUsEQqRVJmrgT/iPd98RhhzBqef6Wfrt3Ns6N835egphxUVcVj/v/PqBCZKQb\r\nNl5QsoaHDqh3XC+Og2awOGvWHUzxUKEqkP5nsMs2YjfOtcQRtxdislQAfRktuUBA\r\nWMZAlvoVF/CIyFvcUH11KNur7HfK5PptvtdvLQaF2c+lN+LGP6D+nbTLqAo1v09o\r\nnZpHbQOt\r\n-----END CERTIFICATE-----',
                pinned: true,
                ignoreTLS: false
            },
            smtp: {
                host: 'smtp.web.de',
                port: 587,
                secure: false,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIHUzCCBjugAwIBAgIJAKaEwtMgQ2s5MA0GCSqGSIb3DQEBBQUAMIHJMQswCQYD\r\nVQQGEwJERTElMCMGA1UEChMcVC1TeXN0ZW1zIEludGVybmF0aW9uYWwgR21iSDEf\r\nMB0GA1UECxMWVC1TeXN0ZW1zIFRydXN0IENlbnRlcjEMMAoGA1UECBMDTlJXMQ4w\r\nDAYDVQQREwU1NzI1MDEQMA4GA1UEBxMHTmV0cGhlbjEgMB4GA1UECRMXVW50ZXJl\r\nIEluZHVzdHJpZXN0ci4gMjAxIDAeBgNVBAMTF1RlbGVTZWMgU2VydmVyUGFzcyBE\r\nRS0xMB4XDTEzMDgyMTA4MzU1MVoXDTE2MDgyNjIzNTk1OVowga0xCzAJBgNVBAYT\r\nAkRFMR4wHAYDVQQKDBUxJjEgTWFpbCAmIE1lZGlhIEdtYkgxDzANBgNVBAsTBldF\r\nQi5ERTEdMBsGA1UECBMUUmhpbmVsYW5kLVBhbGF0aW5hdGUxEjAQBgNVBAcTCU1v\r\nbnRhYmF1cjEkMCIGCSqGSIb3DQEJARYVc2VydmVyLWNlcnRzQDF1bmQxLmRlMRQw\r\nEgYDVQQDEwtzbXRwLndlYi5kZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC\r\nggEBAL1WfyFqmifaEr6h9yntJKs33fnEVu0pQqS5RV9rnQU0E/cJYJ9RJOoTjhpE\r\nkT1LW8DyTM5vUzpgtFHQM0BOO6jOeZXUYNUaopK3yO4l/cpiitigtk9ZnWfKzbU3\r\n9hlhf+YwUUvoqjUA8I6fSu+VNPNlOBvamo18oHljXAPltL9oiwAxvTLNktBMy4T9\r\njxU1DeGoPbJKGwV7zIBQ2qUHuLkMvy5/H39t79Tih+zfzgfY/xIUfdmPNY9dK8ZY\r\nAtyF/RiUS199pd9dV4Vwh6JLvtNlWchBnKVhragLCGbkjnvUXmS1BPrclLR23s1v\r\nMehgOD2WhXl8PoqrOPb6y+lgMlECAwEAAaOCA1YwggNSMB8GA1UdIwQYMBaAFGJP\r\nE842Z4TNGfygTxmL7xVUATIcMA4GA1UdDwEB/wQEAwIFoDAdBgNVHSUEFjAUBggr\r\nBgEFBQcDAgYIKwYBBQUHAwEwHQYDVR0OBBYEFAUuppozNCv2UzMV5p6CTpkEhsRS\r\nMFkGA1UdIARSMFAwRAYJKwYBBAG9Rw0CMDcwNQYIKwYBBQUHAgEWKWh0dHA6Ly93\r\nd3cudGVsZXNlYy5kZS9zZXJ2ZXJwYXNzL2Nwcy5odG1sMAgGBmeBDAECAjCCASEG\r\nA1UdHwSCARgwggEUMEWgQ6BBhj9odHRwOi8vY3JsLnNlcnZlcnBhc3MudGVsZXNl\r\nYy5kZS9ybC9UZWxlU2VjX1NlcnZlclBhc3NfREUtMS5jcmwwgcqggceggcSGgcFs\r\nZGFwOi8vbGRhcC5zZXJ2ZXJwYXNzLnRlbGVzZWMuZGUvY249VGVsZVNlYyUyMFNl\r\ncnZlclBhc3MlMjBERS0xLG91PVQtU3lzdGVtcyUyMFRydXN0JTIwQ2VudGVyLG89\r\nVC1TeXN0ZW1zJTIwSW50ZXJuYXRpb25hbCUyMEdtYkgsYz1kZT9jZXJ0aWZpY2F0\r\nZVJldm9jYXRpb25saXN0P2Jhc2U/Y2VydGlmaWNhdGVSZXZvY2F0aW9ubGlzdD0q\r\nMIIBOQYIKwYBBQUHAQEEggErMIIBJzAzBggrBgEFBQcwAYYnaHR0cDovL29jc3Au\r\nc2VydmVycGFzcy50ZWxlc2VjLmRlL29jc3ByMEwGCCsGAQUFBzAChkBodHRwOi8v\r\nY3JsLnNlcnZlcnBhc3MudGVsZXNlYy5kZS9jcnQvVGVsZVNlY19TZXJ2ZXJQYXNz\r\nX0RFLTEuY2VyMIGhBggrBgEFBQcwAoaBlGxkYXA6Ly9sZGFwLnNlcnZlcnBhc3Mu\r\ndGVsZXNlYy5kZS9jbj1UZWxlU2VjJTIwU2VydmVyUGFzcyUyMERFLTEsb3U9VC1T\r\neXN0ZW1zJTIwVHJ1c3QlMjBDZW50ZXIsbz1ULVN5c3RlbXMlMjBJbnRlcm5hdGlv\r\nbmFsJTIwR21iSCxjPWRlP2NBQ2VydGlmaWNhdGUwDAYDVR0TAQH/BAIwADAWBgNV\r\nHREEDzANggtzbXRwLndlYi5kZTANBgkqhkiG9w0BAQUFAAOCAQEAGFtJxVxWrURy\r\nFfR4UfmW+N1cZZx9sfC5jolV8LGje87DgbWdqu5TRL9FoQ1pwOTbM9mc3yWSoIbU\r\nx6E+rziJK+SFGMIy+Lt13P9M9Oc8JzVHoVEAgqlEeO6OYxrGE6SaSjZODJxPaEtU\r\nzEAKf0HVJQoGaU6fD+/8l3yhksAlsF/L85nP+KcZtoancOkJWE0GQMZp7pdLU0Ou\r\nFUQoAcqMIyHQfDqJ5iwvx/9C7jmy3Nvw9tXdPrdn2O7ywrnFeJuT2xiorZzg6ezn\r\nUlc/sMvd/LPX0f60pSQr9tkZgU4f8Jvx9EvPUCFTRXlXqkBIhgJhgCadZC+wKB1P\r\neQMS8rksXw==\r\n-----END CERTIFICATE-----',
                pinned: true,
                ignoreTLS: false
            }
        },
        checkOutboxInterval: 5000,
        iconPath: '/img/icon-128-chrome.png',
        verificationUrl: '/verify/',
        verificationUuidLength: 36,
        dbVersion: 5,
        appVersion: appVersion,
        outboxMailboxPath: 'OUTBOX',
        outboxMailboxName: 'Outbox',
        outboxMailboxType: 'Outbox'
    };

    /**
     * Strings are maintained here
     */
    app.string = {
        fallbackSubject: '(no subject)',
        invitationSubject: 'Invitation to a private conversation',
        invitationMessage: 'Hi,\n\nI use Whiteout Mail to send and receive encrypted email. I would like to exchange encrypted messages with you as well.\n\nPlease install the Whiteout Mail application. This application makes it easy to read and write messages securely with PGP encryption applied.\n\nGo to the Whiteout Networks homepage to learn more and to download the application: https://whiteout.io\n\n',
        signature: '\n\n\n--\nSent from Whiteout Mail - https://whiteout.io\n\nMy PGP key: ',
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
        certificateFaqLink: 'https://github.com/whiteout-io/mail-html5/wiki/FAQ#what-does-the-ssl-certificate-for-the-mail-server--changed-mean',
        bugReportTitle: 'Report a bug',
        bugReportSubject: '[Bug] I want to report a bug',
        bugReportBody: 'Steps to reproduce\n1. \n2. \n3. \n\nWhat happens?\n\n\nWhat do you expect to happen instead?\n\n\n\n== PLEASE DONT PUT ANY KEYS HERE! ==\n\n\n## Log\n\nBelow is the log. It includes your interactions with your email provider in an anonymized way from the point where you started the app for the last time. Any information provided by you will be used for the porpose of locating and fixing the bug you reported. It will be deleted subsequently. However, you can edit this log and/or remove log data in the event that something would show up.\n\n',
        supportAddress: 'mail.support@whiteout.io'
    };

    return app;
});