define(function(require) {
    'use strict';

    var appController = require('js/app-controller');

    var LoginCtrl = function($scope, $location) {
        var nextPath = '/desktop';

        if (window.chrome && chrome.identity) {
            // start the main app controller
            appController.fetchOAuthToken('passphrase', function(err) {
                if (err) {
                    console.error(err);
                    return;
                }

                $location.path(nextPath);
                $scope.$apply();
            });
            return;
        }

        $location.path(nextPath);
    };

    return LoginCtrl;
});