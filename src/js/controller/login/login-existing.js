'use strict';

var LoginExistingCtrl = function($scope, $location, $routeParams, email, auth, keychain) {
    !$routeParams.dev && !auth.isInitialized() && $location.path('/'); // init app

    $scope.confirmPassphrase = function() {
        if ($scope.form.$invalid) {
            $scope.errMsg = 'Please fill out all required fields!';
            return;
        }

        $scope.busy = true;
        $scope.errMsg = undefined;
        $scope.incorrect = false;

        unlockCrypto();
    };

    function unlockCrypto() {
        var userId = auth.emailAddress;
        keychain.getUserKeyPair(userId, function(err, keypair) {
            if (err) {
                displayError(err);
                return;
            }

            email.unlock({
                keypair: keypair,
                passphrase: $scope.passphrase
            }, onUnlock);
        });
    }

    function onUnlock(err) {
        if (err) {
            displayError(err);
            return;
        }

        auth.storeCredentials(function(err) {
            if (err) {
                displayError(err);
                return;
            }

            $location.path('/desktop');
            $scope.$apply();
        });
    }

    function displayError(err) {
        $scope.busy = false;
        $scope.incorrect = true;
        $scope.errMsg = err.errMsg || err.message;
        $scope.$apply();
    }
};

module.exports = LoginExistingCtrl;