define(function() {
    'use strict';

    var NavigationCtrl = function($scope) {
        $scope.navOpen = false;
        $scope.folders = [{
            type: 'Inbox',
            count: undefined,
            path: 'INBOX'
        }, {
            type: 'Sent',
            count: undefined,
            path: '[Gmail]/Gesendet'
        }, {
            type: 'Outbox',
            count: undefined,
            path: 'OUTBOX'
        }, {
            type: 'Drafts',
            count: undefined,
            path: '[Gmail]/Entw&APw-rfe'
        }, {
            type: 'Trash',
            count: undefined,
            path: '[Gmail]/Papierkorb'
        }];

        $scope.openNav = function() {
            $scope.navOpen = true;
        };

        $scope.closeNav = function() {
            $scope.navOpen = false;
        };

        $scope.openFolder = function(folder) {
            $scope.currentFolder = folder;
            $scope.closeNav();
        };
        // select inbox as the current folder on init
        $scope.openFolder($scope.folders[0]);

        $scope.write = function(replyTo) {
            var replyToId = (replyTo) ? replyTo.uid : '',
                url = 'index.html#/write/' + replyToId;

            if (window.chrome && chrome.app.window) {
                chrome.app.window.create(url, {
                    'bounds': {
                        'width': 720,
                        'height': 640
                    }
                });
                return;
            }

            window.open(url, 'Compose Message', 'toolbar=no,width=720,height=640,left=500,top=200,status=no,scrollbars=no,resize=no');
        };
    };

    return NavigationCtrl;
});