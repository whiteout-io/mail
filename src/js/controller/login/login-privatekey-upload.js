'use strict';

var util = require('crypto-lib').util;

var LoginPrivateKeyUploadCtrl = function($scope, $location, $routeParams, $q, auth, privateKey) {
    !$routeParams.dev && !auth.isInitialized() && $location.path('/'); // init app

    //
    // scope state
    //

    // go to step 1
    $scope.step = 1;
    // generate new code for the user
    $scope.code = util.randomString(24);
    $scope.displayedCode = $scope.code.replace(/.{4}/g, "$&-").replace(/-$/, '');
    // clear input field of any previous artifacts
    $scope.inputCode = '';

    //
    // scope functions
    //

    $scope.encryptAndUploadKey = function() {
        return $q(function(resolve) {
            $scope.busy = true;
            $scope.errMsg = undefined;
            $scope.incorrect = false;
            resolve();

        }).then(function() {
            if ($scope.inputCode.toUpperCase() !== $scope.code) {
                throw new Error('The code does not match. Please go back and check the generated code.');
            }

        }).then(function() {
            // login to imap
            return privateKey.init();

        }).then(function() {
            // encrypt the private key
            return privateKey.encrypt($scope.code);

        }).then(function(encryptedPayload) {
            // set user id to encrypted payload
            encryptedPayload.userId = auth.emailAddress;

            // encrypt private PGP key using code and upload
            return privateKey.upload(encryptedPayload);

        }).then(function() {
            // logout of imap
            return privateKey.destroy();

        }).then(function() {
            // continue to public key verification
            $location.path('/login-verify-public-key');

        }).catch(displayError);
    };

    $scope.goForward = function() {
        $scope.step++;
    };

    $scope.goBack = function() {
        if ($scope.step > 1) {
            $scope.step--;
        }
    };

    //
    // helper functions
    //

    function displayError(err) {
        $scope.busy = false;
        $scope.incorrect = true;
        $scope.errMsg = err.errMsg || err.message;
    }
};

module.exports = LoginPrivateKeyUploadCtrl;