'use strict';

var LoginPrivateKeyDownloadCtrl = function($scope, $location, $routeParams, $q, auth, email, keychain) {
    !$routeParams.dev && !auth.isInitialized() && $location.path('/'); // init app

    $scope.step = 1;

    //
    // Token
    //

    $scope.checkToken = function() {
        if ($scope.tokenForm.$invalid) {
            $scope.errMsg = 'Please enter a valid recovery token!';
            return;
        }

        var userId = auth.emailAddress;

        return $q(function(resolve) {
            $scope.busy = true;
            $scope.errMsg = undefined;
            resolve();

        }).then(function() {
            // get public key id for reference
            return keychain.getUserKeyPair(userId);

        }).then(function(keypair) {
            // remember for storage later
            $scope.cachedKeypair = keypair;
            return keychain.downloadPrivateKey({
                userId: userId,
                keyId: keypair.publicKey._id,
                recoveryToken: $scope.recoveryToken.toUpperCase()
            });

        }).then(function(encryptedPrivateKey) {
            $scope.encryptedPrivateKey = encryptedPrivateKey;
            $scope.busy = false;
            $scope.step++;

        }).catch(displayError);
    };

    //
    // Keychain code
    //

    $scope.checkCode = function() {
        if ($scope.codeForm.$invalid) {
            $scope.errMsg = 'Please fill out all required fields!';
            return;
        }

        var options = $scope.encryptedPrivateKey;
        options.code = $scope.code.toUpperCase();

        return $q(function(resolve) {
            $scope.busy = true;
            $scope.errMsg = undefined;
            resolve();

        }).then(function() {
            return keychain.decryptAndStorePrivateKeyLocally(options);

        }).then(function(privateKey) {
            // add private key to cached keypair object
            $scope.cachedKeypair.privateKey = privateKey;
            // try empty passphrase
            return email.unlock({
                keypair: $scope.cachedKeypair,
                passphrase: undefined
            }).catch(function(err) {
                // passphrase incorrct ... go to passphrase login screen
                $scope.goTo('/login-existing');
                throw err;
            });

        }).then(function() {
            // passphrase is corrent ...
            return auth.storeCredentials();

        }).then(function() {
            // continue to main app
            $scope.goTo('/account');

        }).catch(displayError);
    };

    //
    // helper functions
    //

    $scope.goTo = function(location) {
        $location.path(location);
    };

    function displayError(err) {
        $scope.busy = false;
        $scope.incorrect = true;
        $scope.errMsg = err.errMsg || err.message;
    }
};

module.exports = LoginPrivateKeyDownloadCtrl;