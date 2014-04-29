define(function(require) {
    'use strict';

    var angular = require('angular'),
        str = require('js/app-config').string,
        appController = require('js/app-controller'),
        notification = require('js/util/notification'),
        _ = require('underscore'),
        emailDao, outboxBo;

    //
    // Controller
    //

    var NavigationCtrl = function($scope) {
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

            // update the outbox mail count. this should normally happen during the delta sync
            // problem is that the outbox continuously retries in the background, whereas the delta sync only runs
            // when the outbox is currently viewed...
            var outbox = _.findWhere($scope.account.folders, {
                type: 'Outbox'
            });

            if (outbox === $scope.state.nav.currentFolder) {
                $scope.state.mailList.synchronize();
            } else {
                outbox.count = count;
                $scope.$apply();
            }
        };

        //
        // Start
        //

        // init folders
        initFolders();

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

        function initFolders() {
            if (window.chrome && chrome.identity) {
                // get pointer to account/folder/message tree on root scope
                $scope.$root.account = emailDao._account;

                // set notificatio handler for sent messages
                outboxBo.onSent = sentNotification;
                // start checking outbox periodically
                outboxBo.startChecking($scope.onOutboxUpdate);

                return;
            }

            // attach dummy folders for development
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
                type: 'Outbox',
                count: 0,
                path: 'OUTBOX'
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

        function sentNotification(email) {
            notification.create({
                id: 'o' + email.id,
                title: 'Message sent',
                message: email.subject.replace(str.subjectPrefix, '')
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

                } else if (modifier && e.keyCode === 83 && scope.state.lightbox !== 'write' && scope.state.mailList.synchronize) {
                    // s -> sync folder
                    e.preventDefault();
                    scope.state.mailList.synchronize();
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

    return NavigationCtrl;
});