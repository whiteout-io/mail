define(function(require) {
    'use strict';

    var appController = require('js/app-controller');

    var LoginInitialCtrl = function($scope, $location) {
        var emailDao = appController._emailDao,
            states, termsMsg = 'You must accept the Terms of Service to continue.';

        states = {
            IDLE: 1,
            PROCESSING: 2,
            DONE: 4
        };
        $scope.state.ui = states.IDLE; // initial state

        //
        // scope functions
        //

        $scope.importKey = function() {
            if (!$scope.state.agree) {
                $scope.onError({
                    message: termsMsg
                });
                return;
            }

            $location.path('/login-new-device');
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
            var passphrase = $scope.state.passphrase,
                confirmation = $scope.state.confirmation;

            if (passphrase !== confirmation) {
                return;
            }

            if (!$scope.state.agree) {
                $scope.onError({
                    message: termsMsg
                });
                return;
            }

            $scope.setState(states.PROCESSING);
            setTimeout(function() {
                emailDao.unlock({
                    passphrase: (passphrase) ? passphrase : undefined
                }, function(err) {
                    if (err) {
                        $scope.setState(states.IDLE);
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