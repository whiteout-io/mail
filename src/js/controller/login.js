define(function(require) {
    'use strict';

    var appController = require('js/app-controller');

    var LoginCtrl = function($scope, $location) {
        // global state... inherited to all child scopes
        $scope.$root.state = {};

        $scope.$root.onError = function(options) {
            console.error(options);
            $scope.state.dialog = {
                open: true,
                title: options.title || 'Error',
                message: options.message || options.errMsg
            };
        };

        appController.start(function(err) {
            if (err) {
                $scope.onError(err);
                return;
            }

            if (!window.chrome || !chrome.identity) {
                $location.path('/desktop');
                $scope.$apply();
                return;
            }

            // check for app update
            appController.checkForUpdate();

            // login to imap
            initializeUser();
        });

        function initializeUser() {
            // get OAuth token from chrome
            appController.fetchOAuthToken(function(err, auth) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                // initiate controller by creating email dao
                appController.init(auth.emailAddress, auth.token, function(err, availableKeys) {
                    if (err) {
                        $scope.onError(err);
                        return;
                    }

                    // login to imap backend
                    appController._emailDao.imapLogin(function(err) {
                        if (err) {
                            $scope.onError(err);
                            return;
                        }

                        redirect(availableKeys);
                    });
                });
            });
        }

        function redirect(availableKeys) {
            // redirect if needed
            if (typeof availableKeys === 'undefined') {
                // no public key available, start onboarding process
                $location.path('/login-initial');
            } else if (!availableKeys.privateKey) {
                // no private key, import key
                $location.path('/login-new-device');
            } else {
                // public and private key available, just login 
                $location.path('/login-existing');
            }
            $scope.$apply();
        }
    };

    return LoginCtrl;
});