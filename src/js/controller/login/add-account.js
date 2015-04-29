'use strict';

var AddAccountCtrl = function($scope, $location, $routeParams, $timeout, $q, mailConfig, auth, dialog) {
    !$routeParams.dev && !auth.isInitialized() && $location.path('/'); // init app

    $scope.getAccountSettings = function() {
        if ($scope.form.$invalid) {
            $scope.errMsg = 'Please enter a valid email address!';
            return;
        }

        return $q(function(resolve) {
            $scope.busy = true;
            $scope.errMsg = undefined; // reset error msg
            resolve();

        }).then(function() {
            return mailConfig.get($scope.emailAddress);

        }).then(function(config) {
            $scope.busy = false;
            $scope.state.login = {
                mailConfig: config,
                emailAddress: $scope.emailAddress
            };

            var hostname = config.imap.hostname;
            if (auth.useOAuth(hostname)) {
                // check for oauth support
                return $scope.oauthPossible();
            } else {
                // use standard password login
                return $scope.setCredentials();
            }

        }).catch(function() {
            $scope.busy = false;
            $scope.errMsg = 'Error fetching IMAP settings for that email address!';
        });
    };

    $scope.oauthPossible = function() {
        // ask user to use the platform's native OAuth api
        return dialog.confirm({
            title: 'Google Account Login',
            message: 'You are signing into a Google account. Would you like to sign in with Google or just continue with a password login?',
            positiveBtnStr: 'Google sign in',
            negativeBtnStr: 'Password',
            showNegativeBtn: true,
            faqLink: 'https://github.com/whiteout-io/mail-html5/wiki/FAQ#how-does-sign-in-with-google-work',
            callback: function(granted) {
                if (granted) {
                    // query oauth token
                    return getOAuthToken();
                } else {
                    // use normal user/password login
                    $scope.setCredentials();
                }
            }
        });

        function getOAuthToken() {
            // fetches the email address from the chrome identity api
            return auth.getOAuthToken().then(function() {
                // continue to setting credentials
                return $scope.setCredentials();

            }).catch(dialog.error);
        }
    };

    $scope.setCredentials = function() {
        return $timeout(function() {
            $location.path('/login-set-credentials');
        });
    };
};

module.exports = AddAccountCtrl;