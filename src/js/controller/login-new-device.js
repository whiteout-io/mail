define(function(require) {
    'use strict';

    var angular = require('angular'),
        errorUtil = require('js/util/error'),
        appController = require('js/app-controller');

    var LoginExistingCtrl = function($scope, $location) {
        // global state... inherited to all child scopes
        $scope.$root.state = {};
        // attach global error handler
        errorUtil.attachHandler($scope);

        var emailDao = appController._emailDao,
            pgp = appController._crypto;

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

                // set parsed private key
                keypair.privateKey = {
                    _id: pgp.getKeyId($scope.key.privateKeyArmored),
                    userId: userId,
                    encryptedKey: $scope.key.privateKeyArmored
                };

                if (!keypair.publicKey) {
                    // there is no public key on the key server yet... use parsed
                    keypair.publicKey = {
                        _id: pgp.getKeyId($scope.key.publicKeyArmored),
                        userId: userId,
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
                        index = rawKeys.indexOf('-----BEGIN PGP PRIVATE KEY BLOCK-----');

                    if (index === -1) {
                        console.error('Erroneous key file format!');
                        return;
                    }

                    scope.key = {
                        publicKeyArmored: rawKeys.substring(0, index),
                        privateKeyArmored: rawKeys.substring(index, rawKeys.length)
                    };
                    scope.$apply();
                };
                reader.readAsText(files[0]);
            });
        };
    });

    return LoginExistingCtrl;
});