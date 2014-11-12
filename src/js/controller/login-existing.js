'use strict';

var appController = require('../app-controller');

var LoginExistingCtrl = function($scope, $location, $routeParams) {
    if (!appController._emailDao && !$routeParams.dev) {
        $location.path('/'); // init app
        return;
    }

    var emailDao = appController._emailDao;

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
        var userId = emailDao._account.emailAddress;
        emailDao._keychain.getUserKeyPair(userId, function(err, keypair) {
            if (err) {
                displayError(err);
                return;
            }

            emailDao.unlock({
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

        appController._auth.storeCredentials(function(err) {
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