define(function(require) {
    'use strict';

    var appController = require('js/app-controller'),
        errorUtil = require('js/util/error');

    var LoginExistingCtrl = function($scope, $location) {
        // global state... inherited to all child scopes
        $scope.$root.state = {};
        // attach global error handler
        errorUtil.attachHandler($scope);

        var emailDao = appController._emailDao;

        $scope.buttonEnabled = true;
        $scope.incorrect = false;

        $scope.change = function() {
            $scope.incorrect = false;
        };

        $scope.confirmPassphrase = function() {
            if (!$scope.passphrase) {
                return;
            }

            // disable button once loggin has started
            $scope.buttonEnabled = false;
            $scope.incorrect = false;
            unlockCrypto();
        };

        function unlockCrypto() {
            var userId = emailDao._account.emailAddress;
            emailDao._keychain.getUserKeyPair(userId, function(err, keypair) {
                if (err) {
                    handleError(err);
                    return;
                }

                emailDao.unlock({
                    keypair: keypair,
                    passphrase: $scope.passphrase
                }, onUnlock);
            });
        }

        function onUnlock(err) {
            if (err) {
                $scope.incorrect = true;
                $scope.buttonEnabled = true;
                $scope.$apply();
                return;
            }

            $location.path('/desktop');
            $scope.$apply();
        }

        function handleError(err) {
            $scope.incorrect = true;
            $scope.buttonEnabled = true;
            $scope.onError(err);
        }
    };

    return LoginExistingCtrl;
});