'use strict';

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
ngModule.directive('popover', function() {
    return function(scope, elm, attrs) {
        var selector = attrs.popover;
        var popover = angular.element(document.querySelector(selector));

        elm.on('mouseover', function() {
            // set popover position
            var top = elm[0].offsetTop;
            var left = elm[0].offsetLeft;
            var width = elm[0].offsetWidth;
            var height = elm[0].offsetHeight;

            popover[0].style.transition = 'opacity 0.3s linear';
            popover[0].style.top = (top + height / 2 - popover[0].offsetHeight / 2) + 'px';
            popover[0].style.left = (left + width) + 'px';
            popover[0].style.opacity = '1';
        });

        elm.on('mouseout', function() {
            popover[0].style.transition = 'opacity 0.3s linear, top 0.3s step-end, left 0.3s step-end';
            popover[0].style.opacity = '0';
            popover[0].style.top = '-9999px';
            popover[0].style.left = '-9999px';
        });
    };
});

exports = PopoverCtrl;