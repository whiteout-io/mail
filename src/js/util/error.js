define(function(require) {
    'use strict';

    var axe = require('axe');

    var er = {};
    er.attachHandler = function(scope) {
        scope.onError = function(options) {
            if (!options) {
                scope.$apply();
                return;
            }

            axe.error((options.errMsg || options.message) + (options.stack ? ('\n' + options.stack) : ''));

            scope.state.dialog = {
                open: true,
                title: options.title || 'Error',
                message: options.errMsg || options.message,
                positiveBtnStr: options.positiveBtnStr || 'Ok',
                negativeBtnStr: options.negativeBtnStr || 'Cancel',
                showNegativeBtn: options.showNegativeBtn || false,
                showBugReporter: (typeof options.showBugReporter !== 'undefined' ? options.showBugReporter : true),
                callback: options.callback
            };
            // don't call apply for synchronous calls
            if (!options.sync) {
                scope.$apply();
            }
        };
    };

    return er;
});