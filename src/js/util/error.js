define(function() {
    'use strict';

    var er = {};

    er.attachHandler = function(scope) {
        scope.onError = function(options) {
            if (!options) {
                scope.$apply();
                return;
            }

            if (options.stack) {
                console.error(options.stack);
            } else {
                console.error(options);
            }

            scope.state.dialog = {
                open: true,
                title: options.title || 'Error',
                message: options.errMsg || options.message
            };
            // don't call apply for synchronous calls
            if (!options.sync) {
                scope.$apply();
            }
        };
    };

    return er;
});