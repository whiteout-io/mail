'use strict';

var StatusDisplayCtrl = function($scope, statusDisplay) {

    // set the show functions
    statusDisplay.showStatus = function(lbl, time) {
        $scope.lastUpdateLbl = lbl;
        $scope.lastUpdate = (time) ? time : '';
    };

    statusDisplay.showSearching = function(state) {
        $scope.searching = state;
    };

};

module.exports = StatusDisplayCtrl;