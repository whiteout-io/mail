'use strict';

var appController = require('../app-controller');

var LoginPrivateKeyDownloadCtrl = function($scope, $location, $routeParams) {
    if (!appController._emailDao && !$routeParams.dev) {
        $location.path('/'); // init app
        return;
    }

    if (appController._emailDao) {
        var keychain = appController._keychain,
            emailDao = appController._emailDao,
            userId = emailDao._account.emailAddress;
    }

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
        var inputCode = '' + $scope.code0 + $scope.code1 + $scope.code2 + $scope.code3 + $scope.code4 + $scope.code5;

        var options = $scope.encryptedPrivateKey;
        options.code = inputCode.toUpperCase();

        keychain.decryptAndStorePrivateKeyLocally(options, function(err, privateKey) {
            if (err) {
                displayError(err);
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
                        displayError(err);
                        return;
                    }

                    $scope.goTo('/desktop');
                });
            });
        });
    };

    $scope.handlePaste = function(event) {
        var evt = event;
        if (evt.originalEvent) {
            evt = evt.originalEvent;
        }

        var value = evt.clipboardData.getData('text/plain');
        if (!value) {
            return;
        }

        value = value.replace(/-/g, '');
        $scope.code0 = value.slice(0, 4);
        $scope.code1 = value.slice(4, 8);
        $scope.code2 = value.slice(8, 12);
        $scope.code3 = value.slice(12, 16);
        $scope.code4 = value.slice(16, 20);
        $scope.code5 = value.slice(20, 24);
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