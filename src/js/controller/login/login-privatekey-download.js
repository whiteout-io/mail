'use strict';

var LoginPrivateKeyDownloadCtrl = function($scope, $location, $routeParams, auth, email, keychain) {
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

        $scope.busy = true;
        $scope.errMsg = undefined;

        $scope.verifyRecoveryToken(function() {
            $scope.busy = false;
            $scope.errMsg = undefined;
            $scope.step++;
            $scope.$apply();
        });
    };

    $scope.verifyRecoveryToken = function(callback) {
        var userId = auth.emailAddress;
        keychain.getUserKeyPair(userId, function(err, keypair) {
            if (err) {
                displayError(err);
                return;
            }

            // remember for storage later
            $scope.cachedKeypair = keypair;

            keychain.downloadPrivateKey({
                userId: userId,
                keyId: keypair.publicKey._id,
                recoveryToken: $scope.recoveryToken.toUpperCase()
            }, function(err, encryptedPrivateKey) {
                if (err) {
                    displayError(err);
                    return;
                }

                $scope.encryptedPrivateKey = encryptedPrivateKey;
                callback();
            });
        });
    };

    //
    // Keychain code
    //

    $scope.checkCode = function() {
        if ($scope.codeForm.$invalid) {
            $scope.errMsg = 'Please fill out all required fields!';
            return;
        }

        $scope.busy = true;
        $scope.errMsg = undefined;

        $scope.decryptAndStorePrivateKeyLocally();
    };

    $scope.decryptAndStorePrivateKeyLocally = function() {
        var options = $scope.encryptedPrivateKey;
        options.code = $scope.code.toUpperCase();

        keychain.decryptAndStorePrivateKeyLocally(options, function(err, privateKey) {
            if (err) {
                displayError(err);
                return;
            }

            // add private key to cached keypair object
            $scope.cachedKeypair.privateKey = privateKey;

            // try empty passphrase
            email.unlock({
                keypair: $scope.cachedKeypair,
                passphrase: undefined
            }, function(err) {
                if (err) {
                    // go to passphrase login screen
                    $scope.goTo('/login-existing');
                    return;
                }

                // passphrase is corrent ... go to main app
                auth.storeCredentials(function(err) {
                    if (err) {
                        displayError(err);
                        return;
                    }

                    $scope.goTo('/desktop');
                });
            });
        });
    };

    //
    // helper functions
    //

    $scope.goTo = function(location) {
        $location.path(location);
        $scope.$apply();
    };

    function displayError(err) {
        $scope.busy = false;
        $scope.incorrect = true;
        $scope.errMsg = err.errMsg || err.message;
        $scope.$apply();
    }
};

module.exports = LoginPrivateKeyDownloadCtrl;