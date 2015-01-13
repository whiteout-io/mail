'use strict';

var CreateAccountCtrl = function($scope, $location, $routeParams, $q, auth, admin, appConfig) {
    !$routeParams.dev && !auth.isInitialized() && $location.path('/'); // init app

    // init phone region
    $scope.region = 'DE';

    $scope.createWhiteoutAccount = function() {
        if ($scope.form.$invalid) {
            $scope.errMsg = 'Please fill out all required fields!';
            return;
        }

        return $q(function(resolve) {
            $scope.busy = true;
            $scope.errMsg = undefined; // reset error msg
            resolve();

        }).then(function() {
            // read form values
            var emailAddress = $scope.user + '@' + appConfig.config.wmailDomain;
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
};

module.exports = CreateAccountCtrl;