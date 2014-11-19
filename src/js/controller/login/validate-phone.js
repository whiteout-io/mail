'use strict';

var appCtrl = require('../app-controller');

var ValidatePhoneCtrl = function($scope, $location, $routeParams, mailConfig) {
    if (!appCtrl._auth && !$routeParams.dev) {
        $location.path('/'); // init app
        return;
    }

    // TODO: move to Account service create function

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
        var address = $scope.state.createAccount.emailAddress;
        return mailConfig.get(address).then(function(config) {
            // store credentials in memory
            appCtrl._auth.setCredentials({
                emailAddress: $scope.state.createAccount.emailAddress,
                username: $scope.state.createAccount.emailAddress,
                realname: $scope.state.createAccount.realname,
                password: $scope.state.createAccount.pass,
                imap: {
                    host: config.imap.hostname,
                    port: parseInt(config.imap.port, 10),
                    secure: config.imap.secure
                },
                smtp: {
                    host: config.smtp.hostname,
                    port: parseInt(config.smtp.port, 10),
                    secure: config.smtp.secure
                }
            });

            // proceed to login and keygen
            $location.path('/login');

        }).catch(function() {
            $scope.busy = false;
            $scope.errMsg = 'Error fetching IMAP settings!';
        });
    };
};

module.exports = ValidatePhoneCtrl;