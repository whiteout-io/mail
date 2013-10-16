define(function(require) {
    'use strict';

    var angular = require('angular'),
        appController = require('js/app-controller'),
        emailDao;

    //
    // Controller
    //

    var NavigationCtrl = function($scope) {
        $scope.navOpen = false;

        emailDao = appController._emailDao;

        //
        // scope functions
        //

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

        $scope.write = function(replyTo) {
            var replyToPath = (replyTo) ? encodeURIComponent($scope.currentFolder.path) + '/' + replyTo.uid : '',
                url = 'chrome.html#/write/' + replyToPath;

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

        initFolders(function(folders) {
            $scope.folders = folders;
            // select inbox as the current folder on init
            $scope.openFolder($scope.folders[0]);
        });

        //
        // helper functions
        //

        function initFolders(callback) {
            if (window.chrome && chrome.identity) {
                emailDao.imapListFolders(function(err, folders) {
                    if (err) {
                        console.log(err);
                        return;
                    }

                    callback(folders);
                    $scope.$apply();
                });
                return;
            }

            callback([{
                type: 'Inbox',
                path: 'INBOX'
            }, {
                type: 'Sent',
                path: 'SENT'
            }, {
                type: 'Outbox',
                path: 'OUTBOX'
            }, {
                type: 'Drafts',
                path: 'DRAFTS'
            }, {
                type: 'Trash',
                path: 'TRASH'
            }]);
        }
    };

    //
    // Directives
    //

    var ngModule = angular.module('navigation', []);
    ngModule.directive('keyShortcuts', function() {
        return function(scope, elm) {
            elm.bind('keydown', function(e) {
                if (e.keyCode === 78 && scope.$$childTail && scope.$$childTail.write) {
                    // n -> new mail
                    e.preventDefault();
                    return scope.$$childTail.write();

                } else if (e.keyCode === 82 && scope.$$childTail && scope.$$childTail.write && scope.$$childTail.selected) {
                    // r -> reply
                    e.preventDefault();
                    return scope.$$childTail.write(scope.$$childTail.selected);
                }
            });
        };
    });

    return NavigationCtrl;
});