'use strict';

var appCtrl = require('../app-controller'),
    cfg = require('../app-config').config;

var AddAccountCtrl = function($scope, $location, $routeParams, $http) {
    if (!appCtrl._auth && !$routeParams.dev) {
        $location.path('/'); // init app
        return;
    }

    $scope.getAccountSettings = function() {
        if ($scope.form.$invalid) {
            return;
        }

        $scope.busy = true;
        $scope.errMsg = undefined; // reset error msg

        var domain = $scope.emailAddress.split('@')[1];
        var url = cfg.settingsUrl + domain;

        return $http.get(url).then(function(res) {
            var config = res.data;

            $scope.busy = false;
            $scope.state.login = {
                mailConfig: config,
                emailAddress: $scope.emailAddress
            };

            var hostname = config.imap.hostname;
            if (hostname && hostname.match(/.gmail.com$/) || hostname.match(/.googlemail.com$/)) {
                // check for gmail/oauth support
                $scope.connectToGoogle();
            } else if (config.imap.source === 'guess') {
                // use standard password login... show config details due to guess
                setCredentials('custom');
            } else {
                // use standard password login... hide config details
                setCredentials();
            }

        }).catch(function() {
            $scope.busy = false;
            $scope.errMsg = 'Error fetching IMAP settings for that email address!';
        });
    };

    $scope.connectToGoogle = function() {
        // test for oauth support
        if (appCtrl._auth._oauth.isSupported()) {
            // ask user to use the platform's native OAuth api
            $scope.onError({
                title: 'Google Account Login',
                message: 'You are signing into a Google account. Would you like to sign in with Google or just continue with a password login?',
                positiveBtnStr: 'Google sign in',
                negativeBtnStr: 'Password',
                showNegativeBtn: true,
                faqLink: 'https://github.com/whiteout-io/mail-html5/wiki/FAQ#how-does-sign-in-with-google-work',
                callback: function(granted) {
                    if (granted) {
                        useOAuth();
                    } else {
                        setGmailPassword();
                        $scope.$apply();
                    }
                }
            });
        } else {
            // no oauth support
            setGmailPassword();
        }
    };

    //
    // Helper functions
    //

    function useOAuth() {
        // fetches the email address from the chrome identity api
        appCtrl._auth.getOAuthToken(function(err) {
            if (err) {
                return $scope.onError(err);
            }
            setCredentials('gmail');
            $scope.$apply();
        });
    }

    function setGmailPassword() {
        // use normal user/password login
        setCredentials('gmail');
    }

    function setCredentials(provider) {
        $location.path('/login-set-credentials').search({
            provider: provider
        });
    }
};

module.exports = AddAccountCtrl;