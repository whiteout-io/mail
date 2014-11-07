'use strict';

var appCtrl = require('../app-controller'),
    cfg = require('../app-config').config;

var AddAccountCtrl = function($scope, $location, $routeParams, $http) {
    if (!appCtrl._auth && !$routeParams.dev) {
        $location.path('/'); // init app
        return;
    }

    $scope.getAccountSettings = function() {
        if ($scope.form.$invalid) {
            return;
        }

        $scope.busy = true;
        $scope.errMsg = undefined; // reset error msg

        var domain = $scope.emailAddress.split('@')[1];
        var url = cfg.settingsUrl + domain;

        $http.get(url).success(function(config) {
            $scope.busy = false;
            $scope.state.mailConfig = config;
            $scope.state.emailAddress = $scope.emailAddress;

            // check for gmail/oauth server
            var hostname = config.imap.hostname;
            if (hostname.match(/.gmail.com$/) || hostname.match(/.googlemail.com$/)) {
                $scope.connectToGoogle();
                return;
            }

        }).error(function() {
            $scope.busy = false;
            $scope.errMsg = 'Error getting IMAP settings for that email address!';
        });
    };

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

    $scope.connectTo = function(provider) {
        $location.path('/login-set-credentials').search({
            provider: provider
        });
    };
};

module.exports = AddAccountCtrl;