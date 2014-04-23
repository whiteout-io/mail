define(function(require) {
    'use strict';

    var appController = require('js/app-controller');

    var AddAccountCtrl = function($scope, $location) {
        $scope.connectToGoogle = function() {
            appController._auth.getCredentials({}, function(err) {
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