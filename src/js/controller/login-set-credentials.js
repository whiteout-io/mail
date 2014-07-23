define(function(require) {
    'use strict';

    var appCtrl = require('js/app-controller'),
        config = require('js/app-config').config,
        ImapClient = require('imap-client'),
        SmtpClient = require('smtpclient');

    var SetCredentialsCtrl = function($scope, $location) {
        var auth = appCtrl._auth;

        var provider;

        provider = $location.search().provider;
        $scope.hasProviderPreset = !!config[provider];
        $scope.useOAuth = !!auth.oauthToken;
        $scope.showDetails = (provider === 'custom');

        if ($scope.useOAuth) {
            $scope.emailAddress = auth.emailAddress;
        }

        if ($scope.hasProviderPreset) {
            // use non-editable smtp and imap presets for provider
            $scope.smtpHost = config[provider].smtp.host;
            $scope.smtpPort = config[provider].smtp.port;
            $scope.smtpSecure = config[provider].smtp.secure;
            $scope.smtpCert = config[provider].smtp.ca;
            $scope.smtpPinned = config[provider].smtp.pinned;
            $scope.imapHost = config[provider].imap.host;
            $scope.imapPort = config[provider].imap.port;
            $scope.imapSecure = config[provider].imap.secure;
            $scope.imapCert = config[provider].imap.ca;
            $scope.imapPinned = config[provider].imap.pinned;
        }

        $scope.test = function(imapClient, smtpClient) {
            $scope.credentialsIncomplete = false;
            $scope.connectionError = false;
            $scope.smtpOk = undefined;
            $scope.imapOk = undefined;

            if (!(($scope.username || $scope.emailAddress) && ($scope.password || $scope.useOAuth))) {
                $scope.credentialsIncomplete = true;
                return;
            }

            var imap = imapClient || new ImapClient({
                host: $scope.imapHost.toLowerCase(),
                port: $scope.imapPort,
                secure: $scope.imapSecure,
                ca: $scope.imapCert,
                auth: {
                    user: $scope.username || $scope.emailAddress,
                    pass: $scope.password,
                    xoauth2: auth.oauthToken
                }
            });

            imap.onCert = function(pemEncodedCert) {
                if (!$scope.imapPinned) {
                    $scope.imapCert = pemEncodedCert;
                }
            };

            imap.onError = function(err) {
                $scope.imapOk = !err;
                $scope.connectionError = err;
                done();
            };

            var smtp = smtpClient || new SmtpClient($scope.smtpHost.toLowerCase(), $scope.smtpPort, {
                useSecureTransport: $scope.smtpSecure,
                ca: $scope.smtpCert,
                auth: {
                    user: $scope.username || $scope.emailAddress,
                    pass: $scope.password,
                    xoauth2: auth.oauthToken
                }
            });

            smtp.oncert = function(pemEncodedCert) {
                if (!$scope.smtpPinned) {
                    $scope.smtpCert = pemEncodedCert;
                }
            };

            smtp.onerror = function(err) {
                $scope.smtpOk = !err;
                $scope.connectionError = $scope.connectionError || err;
                done();
            };

            smtp.onidle = function() {
                smtp.onerror = function() {}; // don't care about errors after discarding connection
                $scope.smtpOk = true;
                smtp.quit();
                done();
            };

            $scope.busy = 2;

            // fire away
            imap.login(function(err) {
                $scope.connectionError = $scope.connectionError || err;
                $scope.imapOk = !err;
                imap.logout(function() {}); // don't care about errors after discarding connection
                done();
            });

            smtp.connect();
        };

        function done() {
            if ($scope.busy > 0) {
                $scope.busy--;
            }

            if ($scope.smtpOk && $scope.imapOk) {
                login();
            }

            $scope.$apply();
        }

        function login() {
            auth.setCredentials({
                provider: provider,
                emailAddress: $scope.emailAddress,
                username: $scope.username || $scope.emailAddress,
                realname: $scope.realname,
                password: $scope.password,
                imap: {
                    host: $scope.imapHost.toLowerCase(),
                    port: $scope.imapPort,
                    secure: $scope.imapSecure,
                    ca: $scope.imapCert,
                    pinned: !!$scope.imapPinned
                },
                smtp: {
                    host: $scope.smtpHost.toLowerCase(),
                    port: $scope.smtpPort,
                    secure: $scope.smtpSecure,
                    ca: $scope.smtpCert,
                    pinned: !!$scope.smtpPinned
                }
            });
            redirect();
        }

        function redirect() {
            $location.path('/login');
        }
    };

    return SetCredentialsCtrl;
});