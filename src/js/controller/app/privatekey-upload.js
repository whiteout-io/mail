'use strict';

var util = require('crypto-lib').util;

var PrivateKeyUploadCtrl = function($scope, keychain, pgp, dialog, auth) {

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
            $scope.checkServerForKey(function(privateKeySynced) {
                if (privateKeySynced) {
                    // close lightbox
                    $scope.state.lightbox = undefined;
                    // show message
                    dialog.info({
                        title: 'Info',
                        message: 'Your PGP key has already been synced.'
                    });
                    return;
                }

                // show sync ui if key is not synced
                $scope.displayUploadUi();
            });
        }
    };

    //
    // scope functions
    //

    $scope.checkServerForKey = function(callback) {
        var keyParams = pgp.getKeyParams();
        keychain.hasPrivateKey({
            userId: keyParams.userId,
            keyId: keyParams._id
        }, function(err, privateKeySynced) {
            if (err) {
                dialog.error(err);
                return;
            }

            if (privateKeySynced) {
                callback(privateKeySynced);
                return;
            }

            callback();
        });
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

    $scope.setDeviceName = function(callback) {
        keychain.setDeviceName($scope.deviceName, callback);
    };

    $scope.encryptAndUploadKey = function(callback) {
        var userId = auth.emailAddress;
        var code = $scope.code;

        // register device to keychain service
        keychain.registerDevice({
            userId: userId
        }, function(err) {
            if (err) {
                dialog.error(err);
                return;
            }

            // encrypt private PGP key using code and upload
            keychain.uploadPrivateKey({
                userId: userId,
                code: code
            }, callback);
        });
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
            $scope.setDeviceName(function(err) {
                if (err) {
                    dialog.error(err);
                    return;
                }

                // show spinner
                $scope.step++;
                $scope.$apply();

                // init key sync
                $scope.encryptAndUploadKey(function(err) {
                    if (err) {
                        dialog.error(err);
                        return;
                    }

                    // close sync dialog
                    $scope.state.privateKeyUpload.toggle(false);
                    // show success message
                    dialog.info({
                        title: 'Success',
                        message: 'Whiteout Keychain setup successful!'
                    });
                });
            });
        }
    };

};

module.exports = PrivateKeyUploadCtrl;