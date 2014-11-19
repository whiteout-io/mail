'use strict';

var appController = require('../app-controller');

var LoginInitialCtrl = function($scope, $location, $routeParams, newsletter) {
    if (!appController._emailDao && !$routeParams.dev) {
        $location.path('/'); // init app
        return;
    }

    if (appController._emailDao) {
        var emailDao = appController._emailDao,
            emailAddress = emailDao._account.emailAddress;
    }

    var termsMsg = 'You must accept the Terms of Service to continue.',
        states = {
            IDLE: 1,
            PROCESSING: 2,
            DONE: 3
        };

    $scope.state.ui = states.IDLE; // initial state

    //
    // scope functions
    //

    /**
     * Continue to key import screen
     */
    $scope.importKey = function() {
        if (!$scope.agree) {
            displayError(new Error(termsMsg));
            return;
        }

        $scope.errMsg = undefined;

        // sing up to newsletter
        newsletter.signup(emailAddress, $scope.newsletter);
        // go to key import
        $location.path('/login-new-device');
    };

    /**
     * Continue to keygen
     */
    $scope.generateKey = function() {
        if (!$scope.agree) {
            displayError(new Error(termsMsg));
            return;
        }

        $scope.errMsg = undefined;

        // sing up to newsletter
        newsletter.signup(emailAddress, $scope.newsletter);
        // go to set keygen screen
        $scope.setState(states.PROCESSING);

        emailDao.unlock({
            passphrase: undefined // generate key without passphrase
        }, function(err) {
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
        });
    };

    $scope.setState = function(state) {
        $scope.state.ui = state;
    };

    function displayError(err) {
        $scope.setState(states.IDLE);
        $scope.errMsg = err.errMsg || err.message;
        $scope.$apply();
    }
};

module.exports = LoginInitialCtrl;