define(function(require) {
    'use strict';

    var appController = require('js/app-controller');

    var LoginExistingCtrl = function($scope, $location) {
        var emailDao = appController._emailDao;

        $scope.buttonEnabled = true;
        $scope.incorrect = false;

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
            appController._emailDao._keychain.getUserKeyPair(userId, function(err, keypair) {
                if (err) {
                    handleError(err);
                    return;
                }
                emailDao.unlock(keypair, $scope.passphrase, onUnlock);
            });
        }

        function onUnlock(err) {
            if (err) {
                handleError(err);
                return;
            }

            $location.path('/desktop');
            $scope.$apply();
        }

        function handleError(err) {
            $scope.incorrect = true;
            $scope.buttonEnabled = true;
            $scope.$apply();
            console.error(err);
        }
    };

    return LoginExistingCtrl;
});