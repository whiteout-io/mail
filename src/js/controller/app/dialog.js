'use strict';

var DialogCtrl = function($scope, dialog) {

    //
    // Set dialog disply functions
    //

    dialog.displayInfo = function(options) {
        setOptions(options);
    };

    dialog.displayError = function(options) {
        if (!options) {
            return;
        }

        setOptions(options);
        $scope.title = options.title || 'Error';
        $scope.showBugReporter = (typeof options.showBugReporter !== 'undefined' ? options.showBugReporter : !options.title); // if title is set, presume it's not an error by default
    };

    dialog.displayConfirm = function(options) {
        setOptions(options);
    };

    function setOptions(options) {
        $scope.open = true;
        $scope.title = options.title;
        $scope.message = options.errMsg || options.message;
        $scope.faqLink = options.faqLink;
        $scope.positiveBtnStr = options.positiveBtnStr || 'Ok';
        $scope.negativeBtnStr = options.negativeBtnStr || 'Cancel';
        $scope.showNegativeBtn = options.showNegativeBtn || false;
        $scope.callback = options.callback;
    }

    //
    // Scope functions
    //

    $scope.confirm = function(ok) {
        $scope.open = false;

        if ($scope.callback) {
            $scope.callback(ok);
        }
        $scope.callback = undefined;
    };
};

module.exports = DialogCtrl;