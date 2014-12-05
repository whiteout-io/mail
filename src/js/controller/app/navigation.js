'use strict';

//
// Constants
//

var NOTIFICATION_SENT_TIMEOUT = 2000;


//
// Controller
//

var NavigationCtrl = function($scope, $location, account, email, outbox, notification, appConfig, dialog, dummy) {
    if (!$location.search().dev && !account.isLoggedIn()) {
        $location.path('/'); // init app
        return;
    }

    var str = appConfig.string,
        config = appConfig.config;

    //
    // scope state
    //

    $scope.state.nav = {
        open: false,
        toggle: function(to) {
            this.open = to;
        }
    };

    //
    // url/history handling
    //

    /**
     * Close read mode and go to folder
     */
    $scope.navigate = function(folderIndex) {
        $location.search('uid', null);
        $location.search('folder', folderIndex);
    };

    $scope.loc = $location;

    // nav open/close state url watcher
    $scope.$watch('(loc.search()).nav', function(open) {
        // synchronize the url to the scope state
        $scope.state.nav.toggle(!!open);
    });
    $scope.$watch('state.nav.open', function(value) {
        // synchronize the scope state to the url
        $location.search('nav', value ? true : null);
    });

    // lightbox state url watcher
    $scope.$watch('(loc.search()).lightbox', function(value) {
        // synchronize the url to the scope state
        $scope.state.lightbox = (value) ? value : undefined;
    });
    $scope.$watch('state.lightbox', function(value) {
        // synchronize the scope state to the url
        $location.search('lightbox', value ? value : null);
    });

    //
    // scope functions
    //

    $scope.openFolder = function(folder) {
        $scope.state.nav.currentFolder = folder;
        $scope.state.nav.toggle(false);
    };

    $scope.onOutboxUpdate = function(err, count) {
        if (err) {
            dialog.error(err);
            return;
        }

        // update the outbox mail count
        var ob = _.findWhere($scope.account.folders, {
            type: config.outboxMailboxType
        });
        ob.count = count;
        $scope.$apply();

        email.refreshFolder({
            folder: ob
        }, dialog.error);
    };

    $scope.logout = function() {
        dialog.confirm({
            title: str.logoutTitle,
            message: str.logoutMessage,
            callback: function(confirm) {
                if (confirm) {
                    account.logout();
                }
            }
        });
    };

    //
    // Start
    //

    // init folders
    initializeFolders();

    // folder index url watcher
    $scope.$watch('(loc.search()).folder', function(folderIndex) {
        if (typeof folderIndex === 'undefined') {
            $location.search('folder', 0); // navigate to inbox by default
            return;
        }
        // select current folder
        folderIndex = typeof folderIndex === 'string' ? parseInt(folderIndex, 10) : folderIndex;
        if ($scope.account.folders && $scope.account.folders.length > folderIndex) {
            // navigate to the selected folder index
            $scope.openFolder($scope.account.folders[folderIndex]);
        }
    });

    // connect imap/smtp clients on first startup
    account.onConnect(function(err) {
        if (err) {
            dialog.error(err);
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
        if ($location.search().dev) {
            $scope.$root.account = {};
            $scope.account.folders = dummy.listFolders();
            return;
        }

        // get pointer to account/folder/message tree on root scope
        $scope.$root.account = account.list()[0];

        // set notificatio handler for sent messages
        outbox.onSent = sentNotification;
        // start checking outbox periodically
        outbox.startChecking($scope.onOutboxUpdate);
    }

    function sentNotification(message) {
        notification.create({
            title: 'Message sent',
            message: message.subject,
            timeout: NOTIFICATION_SENT_TIMEOUT
        }, function() {});
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