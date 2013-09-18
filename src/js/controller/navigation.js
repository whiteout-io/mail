define(function() {
    'use strict';

    var NavigationCtrl = function($scope) {
        $scope.navOpen = false;

        $scope.openNav = function() {
            $scope.navOpen = true;
        };

        $scope.closeNav = function() {
            $scope.navOpen = false;
        };

        $scope.write = function(replyTo) {
            var replyToId = (replyTo) ? replyTo.uid : '',
                url = 'index.html#/write/' + replyToId;

            if (window.chrome && chrome.app.window) {
                chrome.app.window.create(url, {
                    'bounds': {
                        'width': 800,
                        'height': 700
                    }
                });
                return;
            }

            window.open(url, 'Compose Message', 'toolbar=no,width=800,height=700,left=500,top=200,status=no,scrollbars=no,resize=no');
        };
    };

    return NavigationCtrl;
});