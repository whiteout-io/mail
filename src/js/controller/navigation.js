define(function(require) {
    'use strict';

    var angular = require('angular'),
        appController = require('js/app-controller'),
        _ = require('underscore'),
        config = require('js/app-config').config,
        emailDao, senderIntervalId,
        outboxBusy = false;

    //
    // Controller
    //

    var NavigationCtrl = function($scope) {
        $scope.$root.state = {};
        $scope.accountOpen = false;

        emailDao = appController._emailDao;

        //
        // scope functions
        //

        $scope.$root.onError = function(options) {
            console.error(options);
            $scope.state.dialog = {
                open: true,
                title: options.title || 'Error',
                message: options.message || options.errMsg
            };
        };

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

        $scope.openAccount = function() {
            $scope.accountOpen = true;
        };
        $scope.closeAccount = function() {
            $scope.accountOpen = false;
        };

        //
        // Outbox checker
        //

        $scope.emptyOutbox = function() {
            var dbType = 'email_OUTBOX',
                outbox = _.findWhere($scope.folders, {
                    type: 'Outbox'
                });

            checkStorage();

            function checkStorage() {
                if (outboxBusy) {
                    return;
                }

                outboxBusy = true;

                // get last item from outbox
                emailDao._devicestorage.listItems(dbType, 0, null, function(err, pending) {
                    if (err) {
                        console.error(err);
                        outboxBusy = false;
                        return;
                    }

                    // update outbox folder count
                    outbox.count = pending.length;
                    $scope.$apply();

                    // sending pending mails
                    send(pending);
                });
            }

            function send(emails) {
                if (emails.length === 0) {
                    outboxBusy = false;
                    return;
                }

                var email = emails.shift();
                emailDao.smtpSend(email, function(err) {
                    if (err) {
                        console.error(err);
                        outboxBusy = false;
                        return;
                    }

                    removeFromStorage(email.id);
                    send(emails);
                });
            }

            function removeFromStorage(id) {
                if (!id) {
                    console.error('Cannot remove email from storage without a valid id!');
                    outboxBusy = false;
                    return;
                }

                // delete email from local storage
                var key = dbType + '_' + id;
                emailDao._devicestorage.removeList(key, function(err) {
                    if (err) {
                        console.error(err);
                        outboxBusy = false;
                        return;
                    }

                    outbox.count = (outbox.count > 0) ? outbox.count - 1 : outbox.count;
                    $scope.$apply();
                    outboxBusy = false;
                });
            }
        };

        //
        // Start
        //

        function onUpdateAvailable(doUpdate) {
            $scope.state.dialog = {
                open: true,
                title: 'Update available',
                message: 'Would you like to update the application now?',
                callback: function(confirm) {
                    if (confirm) {
                        doUpdate();
                    }
                }
            };
        }
        // check for app update
        appController.checkForUpdate(onUpdateAvailable);

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
                        console.log(err);
                        return;
                    }

                    folders.forEach(function(f) {
                        f.count = 0;
                    });

                    // start checking outbox periodically
                    startOutboxSender();

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

        function startOutboxSender() {
            // start periodic checking of outbox
            senderIntervalId = setInterval($scope.emptyOutbox, config.checkOutboxInterval);
        }
    };

    //
    // Directives
    //

    var ngModule = angular.module('navigation', []);
    ngModule.directive('keyShortcuts', function() {
        return function(scope, elm) {
            elm.bind('keydown', function(e) {
                var cs = scope.$$childTail;

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

                } else if (e.keyCode === 27 && cs.accountOpen) {
                    // escape -> close account view
                    e.preventDefault();
                    cs.closeAccount();

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