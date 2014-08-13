define(function(require) {
    'use strict';

    var appCtrl = require('js/app-controller');

    var AddAccountCtrl = function($scope, $location, $routeParams) {
        if (!appCtrl._auth && !$routeParams.dev) {
            $location.path('/'); // init app
            return;
        }

        $scope.connectToGoogle = function() {
            // test for oauth support
            if (appCtrl._auth._oauth.isSupported()) {
                // fetches the email address from the chrome identity api
                appCtrl._auth.getOAuthToken(function(err) {
                    if (err) {
                        return $scope.onError(err);
                    }
                    $location.path('/login-set-credentials').search({
                        provider: 'gmail'
                    });
                    $scope.$apply();
                });
                return;
            }

            // use normal user/password login
            $location.path('/login-set-credentials').search({
                provider: 'gmail'
            });
        };

        $scope.connectToYahoo = function() {
            $location.path('/login-set-credentials').search({
                provider: 'yahoo'
            });
        };

        $scope.connectToTonline = function() {
            $location.path('/login-set-credentials').search({
                provider: 'tonline'
            });
        };

        $scope.connectToOutlook = function() {
            $location.path('/login-set-credentials').search({
                provider: 'outlook'
            });
        };

        $scope.connectToGmx = function() {
            $location.path('/login-set-credentials').search({
                provider: 'gmx'
            });
        };

        $scope.connectToWebde = function() {
            $location.path('/login-set-credentials').search({
                provider: 'webde'
            });
        };

        $scope.connectOther = function() {
            $location.path('/login-set-credentials').search({
                provider: 'custom'
            });
        };
    };

    return AddAccountCtrl;
});