'use strict';

var LoginInitialCtrl = function($scope, $location, $routeParams, $q, newsletter, email, auth, publickeyVerifier) {
    !$routeParams.dev && !auth.isInitialized() && $location.path('/'); // init app

    var emailAddress = auth.emailAddress;

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

        // sing up to newsletter
        newsletter.signup(emailAddress, $scope.newsletter);
        // go to set keygen screen
        $scope.setState(states.PROCESSING);

        return $q(function(resolve) {
            $scope.errMsg = undefined;
            resolve();

        }).then(function() {
            // generate key without passphrase
            return email.unlock({
                realname: auth.realname,
                passphrase: undefined
            });

        }).then(function(keypair) {
            // remember keypair for storing after public key verification
            publickeyVerifier.keypair = keypair;
            $location.path('/login-privatekey-upload');

        }).catch(displayError);
    };

    $scope.setState = function(state) {
        $scope.state.ui = state;
    };

    function displayError(err) {
        $scope.setState(states.IDLE);
        $scope.errMsg = err.errMsg || err.message;
    }
};

module.exports = LoginInitialCtrl;