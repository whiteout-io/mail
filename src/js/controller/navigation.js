define(function() {
    'use strict';

    var NavigationCtrl = function($scope) {
        $scope.navOpen = false;

        $scope.openNav = function() {
            $scope.navOpen = true;
        };

        $scope.closeNav = function() {
            $scope.navOpen = false;
        };
    };

    return NavigationCtrl;
});