'use strict';

var ngModule = angular.module('woDirectives', []);

ngModule.directive('woTouch', function($parse) {
    var className = 'wo-touch-active';

    return function(scope, elm, attrs) {
        var handler = $parse(attrs.woTouch);

        elm.on('touchstart', function() {
            elm.addClass(className);
        });
        elm.on('touchleave touchcancel touchmove touchend', function() {
            elm.removeClass(className);
        });

        elm.on('click', function(event) {
            elm.removeClass(className);
            scope.$apply(function() {
                handler(scope, {
                    $event: event
                });
            });
        });
    };
});

ngModule.directive('woTooltip', function($document, $timeout) {
    return function(scope, elm, attrs) {
        var selector = attrs.woTooltip;
        var tooltip = $document.find(selector);

        elm.on('mouseover', function() {
            // Compute tooltip position
            var offsetElm = elm.offset();
            var offsetTooltipParent = tooltip.offsetParent().offset();

            // Set tooltip position
            tooltip[0].style.top = (offsetElm.top - offsetTooltipParent.top +
                elm[0].offsetHeight / 2 - tooltip[0].offsetHeight / 2) + 'px';
            tooltip[0].style.left = (offsetElm.left - offsetTooltipParent.left +
                elm[0].offsetWidth) + 'px';

            // Wait till browser repaint
            $timeout(function() {
                tooltip.addClass('tooltip--show');
            });
        });

        elm.on('mouseout', function() {
            tooltip.removeClass('tooltip--show');
            tooltip[0].style.top = '-9999px';
            tooltip[0].style.left = '-9999px';
        });
    };
});

ngModule.directive('woDropdown', function($document, $timeout) {
    return function(scope, elm, attrs) {
        var selector = attrs.woDropdown;
        var position = attrs.woDropdownPosition;
        var dropdown = $document.find(selector);

        function appear() {
            // Compute dropdown position
            var offsetElm = elm.offset();
            var offsetDropdownParent = dropdown.offsetParent().offset();

            // Set dropdown position
            dropdown[0].style.top = (offsetElm.top - offsetDropdownParent.top +
                elm[0].offsetHeight) + 'px';
            switch (position) {
            case 'center':
                dropdown[0].style.left = (offsetElm.left - offsetDropdownParent.left +
                        elm[0].offsetWidth / 2 - dropdown[0].offsetWidth / 2) + 'px';
                break;
            case 'right':
                dropdown[0].style.left = (offsetElm.left - offsetDropdownParent.left +
                        elm[0].offsetWidth - dropdown[0].offsetWidth) + 'px';
                break;
            default:
                dropdown[0].style.left = (offsetElm.left - offsetDropdownParent.left) + 'px';
            }

            // Wait till browser repaint
            $timeout(function() {
                dropdown.addClass('dropdown--show');
            });

            // class on element to change style if drowdown is visible
            elm.addClass('wo-dropdown-active');
        }

        function disappear() {
            dropdown.removeClass('dropdown--show');
            dropdown[0].style.top = '-9999px';
            dropdown[0].style.left = '-9999px';

            elm.removeClass('wo-dropdown-active');
        }

        function toggle() {
            if (dropdown.hasClass('dropdown--show')) {
                disappear();
            } else {
                appear();
            }
        }

        elm.on('touchstart click', toggle);

        // close if user clicks outside of dropdown and elm
        $document.on('touchstart.woDropdown click.woDropdown', function(e) {
            var t = angular.element(e.target);
            if (!t.closest(dropdown).length &&
                !t.closest(elm).length) {
                disappear();
            }
        });

        // remove event listener on document
        scope.$on('$destroy', function() {
            $document.off('touchstart.woDropdown click.woDropdown');
        });
    };
});

module.exports = ngModule;