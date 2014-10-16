'use strict';

var appController = require('../app-controller');

var LoginInitialCtrl = function($scope, $location, $routeParams) {
    if (!appController._emailDao && !$routeParams.dev) {
        $location.path('/'); // init app
        return;
    }

    var emailDao = appController._emailDao,
        states, termsMsg = 'You must accept the Terms of Service to continue.';

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
        if (!$scope.state.agree) {
            $scope.onError({
                message: termsMsg
            });
            return;
        }

        // sing up to newsletter
        $scope.signUpToNewsletter();
        // go to key import
        $location.path('/login-new-device');
    };

    /**
     * Continue to keygen
     */
    $scope.generateKey = function() {
        if (!$scope.state.agree) {
            $scope.onError({
                message: termsMsg
            });
            return;
        }

        // sing up to newsletter
        $scope.signUpToNewsletter();
        // go to set keygen screen
        $scope.setState(states.PROCESSING);

        setTimeout(function() {
            emailDao.unlock({
                passphrase: undefined // generate key without passphrase
            }, function(err) {
                if (err) {
                    $scope.setState(states.IDLE);
                    $scope.onError(err);
                    return;
                }

                appController._auth.storeCredentials(function(err) {
                    if (err) {
                        return $scope.onError(err);
                    }

                    $location.path('/desktop');
                    $scope.$apply();
                });
            });
        }, 500);
    };

    /**
     * [signUpToNewsletter description]
     * @param  {Function} callback (optional)
     */
    $scope.signUpToNewsletter = function(callback) {
        if (!$scope.state.newsletter) {
            return;
        }

        var address = emailDao._account.emailAddress;
        var uri = 'https://whiteout.us8.list-manage.com/subscribe/post?u=52ea5a9e1be9e1d194f184158&id=6538e8f09f';

        var formData = new FormData();
        formData.append('EMAIL', address);
        formData.append('b_52ea5a9e1be9e1d194f184158_6538e8f09f', '');

        var xhr = new XMLHttpRequest();
        xhr.open('post', uri, true);

        xhr.onload = function() {
            if (callback) {
                callback(null, xhr);
            }
        };

        xhr.onerror = function(err) {
            if (callback) {
                callback(err);
            }
        };

        xhr.send(formData);
    };

    $scope.setState = function(state) {
        $scope.state.ui = state;
    };
};

module.exports = LoginInitialCtrl;