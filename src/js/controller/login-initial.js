define(function(require) {
    'use strict';

    var appController = require('js/app-controller');

    var LoginInitialCtrl = function($scope, $location) {
        var emailDao = appController._emailDao,
            states, termsMsg = 'You must accept the Terms of Service to continue.';

        states = {
            IDLE: 1,
            SET_PASSPHRASE: 2,
            PROCESSING: 3,
            DONE: 4
        };
        $scope.state.ui = states.IDLE; // initial state

        //
        // scope functions
        //

        /**
         * Continue to key import screen
         */
        $scope.importKey = function() {
            if (!$scope.state.agree) {
                $scope.onError({
                    showBugReporter: false,
                    message: termsMsg
                });
                return;
            }

            // sing up to newsletter
            $scope.signUpToNewsletter();
            // go to key import
            $location.path('/login-new-device');
        };

        /**
         * Continue to set passphrase screen for keygen
         */
        $scope.setPassphrase = function() {
            if (!$scope.state.agree) {
                $scope.onError({
                    showBugReporter: false,
                    message: termsMsg
                });
                return;
            }

            // sing up to newsletter
            $scope.signUpToNewsletter();
            // go to set passphrase screen
            $scope.setState(states.SET_PASSPHRASE);
        };

        /**
         * [signUpToNewsletter description]
         * @param  {Function} callback (optional)
         */
        $scope.signUpToNewsletter = function(callback) {
            if (!$scope.state.newsletter) {
                return;
            }

            var address = emailDao._account.emailAddress;
            var uri = 'https://whiteout.us8.list-manage.com/subscribe/post?u=52ea5a9e1be9e1d194f184158&id=6538e8f09f';

            var formData = new FormData();
            formData.append('EMAIL', address);
            formData.append('b_52ea5a9e1be9e1d194f184158_6538e8f09f', '');

            var xhr = new XMLHttpRequest();
            xhr.open('post', uri, true);

            xhr.onload = function() {
                if (callback) {
                    callback(null, xhr);
                }
            };

            xhr.onerror = function(err) {
                if (callback) {
                    callback(err);
                }
            };

            xhr.send(formData);
        };

        /*
         * Taken from jQuery validate.password plug-in 1.0
         * http://bassistance.de/jquery-plugins/jquery-plugin-validate.password/
         *
         * Copyright (c) 2009 Jörn Zaefferer
         *
         * Licensed under the MIT
         *   http://www.opensource.org/licenses/mit-license.php
         */
        $scope.checkPassphraseQuality = function() {
            var passphrase = $scope.state.passphrase;
            $scope.passphraseRating = 0;

            var LOWER = /[a-z]/,
                UPPER = /[A-Z]/,
                DIGIT = /[0-9]/,
                DIGITS = /[0-9].*[0-9]/,
                SPECIAL = /[^a-zA-Z0-9]/,
                SAME = /^(.)\1+$/;

            function uncapitalize(str) {
                return str.substring(0, 1).toLowerCase() + str.substring(1);
            }

            if (!passphrase) {
                // no rating for empty passphrase
                $scope.passphraseMsg = '';
                return;
            }

            if (passphrase.length < 8 || SAME.test(passphrase)) {
                $scope.passphraseMsg = 'Very weak';
                return;
            }

            var lower = LOWER.test(passphrase),
                upper = UPPER.test(uncapitalize(passphrase)),
                digit = DIGIT.test(passphrase),
                digits = DIGITS.test(passphrase),
                special = SPECIAL.test(passphrase);

            if (lower && upper && digit || lower && digits || upper && digits || special) {
                $scope.passphraseMsg = 'Strong';
                $scope.passphraseRating = 3;
            } else if (lower && upper || lower && digit || upper && digit) {
                $scope.passphraseMsg = 'Good';
                $scope.passphraseRating = 2;
            } else {
                $scope.passphraseMsg = 'Weak';
                $scope.passphraseRating = 1;
            }
        };

        $scope.confirmPassphrase = function() {
            var passphrase = $scope.state.passphrase;

            $scope.setState(states.PROCESSING);

            setTimeout(function() {
                emailDao.unlock({
                    passphrase: (passphrase) ? passphrase : undefined
                }, function(err) {
                    if (err) {
                        $scope.setState(states.SET_PASSPHRASE);
                        $scope.onError(err);
                        return;
                    }

                    appController._auth.storeCredentials(function(err) {
                        if (err) {
                            return $scope.onError(err);
                        }

                        $location.path('/desktop');
                        $scope.$apply();
                    });
                });
            }, 500);
        };

        $scope.setState = function(state) {
            $scope.state.ui = state;
        };
    };

    return LoginInitialCtrl;
});