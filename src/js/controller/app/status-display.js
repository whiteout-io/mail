'use strict';

var StatusDisplayCtrl = function($scope) {

    $scope.$on('status', function(e, text, time) {
        $scope.text = text;
        $scope.time = (time) ? time : '';
    });

    $scope.$on('searching', function(e, state) {
        $scope.searching = state;
    });

};

module.exports = StatusDisplayCtrl;