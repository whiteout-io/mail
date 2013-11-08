define(function(require) {
    'use strict';

    var appController = require('js/app-controller');

    var LoginCtrl = function($scope, $location) {
        appController.start(function(err) {
            if (err) {
                console.error(err);
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
                    console.error(err);
                    return;
                }

                // initiate controller by creating email dao
                appController.init(auth.emailAddress, auth.token, function(err, availableKeys) {
                    if (err) {
                        console.error(err);
                        return;
                    }

                    // login to imap backend
                    appController._emailDao.imapLogin(function(err) {
                        if (err) {
                            console.error(err);
                            console.log('Error logging into IMAP... proceeding in offline mode.');
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