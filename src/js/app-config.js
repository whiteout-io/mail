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
                pinned: true
            },
            smtp: {
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIEBDCCAuygAwIBAgIDAjppMA0GCSqGSIb3DQEBBQUAMEIxCzAJBgNVBAYTAlVT\r\nMRYwFAYDVQQKEw1HZW9UcnVzdCBJbmMuMRswGQYDVQQDExJHZW9UcnVzdCBHbG9i\r\nYWwgQ0EwHhcNMTMwNDA1MTUxNTU1WhcNMTUwNDA0MTUxNTU1WjBJMQswCQYDVQQG\r\nEwJVUzETMBEGA1UEChMKR29vZ2xlIEluYzElMCMGA1UEAxMcR29vZ2xlIEludGVy\r\nbmV0IEF1dGhvcml0eSBHMjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB\r\nAJwqBHdc2FCROgajguDYUEi8iT/xGXAaiEZ+4I/F8YnOIe5a/mENtzJEiaB0C1NP\r\nVaTOgmKV7utZX8bhBYASxF6UP7xbSDj0U/ck5vuR6RXEz/RTDfRK/J9U3n2+oGtv\r\nh8DQUB8oMANA2ghzUWx//zo8pzcGjr1LEQTrfSTe5vn8MXH7lNVg8y5Kr0LSy+rE\r\nahqyzFPdFUuLH8gZYR/Nnag+YyuENWllhMgZxUYi+FOVvuOAShDGKuy6lyARxzmZ\r\nEASg8GF6lSWMTlJ14rbtCMoU/M4iarNOz0YDl5cDfsCx3nuvRTPPuj5xt970JSXC\r\nDTWJnZ37DhF5iR43xa+OcmkCAwEAAaOB+zCB+DAfBgNVHSMEGDAWgBTAephojYn7\r\nqwVkDBF9qn1luMrMTjAdBgNVHQ4EFgQUSt0GFhu89mi1dvWBtrtiGrpagS8wEgYD\r\nVR0TAQH/BAgwBgEB/wIBADAOBgNVHQ8BAf8EBAMCAQYwOgYDVR0fBDMwMTAvoC2g\r\nK4YpaHR0cDovL2NybC5nZW90cnVzdC5jb20vY3Jscy9ndGdsb2JhbC5jcmwwPQYI\r\nKwYBBQUHAQEEMTAvMC0GCCsGAQUFBzABhiFodHRwOi8vZ3RnbG9iYWwtb2NzcC5n\r\nZW90cnVzdC5jb20wFwYDVR0gBBAwDjAMBgorBgEEAdZ5AgUBMA0GCSqGSIb3DQEB\r\nBQUAA4IBAQA21waAESetKhSbOHezI6B1WLuxfoNCunLaHtiONgaX4PCVOzf9G0JY\r\n/iLIa704XtE7JW4S615ndkZAkNoUyHgN7ZVm2o6Gb4ChulYylYbc3GrKBIxbf/a/\r\nzG+FA1jDaFETzf3I93k9mTXwVqO94FntT0QJo544evZG0R0SnU++0ED8Vf4GXjza\r\nHFa9llF7b1cq26KqltyMdMKVvvBulRP/F/A8rLIQjcxz++iPAsbw+zOzlTvjwsto\r\nWHPbqCRiOwY1nQ2pM714A5AuTHhdUDqB1O6gyHA43LL5Z/qHQF1hwFGPa4NrzQU6\r\nyuGnBXj8ytqU0CwIPX4WecigUCAkVDNx\r\n-----END CERTIFICATE-----',
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
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIGmzCCBYOgAwIBAgIIIbZ3foy9DqgwDQYJKoZIhvcNAQEFBQAwcTELMAkGA1UE\r\nBhMCREUxHDAaBgNVBAoTE0RldXRzY2hlIFRlbGVrb20gQUcxHzAdBgNVBAsTFlQt\r\nVGVsZVNlYyBUcnVzdCBDZW50ZXIxIzAhBgNVBAMTGkRldXRzY2hlIFRlbGVrb20g\r\nUm9vdCBDQSAyMB4XDTEzMDMwMTEzNTgyOVoXDTE5MDcwOTIzNTkwMFowgckxCzAJ\r\nBgNVBAYTAkRFMSUwIwYDVQQKExxULVN5c3RlbXMgSW50ZXJuYXRpb25hbCBHbWJI\r\nMR8wHQYDVQQLExZULVN5c3RlbXMgVHJ1c3QgQ2VudGVyMQwwCgYDVQQIEwNOUlcx\r\nDjAMBgNVBBETBTU3MjUwMRAwDgYDVQQHEwdOZXRwaGVuMSAwHgYDVQQJExdVbnRl\r\ncmUgSW5kdXN0cmllc3RyLiAyMDEgMB4GA1UEAxMXVGVsZVNlYyBTZXJ2ZXJQYXNz\r\nIERFLTEwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCwg+9QiuYAxX9/\r\n4F9XRZrS1o0q+aa9L/5/K3vc+RqPpliiZ24vTkJc1JDpXrbWXS25uT3yzHukQrhI\r\nq0AbcRqNEAeFi5EhUiEM/vtb4BYGHdqfXQ3etgYYcCtJ43NAHaSgsyQ9kyGV2lmM\r\nwkeAX3qZ2CGE9/cR6w+bOogHArBdk2JaHG09myNZDytr6oUbWLjLd/qhC9YzyZSX\r\nbZgE/kh5L5Y6P9paw2pDdn7+Ni4pXzlmoj1k43uiz+h2ibe3DO9dKMZAaEKeyG1O\r\ng0f0r53M8O+8Bm2sXtWelrAgrfFlISgWzO1hkNs12rWpr4c5Ygde/behx9OQmPwp\r\nmS+e3WvTAgMBAAGjggLcMIIC2DAOBgNVHQ8BAf8EBAMCAQYwHQYDVR0OBBYEFGJP\r\nE842Z4TNGfygTxmL7xVUATIcMB8GA1UdIwQYMBaAFDHDeRu69VPXF+CJei0XbAqz\r\nK50zMBIGA1UdEwEB/wQIMAYBAf8CAQAwWQYDVR0gBFIwUDBEBgkrBgEEAb1HDQIw\r\nNzA1BggrBgEFBQcCARYpaHR0cDovL3d3dy50ZWxlc2VjLmRlL3NlcnZlcnBhc3Mv\r\nY3BzLmh0bWwwCAYGZ4EMAQICMIHvBgNVHR8EgecwgeQwOqA4oDaGNGh0dHA6Ly9j\r\ncmwuc2VydmVycGFzcy50ZWxlc2VjLmRlL3JsL0RUX1JPT1RfQ0FfMi5jcmwwgaWg\r\ngaKggZ+GgZxsZGFwOi8vbGRhcC5zZXJ2ZXJwYXNzLnRlbGVzZWMuZGUvQ049RGV1\r\ndHNjaGUlMjBUZWxla29tJTIwUm9vdCUyMENBJTIwMixPVT1ULVRlbGVTZWMlMjBU\r\ncnVzdCUyMENlbnRlcixPPURldXRzY2hlJTIwVGVsZWtvbSUyMEFHLEM9REU/QXV0\r\naG9yaXR5UmV2b2NhdGlvbkxpc3QwggEjBggrBgEFBQcBAQSCARUwggERMCoGCCsG\r\nAQUFBzABhh5odHRwOi8vb2NzcDAyLnRlbGVzZWMuZGUvb2NzcHIwQQYIKwYBBQUH\r\nMAKGNWh0dHA6Ly9jcmwuc2VydmVycGFzcy50ZWxlc2VjLmRlL2NydC9EVF9ST09U\r\nX0NBXzIuY2VyMIGfBggrBgEFBQcwAoaBkmxkYXA6Ly9sZGFwLnNlcnZlcnBhc3Mu\r\ndGVsZXNlYy5kZS9DTj1EZXV0c2NoZSUyMFRlbGVrb20lMjBSb290JTIwQ0ElMjAy\r\nLE9VPVQtVGVsZVNlYyUyMFRydXN0JTIwQ2VudGVyLE89RGV1dHNjaGUlMjBUZWxl\r\na29tJTIwQUcsQz1ERT9jQUNlcnRpZmljYXRlMA0GCSqGSIb3DQEBBQUAA4IBAQBO\r\nE04qoEkEc9ad+WwSurVYfcDdjGvpqrtbI89woXDsWLQTMhA7D7jVuls90SJns0vc\r\nK9qoYkEGt0/ZlawLe2lyNWtueHfUf+dgleUunwHYLxuj3jQ2ERzQLVLrswjecRpX\r\nvGAGej89WpGQ9PMq27WGNC5WCmzVC9rk5naFgacsbwKwyjU0LoBArtAQnAAlpHDw\r\nPenv1Pe7MhUkCK0LqdTvkI/AHFzPYg/l5E3j8lQQ8hiKx8U6wf9xVKECLA2RlRqY\r\nUX2rpjQNxnvEq/mEQv3x3mLOEFJ3TAKI+soDgOOi0OG8+ywhm6S+7Z9lTlJ+BcD6\r\noy1MNKd4CQbltHLMTFUH\r\n-----END CERTIFICATE-----',
                pinned: true
            },
            smtp: {
                host: 'securesmtp.t-online.de',
                port: 465,
                secure: true,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIGmzCCBYOgAwIBAgIIIbZ3foy9DqgwDQYJKoZIhvcNAQEFBQAwcTELMAkGA1UE\r\nBhMCREUxHDAaBgNVBAoTE0RldXRzY2hlIFRlbGVrb20gQUcxHzAdBgNVBAsTFlQt\r\nVGVsZVNlYyBUcnVzdCBDZW50ZXIxIzAhBgNVBAMTGkRldXRzY2hlIFRlbGVrb20g\r\nUm9vdCBDQSAyMB4XDTEzMDMwMTEzNTgyOVoXDTE5MDcwOTIzNTkwMFowgckxCzAJ\r\nBgNVBAYTAkRFMSUwIwYDVQQKExxULVN5c3RlbXMgSW50ZXJuYXRpb25hbCBHbWJI\r\nMR8wHQYDVQQLExZULVN5c3RlbXMgVHJ1c3QgQ2VudGVyMQwwCgYDVQQIEwNOUlcx\r\nDjAMBgNVBBETBTU3MjUwMRAwDgYDVQQHEwdOZXRwaGVuMSAwHgYDVQQJExdVbnRl\r\ncmUgSW5kdXN0cmllc3RyLiAyMDEgMB4GA1UEAxMXVGVsZVNlYyBTZXJ2ZXJQYXNz\r\nIERFLTEwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCwg+9QiuYAxX9/\r\n4F9XRZrS1o0q+aa9L/5/K3vc+RqPpliiZ24vTkJc1JDpXrbWXS25uT3yzHukQrhI\r\nq0AbcRqNEAeFi5EhUiEM/vtb4BYGHdqfXQ3etgYYcCtJ43NAHaSgsyQ9kyGV2lmM\r\nwkeAX3qZ2CGE9/cR6w+bOogHArBdk2JaHG09myNZDytr6oUbWLjLd/qhC9YzyZSX\r\nbZgE/kh5L5Y6P9paw2pDdn7+Ni4pXzlmoj1k43uiz+h2ibe3DO9dKMZAaEKeyG1O\r\ng0f0r53M8O+8Bm2sXtWelrAgrfFlISgWzO1hkNs12rWpr4c5Ygde/behx9OQmPwp\r\nmS+e3WvTAgMBAAGjggLcMIIC2DAOBgNVHQ8BAf8EBAMCAQYwHQYDVR0OBBYEFGJP\r\nE842Z4TNGfygTxmL7xVUATIcMB8GA1UdIwQYMBaAFDHDeRu69VPXF+CJei0XbAqz\r\nK50zMBIGA1UdEwEB/wQIMAYBAf8CAQAwWQYDVR0gBFIwUDBEBgkrBgEEAb1HDQIw\r\nNzA1BggrBgEFBQcCARYpaHR0cDovL3d3dy50ZWxlc2VjLmRlL3NlcnZlcnBhc3Mv\r\nY3BzLmh0bWwwCAYGZ4EMAQICMIHvBgNVHR8EgecwgeQwOqA4oDaGNGh0dHA6Ly9j\r\ncmwuc2VydmVycGFzcy50ZWxlc2VjLmRlL3JsL0RUX1JPT1RfQ0FfMi5jcmwwgaWg\r\ngaKggZ+GgZxsZGFwOi8vbGRhcC5zZXJ2ZXJwYXNzLnRlbGVzZWMuZGUvQ049RGV1\r\ndHNjaGUlMjBUZWxla29tJTIwUm9vdCUyMENBJTIwMixPVT1ULVRlbGVTZWMlMjBU\r\ncnVzdCUyMENlbnRlcixPPURldXRzY2hlJTIwVGVsZWtvbSUyMEFHLEM9REU/QXV0\r\naG9yaXR5UmV2b2NhdGlvbkxpc3QwggEjBggrBgEFBQcBAQSCARUwggERMCoGCCsG\r\nAQUFBzABhh5odHRwOi8vb2NzcDAyLnRlbGVzZWMuZGUvb2NzcHIwQQYIKwYBBQUH\r\nMAKGNWh0dHA6Ly9jcmwuc2VydmVycGFzcy50ZWxlc2VjLmRlL2NydC9EVF9ST09U\r\nX0NBXzIuY2VyMIGfBggrBgEFBQcwAoaBkmxkYXA6Ly9sZGFwLnNlcnZlcnBhc3Mu\r\ndGVsZXNlYy5kZS9DTj1EZXV0c2NoZSUyMFRlbGVrb20lMjBSb290JTIwQ0ElMjAy\r\nLE9VPVQtVGVsZVNlYyUyMFRydXN0JTIwQ2VudGVyLE89RGV1dHNjaGUlMjBUZWxl\r\na29tJTIwQUcsQz1ERT9jQUNlcnRpZmljYXRlMA0GCSqGSIb3DQEBBQUAA4IBAQBO\r\nE04qoEkEc9ad+WwSurVYfcDdjGvpqrtbI89woXDsWLQTMhA7D7jVuls90SJns0vc\r\nK9qoYkEGt0/ZlawLe2lyNWtueHfUf+dgleUunwHYLxuj3jQ2ERzQLVLrswjecRpX\r\nvGAGej89WpGQ9PMq27WGNC5WCmzVC9rk5naFgacsbwKwyjU0LoBArtAQnAAlpHDw\r\nPenv1Pe7MhUkCK0LqdTvkI/AHFzPYg/l5E3j8lQQ8hiKx8U6wf9xVKECLA2RlRqY\r\nUX2rpjQNxnvEq/mEQv3x3mLOEFJ3TAKI+soDgOOi0OG8+ywhm6S+7Z9lTlJ+BcD6\r\noy1MNKd4CQbltHLMTFUH\r\n-----END CERTIFICATE-----',
                pinned: true
            }
        },
        checkOutboxInterval: 5000,
        iconPath: '/img/icon.png',
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
        message: 'Hi,\n\nthis is a private conversation. To read my encrypted message below, simply open it in Whiteout Mail.\nOpen Whiteout Mail: https://chrome.google.com/webstore/detail/jjgghafhamholjigjoghcfcekhkonijg\n\n\n',
        signature: '\n\n\n--\nSent from Whiteout Mail - Email encryption for the rest of us: https://whiteout.io\n\nMy PGP key: ',
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