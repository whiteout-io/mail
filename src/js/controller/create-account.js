'use strict';

var appCtrl = require('../app-controller'),
    cfg = require('../app-config').config;

var CreateAccountCtrl = function($scope, $location, $routeParams) {
    if (!appCtrl._auth && !$routeParams.dev) {
        $location.path('/'); // init app
        return;
    }

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