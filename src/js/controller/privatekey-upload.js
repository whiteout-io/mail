define(function(require) {
    'use strict';

    var appController = require('js/app-controller'),
        keychain, pgp;

    var PrivateKeyUploadCtrl = function($scope) {
        keychain = appController._keychain;
        pgp = keychain._pgp;

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
                        $scope.onError({
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

        $scope.checkServerForKey = function(callback) {
            var keyParams = pgp.getKeyParams();
            keychain.requestPrivateKeyDownload({
                userId: keyParams.userId,
                keyId: keyParams._id,
            }, function(err, privateKeySynced) {
                if (err) {
                    $scope.onError(err);
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
            $scope.code = $scope.generateCode();
            $scope.displayedCode = $scope.code.slice(0, 4) + '-' + $scope.code.slice(4, 8) + '-' + $scope.code.slice(8, 12) + '-' + $scope.code.slice(12, 16) + '-' + $scope.code.slice(16, 20) + '-' + $scope.code.slice(20, 24);

            // clear input fields of any previous artifacts
            $scope.code0 = $scope.code1 = $scope.code2 = $scope.code3 = $scope.code4 = $scope.code5 = '';
        };

        $scope.generateCode = function() {
            function randomString(length, chars) {
                var result = '';
                var randomValues = new Uint8Array(length); // get random length number of bytes
                window.crypto.getRandomValues(randomValues);
                for (var i = 0; i < length; i++) {
                    result += chars[Math.round(randomValues[i] / 255 * (chars.length - 1))];
                }
                return result;
            }
            return randomString(24, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        };

        $scope.verifyCode = function() {
            var inputCode = '' + $scope.code0 + $scope.code1 + $scope.code2 + $scope.code3 + $scope.code4 + $scope.code5;

            if (inputCode.toUpperCase() !== $scope.code) {
                var err = new Error('The code does not match. Please go back and check the generated code.');
                err.sync = true;
                $scope.onError(err);
                return false;
            }

            return true;
        };

        $scope.setDeviceName = function(callback) {
            keychain.setDeviceName($scope.deviceName, callback);
        };

        $scope.encryptAndUploadKey = function(callback) {
            var userId = appController._emailDao._account.emailAddress;
            var code = $scope.code;

            // register device to keychain service
            keychain.registerDevice({
                userId: userId
            }, function(err) {
                if (err) {
                    $scope.onError(err);
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
                        $scope.onError(err);
                        return;
                    }

                    // show spinner
                    $scope.step++;
                    $scope.$apply();

                    // init key sync
                    $scope.encryptAndUploadKey(function(err) {
                        if (err) {
                            $scope.onError(err);
                            return;
                        }

                        // close sync dialog
                        $scope.state.privateKeyUpload.toggle(false);
                        // show success message
                        $scope.onError({
                            title: 'Success',
                            message: 'Whiteout Keychain setup successful!'
                        });
                    });
                });
            }
        };

    };

    return PrivateKeyUploadCtrl;
});