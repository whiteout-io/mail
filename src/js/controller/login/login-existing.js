'use strict';

var LoginExistingCtrl = function($scope, $location, $routeParams, $q, email, auth, keychain) {
    !$routeParams.dev && !auth.isInitialized() && $location.path('/'); // init app

    $scope.confirmPassphrase = function() {
        if ($scope.form.$invalid) {
            $scope.errMsg = 'Please fill out all required fields!';
            return;
        }

        return $q(function(resolve) {
            $scope.busy = true;
            $scope.errMsg = undefined;
            $scope.incorrect = false;
            resolve();

        }).then(function() {
            // key keypair
            var userId = auth.emailAddress;
            return keychain.getUserKeyPair(userId);

        }).then(function(keypair) {
            // unlock email service
            return email.unlock({
                keypair: keypair,
                passphrase: $scope.passphrase
            });

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
        $scope.incorrect = true;
        $scope.errMsg = err.errMsg || err.message;
    }
};

module.exports = LoginExistingCtrl;