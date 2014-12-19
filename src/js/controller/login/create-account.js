'use strict';

var CreateAccountCtrl = function($scope, $location, $routeParams, $q, auth, admin, appConfig) {
    !$routeParams.dev && !auth.isInitialized() && $location.path('/'); // init app

    $scope.createWhiteoutAccount = function() {
        if ($scope.form.$invalid) {
            $scope.errMsg = 'Please fill out all required fields!';
            return;
        }

        var emailAddress = $scope.user + '@' + appConfig.config.wmailDomain;

        return $q(function(resolve) {
            $scope.busy = true;
            $scope.errMsg = undefined; // reset error msg
            resolve();

        }).then(function() {
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
                phone: $scope.phone.replace(/\s+/g, ''), // remove spaces from the phone number
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
};

module.exports = CreateAccountCtrl;