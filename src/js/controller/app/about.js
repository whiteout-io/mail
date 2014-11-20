'use strict';

var AboutCtrl = function($scope, appConfig) {

    $scope.state.about = {
        toggle: function(to) {
            $scope.state.lightbox = (to) ? 'about' : undefined;
        }
    };

    //
    // scope variables
    //

    $scope.version = appConfig.config.appVersion + ' (beta)';
    $scope.date = new Date();

    //
    // scope functions
    //
};

module.exports = AboutCtrl;