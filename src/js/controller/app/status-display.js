'use strict';

var StatusDisplayCtrl = function($scope, statusDisplay) {

    // set the show functions
    statusDisplay.showStatus = updateStatus;
    statusDisplay.showSearching = setSearching;

    function updateStatus(lbl, time) {
        $scope.lastUpdateLbl = lbl;
        $scope.lastUpdate = (time) ? time : '';
    }

    function setSearching(state) {
        $scope.searching = state;
    }

};

module.exports = StatusDisplayCtrl;