'use strict';

var appController = require('../app-controller'),
    notification = require('../util/notification'),
    backBtnHandler = require('../util/backbutton-handler'),
    appCfg = require('../app-config'),
    config = appCfg.config,
    str = appCfg.string,
    emailDao, outboxBo;

//
// Constants
//

var NOTIFICATION_SENT_TIMEOUT = 2000;


//
// Controller
//

var NavigationCtrl = function($scope, $routeParams, $location) {
    if (!appController._emailDao && !$routeParams.dev) {
        $location.path('/'); // init app
        return;
    }

    emailDao = appController._emailDao;
    outboxBo = appController._outboxBo;

    //
    // scope functions
    //

    $scope.state.nav = {
        open: false,
        toggle: function(to) {
            this.open = to;
        }
    };

    $scope.openFolder = function(folder) {
        $scope.state.nav.currentFolder = folder;
        $scope.state.nav.toggle(false);
    };

    $scope.onOutboxUpdate = function(err, count) {
        if (err) {
            $scope.onError(err);
            return;
        }

        // update the outbox mail count
        var outbox = _.findWhere($scope.account.folders, {
            type: config.outboxMailboxType
        });
        outbox.count = count;
        $scope.$apply();

        emailDao.refreshFolder({
            folder: outbox
        }, $scope.onError);
    };

    $scope.logout = function() {
        $scope.onError({
            title: str.logoutTitle,
            message: str.logoutMessage,
            callback: function(confirm) {
                if (confirm) {
                    appController.logout();
                }
            },
            sync: true
        });
    };

    //
    // Start
    //

    // handle back button
    backBtnHandler.start();
    // init folders
    initializeFolders();

    // select inbox as the current folder on init
    if ($scope.account.folders && $scope.account.folders.length > 0) {
        $scope.openFolder($scope.account.folders[0]);
    }
    // connect imap/smtp clients on first startup
    appController.onConnect(function(err) {
        if (err) {
            $scope.onError(err);
            return;
        }

        // select inbox if not yet selected
        if (!$scope.state.nav.currentFolder) {
            $scope.openFolder($scope.account.folders[0]);
            $scope.$apply();
        }
    });

    //
    // helper functions
    //

    function initializeFolders() {
        // create dummy folder in dev environment only
        if ($routeParams.dev) {
            createDummyFolders();
            return;
        }

        // get pointer to account/folder/message tree on root scope
        $scope.$root.account = emailDao._account;

        // set notificatio handler for sent messages
        outboxBo.onSent = sentNotification;
        // start checking outbox periodically
        outboxBo.startChecking($scope.onOutboxUpdate);
    }

    function sentNotification(email) {
        notification.create({
            title: 'Message sent',
            message: email.subject,
            timeout: NOTIFICATION_SENT_TIMEOUT
        }, function() {});
    }


    // attach dummy folders for development
    function createDummyFolders() {
        $scope.$root.account = {};
        $scope.account.folders = [{
            type: 'Inbox',
            count: 2,
            path: 'INBOX'
        }, {
            type: 'Sent',
            count: 0,
            path: 'SENT'
        }, {
            type: config.outboxMailboxType,
            count: 0,
            path: config.outboxMailboxPath
        }, {
            type: 'Drafts',
            count: 0,
            path: 'DRAFTS'
        }, {
            type: 'Trash',
            count: 0,
            path: 'TRASH'
        }];
    }
};

//
// Directives
//

var ngModule = angular.module('navigation', []);
ngModule.directive('keyShortcuts', function($timeout) {
    return function(scope, elm) {
        elm.bind('keydown', function(e) {
            // global state is not yet set, ignore keybaord shortcuts
            if (!scope.state) {
                return;
            }

            var modifier = e.ctrlKey || e.metaKey;

            if (modifier && e.keyCode === 78 && scope.state.lightbox !== 'write') {
                // n -> new mail
                e.preventDefault();
                scope.state.writer.write();
                scope.$apply();

            } else if (modifier && e.keyCode === 70 && scope.state.lightbox !== 'write') {
                // f -> find
                e.preventDefault();
                scope.state.mailList.searching = true;
                $timeout(function() {
                    scope.state.mailList.searching = false;
                }, 200);
                scope.$apply();

            } else if (modifier && e.keyCode === 82 && scope.state.lightbox !== 'write' && scope.state.mailList.selected) {
                // r -> reply
                e.preventDefault();
                scope.state.writer.write(scope.state.mailList.selected);
                scope.$apply();

            } else if (e.keyCode === 27 && scope.state.lightbox !== undefined) {
                // escape -> close current lightbox
                e.preventDefault();
                scope.state.lightbox = undefined;
                scope.$apply();

            } else if (e.keyCode === 27 && scope.state.nav.open) {
                // escape -> close nav view
                e.preventDefault();
                scope.state.nav.toggle(false);
                scope.$apply();
            }

        });
    };
});

module.exports = NavigationCtrl;