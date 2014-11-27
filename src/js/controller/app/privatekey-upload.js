'use strict';

var util = require('crypto-lib').util;

var PrivateKeyUploadCtrl = function($scope, keychain, pgp, dialog, auth) {

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

        // clear input fields of any previous artifacts
        $scope.code0 = $scope.code1 = $scope.code2 = $scope.code3 = $scope.code4 = $scope.code5 = '';
    };

    $scope.verifyCode = function() {
        var inputCode = '' + $scope.code0 + $scope.code1 + $scope.code2 + $scope.code3 + $scope.code4 + $scope.code5;

        if (inputCode.toUpperCase() !== $scope.code) {
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

//
// Directives
//

var ngModule = angular.module('privatekey-upload', []);
ngModule.directive('focusNext', function() {
    return {
        link: function(scope, element, attr) {
            var maxLen = element[0].maxLength;

            scope.$watch(attr.ngModel, function(val) {
                if (val && val.length === maxLen) {
                    var nextinput = element.next('input');
                    if (nextinput.length) {
                        nextinput[0].focus();
                    }
                }
            });
        }
    };
});

module.exports = PrivateKeyUploadCtrl;