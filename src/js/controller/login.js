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

            initializeUser();
        });

        function initializeUser() {
            // get OAuth token from chrome
            appController.fetchOAuthToken(function(err, auth) {
                if (err) {
                    console.error(err);
                    return;
                }

                appController.init(auth.emailAddress, auth.token, function(err, availableKeys) {
                    if (err) {
                        console.error(err);
                        return;
                    }

                    redirect(availableKeys);
                });
            });
        }

        function redirect(availableKeys) {
            // redirect if needed
            if (!availableKeys.publicKey) {
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