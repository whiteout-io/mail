'use strict';

var axe = require('axe-logger');

var DialogCtrl = function($scope, $q, dialog) {

    var callback;

    //
    // Set dialog disply functions
    //

    dialog.displayInfo = function(options) {
        return $q(function(resolve) {
            setOptions(options);
            resolve();
        });
    };

    dialog.displayError = function(options) {
        return $q(function(resolve) {
            if (options) {
                axe.error((options.errMsg || options.message) + (options.stack ? ('\n' + options.stack) : ''));

                setOptions(options);
                $scope.title = options.title || 'Error';
                $scope.showBugReporter = (typeof options.showBugReporter !== 'undefined' ? options.showBugReporter : !options.title); // if title is set, presume it's not an error by default
            }

            resolve();
        });
    };

    dialog.displayConfirm = function(options) {
        return $q(function(resolve) {
            setOptions(options);
            resolve();
        });
    };

    function setOptions(options) {
        $scope.open = true;
        $scope.title = options.title;
        $scope.message = options.errMsg || options.message;
        $scope.faqLink = options.faqLink;
        $scope.positiveBtnStr = options.positiveBtnStr || 'Ok';
        $scope.negativeBtnStr = options.negativeBtnStr || 'Cancel';
        $scope.showNegativeBtn = options.showNegativeBtn || false;

        callback = options.callback;
    }

    //
    // Scope functions
    //

    $scope.confirm = function(ok) {
        $scope.open = false;

        if (callback) {
            callback(ok);
        }
        callback = undefined;
    };
};

module.exports = DialogCtrl;