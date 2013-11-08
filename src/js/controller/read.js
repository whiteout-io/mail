define(function(require) {
    'use strict';

    var angular = require('angular');

    //
    // Controller
    //

    var ReadCtrl = function($scope) {
        $scope.state.read = {
            open: false,
            toggle: function(to) {
                this.open = to;
            }
        };
    };

    //
    // Directives
    //

    var ngModule = angular.module('read', []);
    ngModule.directive('frameLoad', function() {
        return function(scope, elm) {
            elm.bind('load', function() {
                var frame = elm[0];
                frame.height = frame.contentWindow.document.body.scrollHeight + 'px';
            });
        };
    });

    return ReadCtrl;
});