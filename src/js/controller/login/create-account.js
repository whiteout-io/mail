'use strict';

var CreateAccountCtrl = function($scope, $location, $routeParams, $q, auth, admin, appConfig, dialog) {
    !$routeParams.dev && !auth.isInitialized() && $location.path('/'); // init app

    // init phone region
    $scope.region = 'DE';
    $scope.domain = '@' + appConfig.config.mailServer.domain;

    $scope.showConfirm = function() {
        if ($scope.form.$invalid) {
            $scope.errMsg = 'Please fill out all required fields!';
            return;
        }

        return dialog.confirm({
            title: 'SMS validation',
            message: 'Your mobile phone number will be validated via SMS. Are you sure it\'s correct?',
            positiveBtnStr: 'Yes',
            negativeBtnStr: 'Check again',
            showNegativeBtn: true,
            callback: function(granted) {
                if (granted) {
                    $scope.createWhiteoutAccount();
                }
            }
        });
    };

    $scope.createWhiteoutAccount = function() {
        return $q(function(resolve) {
            $scope.busy = true;
            $scope.errMsg = undefined; // reset error msg
            resolve();

        }).then(function() {
            // read form values
            var emailAddress = $scope.user + $scope.domain;
            var phone = PhoneNumber.Parse($scope.dial, $scope.region);
            if (!phone || !phone.internationalNumber) {
                throw new Error('Invalid phone number!');
            }

            // set to state for next view
            auth.setCredentials({
                emailAddress: emailAddress,
                password: $scope.pass,
                realname: $scope.realname
            });

            // call REST api
            return admin.createUser({
                emailAddress: emailAddress,
                password: $scope.pass,
                phone: phone.internationalNumber,
                betaCode: $scope.betaCode.toUpperCase()
            });

        }).then(function() {
            $scope.busy = false;
            // proceed to login and keygen
            $location.path('/validate-phone');

        }).catch(function(err) {
            $scope.busy = false;
            $scope.errMsg = err.errMsg || err.message;
        });
    };

    $scope.loginToExisting = function() {
        // set server config
        $scope.state.login = {
            mailConfig: appConfig.config.mailServer
        };
        // proceed to login
        $location.path('/login-set-credentials');
    };
};

module.exports = CreateAccountCtrl;