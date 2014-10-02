'use strict';

var axe = require('axe-logger');

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
            faqLink: options.faqLink,
            positiveBtnStr: options.positiveBtnStr || 'Ok',
            negativeBtnStr: options.negativeBtnStr || 'Cancel',
            showNegativeBtn: options.showNegativeBtn || false,
            showBugReporter: (typeof options.showBugReporter !== 'undefined' ? options.showBugReporter : !options.title), // if title is set, presume it's not an error by default
            callback: options.callback
        };
        // don't call apply for synchronous calls
        if (!options.sync) {
            scope.$apply();
        }
    };
};

exports = er;