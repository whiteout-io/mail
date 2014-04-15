define(function(require) {
    'use strict';

    var cfg = require('js/app-config').config;

    //
    // Controller
    //

    var AboutCtrl = function($scope) {

        $scope.state.about = {
            open: false,
            toggle: function(to) {
                this.open = to;
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

    return AboutCtrl;
});