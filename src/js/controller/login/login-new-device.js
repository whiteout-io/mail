'use strict';

var LoginExistingCtrl = function($scope, $location, $routeParams, $q, email, auth, pgp, keychain, publickeyVerifier) {
    !$routeParams.dev && !auth.isInitialized() && $location.path('/'); // init app

    $scope.incorrect = false;

    var PRIV_KEY_PREFIX = '-----BEGIN PGP PRIVATE KEY BLOCK-----';
    var PUB_KEY_PREFIX = '-----BEGIN PGP PUBLIC KEY BLOCK-----';
    var PRIV_ERR_MSG = 'Cannot find private PGP key block!';

    $scope.pasteKey = function(pasted) {
        var index = pasted.indexOf(PRIV_KEY_PREFIX);
        if (index === -1) {
            $scope.errMsg = PRIV_ERR_MSG;
            return;
        }

        $scope.errMsg = undefined; // reset error msg

        $scope.key = {
            privateKeyArmored: pasted.substring(index, pasted.length).trim()
        };
    };

    $scope.confirmPassphrase = function() {
        if ($scope.form.$invalid || !$scope.key) {
            $scope.errMsg = PRIV_ERR_MSG;
            return;
        }

        var userId = auth.emailAddress,
            pubKeyNeedsVerification = false,
            keypair;

        return $q(function(resolve) {
            $scope.busy = true;
            $scope.errMsg = undefined; // reset error msg
            $scope.incorrect = false;
            resolve();

        }).then(function() {
            // check if user already has a public key on the key server
            return keychain.getUserKeyPair(userId);

        }).then(function(keys) {
            keypair = keys || {};

            // extract public key from private key block if missing in key file
            if (!$scope.key.publicKeyArmored || $scope.key.publicKeyArmored.indexOf(PUB_KEY_PREFIX) < 0) {
                try {
                    $scope.key.publicKeyArmored = pgp.extractPublicKey($scope.key.privateKeyArmored);
                } catch (e) {
                    throw new Error('Cannot find public PGP key!');
                }
            }

            // parse keypair params
            var privKeyParams, pubKeyParams;
            try {
                privKeyParams = pgp.getKeyParams($scope.key.privateKeyArmored);
                pubKeyParams = pgp.getKeyParams($scope.key.publicKeyArmored);
            } catch (e) {
                throw new Error('Error reading key paramaters!');
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
                pubKeyNeedsVerification = true; // this public key needs to be authenticated
            }

            // import and validate keypair
            return email.unlock({
                keypair: keypair,
                passphrase: $scope.passphrase
            }).catch(function(err) {
                $scope.incorrect = true;
                throw err;
            });

        }).then(function(keypair) {
            if (!pubKeyNeedsVerification) {
                // persist credentials and key and go to main account screen
                return keychain.putUserKeyPair(keypair).then(function() {
                    return auth.storeCredentials();
                }).then(function() {
                    $location.path('/account');
                });
            }

            // remember keypair for public key verification
            publickeyVerifier.keypair = keypair;
            // upload private key and then go to public key verification
            $location.path('/login-privatekey-upload');

        }).catch(displayError);
    };

    function displayError(err) {
        $scope.busy = false;
        $scope.errMsg = err.errMsg || err.message;
    }
};

module.exports = LoginExistingCtrl;