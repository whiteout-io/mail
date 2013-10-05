define(function(require) {
    'use strict';

    var angular = require('angular'),
        folders = require('js/app-config').config.gmail.folders;

    var NavigationCtrl = function($scope) {
        $scope.navOpen = false;
        $scope.folders = folders;

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

    //
    // Directives
    //

    var ngModule = angular.module('read', []);
    ngModule.directive('frameLoad', function() {
        return function(scope, elm) {
            var frame;
            elm.bind('load', function() {
                frame = elm[0];
                frame.height = frame.contentWindow.document.body.scrollHeight + 'px';
            });
        };
    });

    return NavigationCtrl;
});