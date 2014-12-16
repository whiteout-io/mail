'use strict';

var LoginExistingCtrl = function($scope, $location, $routeParams, $q, email, auth, pgp, keychain) {
    !$routeParams.dev && !auth.isInitialized() && $location.path('/'); // init app

    $scope.incorrect = false;

    $scope.confirmPassphrase = function() {
        if ($scope.form.$invalid || !$scope.key) {
            $scope.errMsg = 'Please fill out all required fields!';
            return;
        }

        var userId = auth.emailAddress,
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
            if (!$scope.key.publicKeyArmored || $scope.key.publicKeyArmored.indexOf('-----BEGIN PGP PUBLIC KEY BLOCK-----') < 0) {
                try {
                    $scope.key.publicKeyArmored = pgp.extractPublicKey($scope.key.privateKeyArmored);
                } catch (e) {
                    throw new Error('Error reading PGP key!');
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
            }

            // import and validate keypair
            return email.unlock({
                keypair: keypair,
                passphrase: $scope.passphrase
            }).catch(function(err) {
                $scope.incorrect = true;
                throw err;
            });

        }).then(function() {
            // perist keys locally
            return keychain.putUserKeyPair(keypair);

        }).then(function() {
            // persist credentials locally
            return auth.storeCredentials();

        }).then(function() {
            // go to main account screen
            $location.path('/account');

        }).catch(displayError);
    };

    function displayError(err) {
        $scope.busy = false;
        $scope.errMsg = err.errMsg || err.message;
    }
};

module.exports = LoginExistingCtrl;