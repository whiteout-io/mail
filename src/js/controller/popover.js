define(function(require) {
    'use strict';

    var angular = require('angular');

    //
    // Controller
    //

    var PopoverCtrl = function($scope) {
        $scope.state.popover = {};
    };

    //
    // Directives
    //

    var ngModule = angular.module('popover', []);
    ngModule.directive('popover', function($parse) {
        return function(scope, elm, attrs) {
            var popover = angular.element(document.querySelector('.popover'));

            elm.on('mouseover', function() {
                var model = $parse(attrs.popover);
                scope.$watch(model, function(value) {
                    // set popover title and content
                    scope.state.popover.title = attrs.popoverTitle;
                    scope.state.popover.content = value;

                    // set popover position
                    var top = elm[0].offsetTop;
                    var left = elm[0].offsetLeft;
                    var width = elm[0].offsetWidth;
                    var height = elm[0].offsetHeight;

                    popover[0].style.top = (top + height / 2 - popover[0].offsetHeight / 2) + 'px';
                    popover[0].style.left = (left + width) + 'px';
                    popover[0].style.opacity = '1';
                });
            });

            elm.on('mouseout', function() {
                popover[0].style.opacity = '0';
            });
        };
    });

    return PopoverCtrl;
});