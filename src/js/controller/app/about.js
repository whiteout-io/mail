'use strict';

var AboutCtrl = function($scope, appConfig) {

    //
    // scope state
    //

    $scope.state.about = {
        toggle: function(to) {
            $scope.state.lightbox = (to) ? 'about' : undefined;
        }
    };

    //
    // scope variables
    //

    $scope.version = appConfig.config.appVersion;
    $scope.date = new Date();

};

module.exports = AboutCtrl;