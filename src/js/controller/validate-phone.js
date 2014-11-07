'use strict';

var appCtrl = require('../app-controller'),
    cfg = require('../app-config').config;

var ValidatePhoneCtrl = function($scope, $location, $routeParams) {
    if (!appCtrl._auth && !$routeParams.dev) {
        $location.path('/'); // init app
        return;
    }

    $scope.validateUser = function() {
        if ($scope.formValidate.$invalid) {
            return;
        }

        $scope.busyValidate = true;
        $scope.errMsgValidate = undefined; // reset error msg

        // verify user to REST api
        appCtrl._adminDao.validateUser({
            emailAddress: $scope.emailAddress,
            token: $scope.token.toUpperCase()
        }, function(err) {
            if (err) {
                $scope.busyValidate = false;
                $scope.errMsgValidate = err.errMsg || err.message;
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
};

module.exports = ValidatePhoneCtrl;