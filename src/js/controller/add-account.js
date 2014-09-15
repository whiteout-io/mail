define(function(require) {
    'use strict';

    var appCtrl = require('js/app-controller'),
        cfg = require('js/app-config').config;

    var AddAccountCtrl = function($scope, $location, $routeParams) {
        if (!appCtrl._auth && !$routeParams.dev) {
            $location.path('/'); // init app
            return;
        }

        $scope.step = 1;

        $scope.goTo = function(step) {
            $scope.step = step;
        };

        $scope.createWhiteoutAccount = function() {
            if ($scope.form.$invalid) {
                return;
            }

            $scope.busy = true;
            $scope.errMsg = undefined; // reset error msg
            $scope.emailAddress = $scope.user + '@' + cfg.wmailDomain;

            // call REST api
            appCtrl._adminDao.createUser({
                emailAddress: $scope.emailAddress,
                password: $scope.pass,
                //phone: $scope.phone,
                //betaCode: $scope.betaCode
            }, function(err) {
                if (err) {
                    $scope.busy = false;
                    $scope.errMsg = err.errMsg || err.message;
                    $scope.$apply();
                    return;
                }

                // proceed to login
                $scope.login();
            });
        };

        $scope.login = function() {
            // store credentials in memory
            appCtrl._auth.setCredentials({
                provider: 'wmail',
                emailAddress: $scope.emailAddress,
                username: $scope.emailAddress,
                realname: $scope.realname,
                password: $scope.pass,
                imap: cfg.wmail.imap,
                smtp: cfg.wmail.smtp
            });

            // proceed to login and keygen
            $location.path('/login');
            $scope.$apply();
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

    return AddAccountCtrl;
});