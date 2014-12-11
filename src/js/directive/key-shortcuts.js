'use strict';

var ngModule = angular.module('woDirectives');

ngModule.directive('woKeyShortcuts', function($timeout) {
    return function(scope, elm) {
        elm.bind('keydown', function(e) {
            // global state is not yet set, ignore keybaord shortcuts
            if (!scope.state) {
                return;
            }

            var modifier = e.ctrlKey || e.metaKey;

            if (modifier && e.keyCode === 78 && scope.state.lightbox !== 'write') {
                // n -> new mail
                e.preventDefault();
                scope.state.writer.write();
                scope.$apply();

            } else if (modifier && e.keyCode === 70 && scope.state.lightbox !== 'write') {
                // f -> find
                e.preventDefault();
                scope.state.mailList.searching = true;
                $timeout(function() {
                    scope.state.mailList.searching = false;
                }, 200);
                scope.$apply();

            } else if (modifier && e.keyCode === 82 && scope.state.lightbox !== 'write' && scope.state.mailList.selected) {
                // r -> reply
                e.preventDefault();
                scope.state.writer.write(scope.state.mailList.selected);
                scope.$apply();

            } else if (e.keyCode === 27 && scope.state.lightbox !== undefined) {
                // escape -> close current lightbox
                e.preventDefault();
                scope.state.lightbox = undefined;
                scope.$apply();

            } else if (e.keyCode === 27 && scope.state.nav.open) {
                // escape -> close nav view
                e.preventDefault();
                scope.state.nav.toggle(false);
                scope.$apply();
            }

        });
    };
});