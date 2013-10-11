define(function(require) {
    'use strict';

    var appController = require('js/app-controller'),
        emailDao;

    var NavigationCtrl = function($scope) {
        $scope.navOpen = false;

        emailDao = appController._emailDao;

        initFolders(function(folders) {
            $scope.folders = folders;
            $scope.$apply();
            // select inbox as the current folder on init
            $scope.openFolder($scope.folders[0]);
        });

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

        //
        // helper functions
        //

        function initFolders(callback) {
            emailDao.imapListFolders(function(err, folders) {
                if (err) {
                    console.log(err);
                    return;
                }

                callback(folders);
            });
        }
    };

    return NavigationCtrl;
});