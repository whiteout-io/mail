define(function(require) {
    'use strict';

    var appController = require('js/app-controller');

    var SetCredentialsCtrl = function($scope, $location) {
        $scope.login = function() {
            appController._auth.setCredentials({
                emailAddress: $scope.emailAddress,
                password: $scope.password,
                provider: $location.search().provider
            }, function(err) {
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

    return SetCredentialsCtrl;
});