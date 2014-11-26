'use strict';

var DialogCtrl = function($scope, $timeout, dialog) {

    $scope.state.dialog = {
        open: false
    };

    //
    // Set dialog disply functions
    //

    dialog.displayInfo = function(options) {
        return $timeout(function() {
            setOptions(options);
        });
    };

    dialog.displayError = function(options) {
        return $timeout(function() {
            if (!options) {
                return;
            }

            setOptions(options);
            $scope.title = options.title || 'Error';
            $scope.showBugReporter = (typeof options.showBugReporter !== 'undefined' ? options.showBugReporter : !options.title); // if title is set, presume it's not an error by default
        });
    };

    dialog.displayConfirm = function(options) {
        return $timeout(function() {
            setOptions(options);
        });
    };

    function setOptions(options) {
        $scope.state.dialog.open = true;
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
        $scope.state.dialog.open = false;

        if ($scope.callback) {
            $scope.callback(ok);
        }
        $scope.callback = undefined;
    };
};

module.exports = DialogCtrl;