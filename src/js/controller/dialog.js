'use strict';

var DialogCtrl = function($scope) {
    $scope.confirm = function(ok) {
        $scope.state.dialog.open = false;

        if ($scope.state.dialog.callback) {
            $scope.state.dialog.callback(ok);
        }
        $scope.state.dialog.callback = undefined;
    };
};

module.exports = DialogCtrl;