'use strict';

var appCtrl = require('../app-controller'),
    cfg = require('../app-config').config;

var ValidatePhoneCtrl = function($scope, $location, $routeParams) {
    if (!appCtrl._auth && !$routeParams.dev) {
        $location.path('/'); // init app
        return;
    }

    $scope.validateUser = function() {
        if ($scope.form.$invalid) {
            $scope.errMsg = 'Please fill out all required fields!';
            return;
        }

        $scope.busy = true;
        $scope.errMsg = undefined; // reset error msg

        // verify user to REST api
        appCtrl._adminDao.validateUser({
            emailAddress: $scope.state.createAccount.emailAddress,
            token: $scope.token.toUpperCase()
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
            emailAddress: $scope.state.createAccount.emailAddress,
            username: $scope.state.createAccount.emailAddress,
            realname: $scope.state.createAccount.realname,
            password: $scope.state.createAccount.pass,
            imap: cfg.wmail.imap,
            smtp: cfg.wmail.smtp
        });

        // proceed to login and keygen
        $location.path('/login');
        $scope.$apply();
    };
};

module.exports = ValidatePhoneCtrl;