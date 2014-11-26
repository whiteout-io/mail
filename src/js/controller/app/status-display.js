'use strict';

var StatusDisplayCtrl = function($scope, $timeout, statusDisplay) {

    $scope.state.statusDisplay = {
        text: '',
        time: undefined,
        searching: false
    };

    // set the show functions
    statusDisplay.showStatus = function(lbl, time) {
        return $timeout(function() {
            $scope.state.statusDisplay.text = lbl;
            $scope.state.statusDisplay.time = (time) ? time : '';
        });
    };

    statusDisplay.showSearching = function(state) {
        return $timeout(function() {
            $scope.state.statusDisplay.searching = state;
        });
    };

};

module.exports = StatusDisplayCtrl;