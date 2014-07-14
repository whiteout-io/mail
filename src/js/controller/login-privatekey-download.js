define(function(require) {
    'use strict';

    var appController = require('js/app-controller');

    var LoginPrivateKeyDownloadCtrl = function($scope, $location) {
        var keychain = appController._keychain,
            emailDao = appController._emailDao,
            userId = emailDao._account.emailAddress;

        $scope.step = 1;

        $scope.verifyRecoveryToken = function(callback) {
            if (!$scope.recoveryToken) {
                $scope.onError(new Error('Please set the recovery token!'));
                return;
            }

            keychain.getUserKeyPair(userId, function(err, keypair) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                // remember for storage later
                $scope.cachedKeypair = keypair;

                keychain.downloadPrivateKey({
                    userId: userId,
                    keyId: keypair.publicKey._id,
                    recoveryToken: $scope.recoveryToken
                }, function(err, encryptedPrivateKey) {
                    if (err) {
                        $scope.onError(err);
                        return;
                    }

                    $scope.encryptedPrivateKey = encryptedPrivateKey;
                    callback();
                });
            });
        };

        $scope.decryptAndStorePrivateKeyLocally = function() {
            var inputCode = '' + $scope.code0 + $scope.code1 + $scope.code2 + $scope.code3 + $scope.code4 + $scope.code5;

            if (!inputCode) {
                $scope.onError(new Error('Please enter the keychain code!'));
                return;
            }

            var options = $scope.encryptedPrivateKey;
            options.code = inputCode.toUpperCase();

            keychain.decryptAndStorePrivateKeyLocally(options, function(err, privateKey) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                // add private key to cached keypair object
                $scope.cachedKeypair.privateKey = privateKey;

                // try empty passphrase
                emailDao.unlock({
                    keypair: $scope.cachedKeypair,
                    passphrase: undefined
                }, function(err) {
                    if (err) {
                        // go to passphrase login screen
                        $scope.goTo('/login-existing');
                        return;
                    }

                    // passphrase is corrent ... go to main app
                    appController._auth.storeCredentials(function(err) {
                        if (err) {
                            return $scope.onError(err);
                        }

                        $scope.goTo('/desktop');
                    });
                });
            });
        };

        $scope.goForward = function() {
            if ($scope.step === 1) {
                $scope.verifyRecoveryToken(function() {
                    $scope.step++;
                    $scope.$apply();
                });
                return;
            }

            if ($scope.step === 2) {
                $scope.decryptAndStorePrivateKeyLocally();
                return;
            }
        };

        $scope.goTo = function(location) {
            $location.path(location);
            $scope.$apply();
        };
    };

    return LoginPrivateKeyDownloadCtrl;
});