define(function(require) {
    'use strict';

    var appController = require('js/app-controller'),
        errorUtil = require('js/util/error');

    var AddAccountCtrl = function($scope, $location) {
        // global state... inherited to all child scopes
        $scope.$root.state = {};
        // attach global error handler
        errorUtil.attachHandler($scope);

        $scope.connectToGoogle = function() {
            appController.fetchOAuthToken(function(err) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                redirect();
            });
        };

        function redirect() {
            $location.path('/login');
            $scope.$apply();
        }
    };

    return AddAccountCtrl;
});