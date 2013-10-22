define(function(require) {
    'use strict';

    var appController = require('js/app-controller');

    var LoginExistingCtrl = function($scope, $location) {
        $scope.buttonEnabled = true;
        $scope.incorrect = false;

        $scope.confirmPassphrase = function() {
            var passphrase = $scope.passphrase,
                emailDao = appController._emailDao;

            if (!passphrase) {
                return;
            }

            // disable button once loggin has started
            $scope.buttonEnabled = false;
            $scope.incorrect = false;
            unlockCrypto(imapLogin);

            function unlockCrypto(callback) {
                var userId = emailDao._account.emailAddress;
                emailDao._keychain.getUserKeyPair(userId, function(err, keypair) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    emailDao.unlock(keypair, passphrase, callback);
                });
            }

            function imapLogin(err) {
                if (err) {
                    handleError(err);
                    return;
                }

                // login to imap backend
                appController._emailDao.imapLogin(function(err) {
                    if (err) {
                        handleError(err);
                        return;
                    }
                    onLogin();
                });
            }
        };

        function handleError(err) {
            $scope.incorrect = true;
            $scope.buttonEnabled = true;
            $scope.$apply();
            console.error(err);
        }

        function onLogin() {
            $location.path('/desktop');
            $scope.$apply();
        }
    };

    return LoginExistingCtrl;
});