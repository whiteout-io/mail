'use strict';

var cfg = require('../app-config').config;

//
// Controller
//

var AboutCtrl = function($scope) {

    $scope.state.about = {
        toggle: function(to) {
            $scope.state.lightbox = (to) ? 'about' : undefined;
        }
    };

    //
    // scope variables
    //

    $scope.version = cfg.appVersion;
    $scope.date = new Date();

    //
    // scope functions
    //
};

module.exports = AboutCtrl;