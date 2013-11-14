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

        var emailDao = appController._emailDao;

        $scope.incorrect = false;

        $scope.confirmPassphrase = function() {
            if (!$scope.passphrase) {
                $scope.incorrect = true;
                return;
            }

            $scope.incorrect = false;
            unlockCrypto();
        };

        function unlockCrypto() {
            var userId = emailDao._account.emailAddress;
            emailDao._keychain.getUserKeyPair(userId, function(err, keypair) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                keypair.privateKey = {
                    _id: keypair.publicKey._id,
                    userId: userId,
                    encryptedKey: $scope.key.privateKeyArmored
                };

                emailDao.unlock(keypair, $scope.passphrase, function(err) {
                    if (err) {
                        $scope.incorrect = true;
                        $scope.onError(err);
                        $scope.$apply();
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