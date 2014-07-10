define(function(require) {
    'use strict';

    var appController = require('js/app-controller');

    var AddAccountCtrl = function($scope, $location) {
        $scope.connectToGoogle = function() {
            appController._auth.setCredentials({
                provider: 'gmail'
            }, function(err) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                $location.path('/login');
                $scope.$apply();
            });
        };

        $scope.connectToYahoo = function() {
            $location.path('/set-credentials').search({
                provider: 'yahoo'
            });
        };

        $scope.connectToTonline = function() {
            $location.path('/set-credentials').search({
                provider: 'tonline'
            });
        };

        $scope.connectOther = function() {
            $location.path('/set-credentials').search({
                provider: 'custom'
            });
        };
    };

    return AddAccountCtrl;
});