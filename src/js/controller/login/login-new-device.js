'use strict';

var appController = require('../app-controller');

var LoginExistingCtrl = function($scope, $location, $routeParams) {
    if (!appController._emailDao && !$routeParams.dev) {
        $location.path('/'); // init app
        return;
    }

    var emailDao = appController._emailDao,
        pgp = appController._pgp;

    $scope.incorrect = false;

    $scope.confirmPassphrase = function() {
        if ($scope.form.$invalid || !$scope.key) {
            $scope.errMsg = 'Please fill out all required fields!';
            return;
        }

        $scope.busy = true;
        $scope.errMsg = undefined; // reset error msg
        $scope.incorrect = false;

        unlockCrypto();
    };

    function unlockCrypto() {
        var userId = emailDao._account.emailAddress;
        // check if user already has a public key on the key server
        emailDao._keychain.getUserKeyPair(userId, function(err, keypair) {
            if (err) {
                $scope.displayError(err);
                return;
            }

            keypair = keypair || {};

            // extract public key from private key block if missing in key file
            if (!$scope.key.publicKeyArmored || $scope.key.publicKeyArmored.indexOf('-----BEGIN PGP PUBLIC KEY BLOCK-----') < 0) {
                try {
                    $scope.key.publicKeyArmored = pgp.extractPublicKey($scope.key.privateKeyArmored);
                } catch (e) {
                    $scope.displayError(new Error('Error reading PGP key!'));
                    return;
                }
            }

            // parse keypair params
            var privKeyParams, pubKeyParams;
            try {
                privKeyParams = pgp.getKeyParams($scope.key.privateKeyArmored);
                pubKeyParams = pgp.getKeyParams($scope.key.publicKeyArmored);
            } catch (e) {
                $scope.displayError(new Error('Error reading key params!'));
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
                    $scope.displayError(err);
                    return;
                }

                emailDao._keychain.putUserKeyPair(keypair, onUnlock);
            });
        });
    }

    function onUnlock(err) {
        if (err) {
            $scope.displayError(err);
            return;
        }

        appController._auth.storeCredentials(function(err) {
            if (err) {
                $scope.displayError(err);
                return;
            }

            $location.path('/desktop');
            $scope.$apply();
        });
    }

    $scope.displayError = function(err) {
        $scope.busy = false;
        $scope.errMsg = err.errMsg || err.message;
        $scope.$apply();
    };
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
                    index = rawKeys.indexOf('-----BEGIN PGP PRIVATE KEY BLOCK-----'),
                    keyParts;

                if (index === -1) {
                    scope.displayError(new Error('Error parsing private PGP key block!'));
                    return;
                }

                keyParts = {
                    publicKeyArmored: rawKeys.substring(0, index).trim(),
                    privateKeyArmored: rawKeys.substring(index, rawKeys.length).trim()
                };

                scope.$apply(function() {
                    scope.key = keyParts;
                });
            };
            reader.readAsText(files[0]);
        });
    };
});

module.exports = LoginExistingCtrl;