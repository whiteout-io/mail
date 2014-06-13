define(function(require) {
    'use strict';

    var angular = require('angular'),
        appController = require('js/app-controller');

    var LoginExistingCtrl = function($scope, $location) {
        var emailDao = appController._emailDao,
            pgp = appController._pgp;

        $scope.incorrect = false;

        $scope.confirmPassphrase = function() {
            $scope.incorrect = false;
            unlockCrypto();
        };

        function unlockCrypto() {
            var userId = emailDao._account.emailAddress;
            // check if user already has a public key on the key server
            emailDao._keychain.getUserKeyPair(userId, function(err, keypair) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                keypair = keypair || {};

                var privKeyParams, pubKeyParams;
                try {
                    privKeyParams = pgp.getKeyParams($scope.key.privateKeyArmored);
                    pubKeyParams = pgp.getKeyParams($scope.key.publicKeyArmored);
                } catch (e) {
                    $scope.onError(new Error('Error reading key params!'));
                    return;
                }

                // set parsed private key
                keypair.privateKey = {
                    _id: privKeyParams._id,
                    userId: userId,
                    userIds: privKeyParams.userIds,
                    encryptedKey: $scope.key.privateKeyArmored
                };

                if (!keypair.publicKey) {
                    // there is no public key on the key server yet... use parsed
                    keypair.publicKey = {
                        _id: pubKeyParams._id,
                        userId: userId,
                        userIds: pubKeyParams.userIds,
                        publicKey: $scope.key.publicKeyArmored
                    };
                }

                // import and validate keypair
                emailDao.unlock({
                    keypair: keypair,
                    passphrase: $scope.passphrase
                }, function(err) {
                    if (err) {
                        $scope.incorrect = true;
                        $scope.onError(err);
                        return;
                    }

                    emailDao._keychain.putUserKeyPair(keypair, onUnlock);
                });
            });
        }

        function onUnlock(err) {
            if (err) {
                $scope.onError(err);
                return;
            }

            $location.path('/desktop');
            $scope.$apply();
        }
    };

    var ngModule = angular.module('login-new-device', []);
    ngModule.directive('fileReader', function() {
        return function(scope, elm) {
            elm.bind('change', function(e) {
                var files = e.target.files,
                    reader = new FileReader();

                if (files.length === 0) {
                    return;
                }

                reader.onload = function(e) {
                    var rawKeys = e.target.result,
                        privKeyPrexix = '-----BEGIN PGP PRIVATE KEY BLOCK-----',
                        pubKeyPrefix = '-----BEGIN PGP PUBLIC KEY BLOCK-----',
                        index = rawKeys.indexOf(privKeyPrexix),
                        errMsg = 'Keyfile must be formatted like so:\n' + pubKeyPrefix + '\n ... \n' + privKeyPrexix,
                        keyParts;

                    if (index === -1) {
                        scope.onError(new Error(errMsg));
                        return;
                    }

                    keyParts = {
                        publicKeyArmored: rawKeys.substring(0, index).trim(),
                        privateKeyArmored: rawKeys.substring(index, rawKeys.length).trim()
                    };

                    if (keyParts.publicKeyArmored.indexOf(pubKeyPrefix) < 0 || keyParts.privateKeyArmored.indexOf(privKeyPrexix) < 0) {
                        scope.onError(new Error(errMsg));
                        return;
                    }

                    scope.$apply(function() {
                        scope.key = keyParts;
                    });
                };
                reader.readAsText(files[0]);
            });
        };
    });

    return LoginExistingCtrl;
});