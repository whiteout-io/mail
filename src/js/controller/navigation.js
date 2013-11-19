define(function(require) {
    'use strict';

    var angular = require('angular'),
        appController = require('js/app-controller'),
        errorUtil = require('js/util/error'),
        _ = require('underscore'),
        emailDao, outboxBo;

    //
    // Controller
    //

    var NavigationCtrl = function($scope) {
        // global state... inherited to all child scopes
        $scope.$root.state = {};
        // attach global error handler
        errorUtil.attachHandler($scope);

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

        //
        // Start
        //

        // init folders
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
                        $scope.onError(err);
                        return;
                    }

                    folders.forEach(function(f) {
                        f.count = 0;
                    });

                    // start checking outbox periodically
                    outboxBo.startChecking(onOutboxUpdate);

                    callback(folders);
                    $scope.$apply();
                });
                return;
            }

            callback([{
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
            }]);
        }

        // update outbox count

        function onOutboxUpdate(err, count) {
            if (err) {
                $scope.onError(err);
                return;
            }

            var outbox = _.findWhere($scope.folders, {
                type: 'Outbox'
            });
            outbox.count = count;
            $scope.$apply();
        }

    };

    //
    // Directives
    //

    var ngModule = angular.module('navigation', []);
    ngModule.directive('keyShortcuts', function() {
        return function(scope, elm) {
            elm.bind('keydown', function(e) {
                // global state is not yet set, ignore keybaord shortcuts
                if (!scope.state) {
                    return;
                }

                if (e.keyCode === 78 && scope.state.writer && !scope.state.writer.open) {
                    // n -> new mail
                    e.preventDefault();
                    scope.state.writer.write();

                } else if (e.keyCode === 82 && scope.state.writer && !scope.state.writer.open && scope.state.mailList.selected) {
                    // r -> reply
                    e.preventDefault();
                    scope.state.writer.write(scope.state.mailList.selected);

                } else if (e.keyCode === 27 && scope.state.writer.open) {
                    // escape -> close writer
                    e.preventDefault();
                    scope.state.writer.close();

                } else if (e.keyCode === 27 && scope.state.account.open) {
                    // escape -> close account view
                    e.preventDefault();
                    scope.state.account.toggle(false);

                } else if (e.keyCode === 27 && scope.state.nav.open) {
                    // escape -> close nav view
                    e.preventDefault();
                    scope.state.nav.toggle(false);

                } else if (e.keyCode === 83 && scope.state.writer && !scope.state.writer.open && scope.state.mailList.synchronize) {
                    // s -> sync folder
                    e.preventDefault();
                    scope.state.mailList.synchronize();
                }

                scope.$apply();
            });
        };
    });

    return NavigationCtrl;
});