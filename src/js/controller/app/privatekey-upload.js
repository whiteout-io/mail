'use strict';

var util = require('crypto-lib').util;

var PrivateKeyUploadCtrl = function($scope, $q, keychain, pgp, dialog, auth) {

    //
    // scope state
    //

    $scope.state.privateKeyUpload = {
        toggle: function(to) {
            // open lightbox
            $scope.state.lightbox = (to) ? 'privatekey-upload' : undefined;
            if (!to) {
                return;
            }

            // show syncing status
            $scope.step = 4;
            // check if key is already synced
            return $scope.checkServerForKey().then(function(privateKeySynced) {
                if (privateKeySynced) {
                    // close lightbox
                    $scope.state.lightbox = undefined;
                    // show message
                    return dialog.info({
                        title: 'Info',
                        message: 'Your PGP key has already been synced.'
                    });
                }

                // show sync ui if key is not synced
                $scope.displayUploadUi();
            });
        }
    };

    //
    // scope functions
    //

    $scope.checkServerForKey = function() {
        var keyParams = pgp.getKeyParams();

        return $q(function(resolve) {
            resolve();

        }).then(function() {
            return keychain.hasPrivateKey({
                userId: keyParams.userId,
                keyId: keyParams._id
            });

        }).catch(dialog.error);
    };

    $scope.displayUploadUi = function() {
        // go to step 1
        $scope.step = 1;
        // generate new code for the user
        $scope.code = util.randomString(24);
        $scope.displayedCode = $scope.code.slice(0, 4) + '-' + $scope.code.slice(4, 8) + '-' + $scope.code.slice(8, 12) + '-' + $scope.code.slice(12, 16) + '-' + $scope.code.slice(16, 20) + '-' + $scope.code.slice(20, 24);

        // clear input field of any previous artifacts
        $scope.inputCode = '';
    };

    $scope.verifyCode = function() {
        if ($scope.inputCode.toUpperCase() !== $scope.code) {
            var err = new Error('The code does not match. Please go back and check the generated code.');
            dialog.error(err);
            return false;
        }

        return true;
    };

    $scope.setDeviceName = function() {
        return $q(function(resolve) {
            resolve();

        }).then(function() {
            return keychain.setDeviceName($scope.deviceName);
        });
    };

    $scope.encryptAndUploadKey = function() {
        var userId = auth.emailAddress;
        var code = $scope.code;

        // register device to keychain service
        return $q(function(resolve) {
            resolve();

        }).then(function() {
            // register the device
            return keychain.registerDevice({
                userId: userId
            });

        }).then(function() {
            // encrypt private PGP key using code and upload
            return keychain.uploadPrivateKey({
                userId: userId,
                code: code
            });

        }).catch(dialog.error);
    };

    $scope.goBack = function() {
        if ($scope.step > 1) {
            $scope.step--;
        }
    };

    $scope.goForward = function() {
        if ($scope.step < 2) {
            $scope.step++;
            return;
        }

        if ($scope.step === 2 && $scope.verifyCode()) {
            $scope.step++;
            return;
        }

        if ($scope.step === 3) {
            // set device name to local storage
            return $scope.setDeviceName().then(function() {
                // show spinner
                $scope.step++;
                // init key sync
                return $scope.encryptAndUploadKey();

            }).then(function() {
                // close sync dialog
                $scope.state.privateKeyUpload.toggle(false);
                // show success message
                dialog.info({
                    title: 'Success',
                    message: 'Whiteout Keychain setup successful!'
                });

            }).catch(dialog.error);
        }
    };

};

module.exports = PrivateKeyUploadCtrl;