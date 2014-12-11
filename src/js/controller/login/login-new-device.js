'use strict';

var LoginExistingCtrl = function($scope, $location, $routeParams, email, auth, pgp, keychain) {
    !$routeParams.dev && !auth.isInitialized() && $location.path('/'); // init app

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
        var userId = auth.emailAddress;
        // check if user already has a public key on the key server
        keychain.getUserKeyPair(userId, function(err, keypair) {
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
            email.unlock({
                keypair: keypair,
                passphrase: $scope.passphrase
            }, function(err) {
                if (err) {
                    $scope.incorrect = true;
                    $scope.displayError(err);
                    return;
                }

                keychain.putUserKeyPair(keypair, onUnlock);
            });
        });
    }

    function onUnlock(err) {
        if (err) {
            $scope.displayError(err);
            return;
        }

        auth.storeCredentials(function(err) {
            if (err) {
                $scope.displayError(err);
                return;
            }

            $location.path('/account');
            $scope.$apply();
        });
    }

    $scope.displayError = function(err) {
        $scope.busy = false;
        $scope.errMsg = err.errMsg || err.message;
        $scope.$apply();
    };
};

module.exports = LoginExistingCtrl;