define(function(require) {
    'use strict';

    var angular = require('angular');

    //
    // Controller
    //

    var ReadCtrl = function() {};

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