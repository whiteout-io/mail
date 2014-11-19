'use strict';

var CreateAccountCtrl = function($scope, $location, $routeParams, auth, admin, appConfig) {
    !$routeParams.dev && !auth.isInitialized() && $location.path('/'); // init app

    $scope.createWhiteoutAccount = function() {
        if ($scope.form.$invalid) {
            $scope.errMsg = 'Please fill out all required fields!';
            return;
        }

        $scope.busy = true;
        $scope.errMsg = undefined; // reset error msg
        var emailAddress = $scope.user + '@' + appConfig.config.wmailDomain;

        // set to state for next view
        auth.setCredentials({
            emailAddress: emailAddress,
            password: $scope.pass,
            realname: $scope.realname
        });

        // call REST api
        admin.createUser({
            emailAddress: emailAddress,
            password: $scope.pass,
            phone: $scope.phone.replace(/\s+/g, ''), // remove spaces from the phone number
            betaCode: $scope.betaCode.toUpperCase()
        }, function(err) {
            $scope.busy = false;

            if (err) {
                $scope.errMsg = err.errMsg || err.message;
                $scope.$apply();
                return;
            }

            // proceed to login and keygen
            $location.path('/validate-phone');
            $scope.$apply();
        });
    };
};

module.exports = CreateAccountCtrl;