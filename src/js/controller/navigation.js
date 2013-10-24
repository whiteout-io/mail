define(function(require) {
    'use strict';

    var angular = require('angular'),
        appController = require('js/app-controller'),
        _ = require('underscore'),
        config = require('js/app-config').config,
        emailDao, senderIntervalId;

    //
    // Controller
    //

    var NavigationCtrl = function($scope) {
        $scope.navOpen = false;
        $scope.writerOpen = false;
        $scope.accountOpen = false;

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

        $scope.openWriter = function(replyTo) {
            $scope.writerReply = !! (replyTo);
            $scope.writerOpen = true;
        };
        $scope.closeWriter = function() {
            $scope.writerOpen = false;
        };

        $scope.openFolder = function(folder) {
            $scope.currentFolder = folder;
            $scope.closeNav();
        };

        $scope.openAccount = function() {
            $scope.accountOpen = true;
        };
        $scope.closeAccount = function() {
            $scope.accountOpen = false;
        };

        $scope.remove = function(email) {
            var trashFolder = _.findWhere($scope.folders, {
                type: 'Trash'
            });

            if ($scope.currentFolder === trashFolder) {
                emailDao.imapDeleteMessage({
                    folder: $scope.currentFolder.path,
                    uid: email.uid
                }, moved);
                return;
            }

            emailDao.imapMoveMessage({
                folder: $scope.currentFolder.path,
                uid: email.uid,
                destination: trashFolder.path
            }, moved);

            function moved(err) {
                var index;

                if (err) {
                    console.error(err);
                    return;
                }

                index = $scope.emails.indexOf(email);
                // show the next mail
                if ($scope.emails.length > 1) {
                    // if we're about to delete the last entry of the array, show the previous (i.e. the one below in the list), 
                    // otherwise show the next one (i.e. the one above in the list)
                    $scope.select(_.last($scope.emails) === email ? $scope.emails[index - 1] : $scope.emails[index + 1]);
                } else {
                    // if we have only one email in the array, show nothing
                    $scope.select();
                    $scope.selected = undefined;
                }
                $scope.emails.splice(index, 1);
                $scope.$apply();
            }
        };

        $scope.sendFirstFromOutbox = function() {
            var dbType = 'email_OUTBOX',
                outbox = _.findWhere($scope.folders, {
                    type: 'Outbox'
                });

            checkStorage();

            function checkStorage() {
                // get last item from outbox
                emailDao._devicestorage.listItems(dbType, 0, null, function(err, pending) {
                    if (err) {
                        console.error(err);
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
                    return;
                }
                
                var email = emails.shift();
                emailDao.smtpSend(email, function(err) {
                    if (err) {
                        console.error(err);
                        return;
                    }

                    removeFromStorage(email.id);
                    send(emails);
                });
            }

            function removeFromStorage(id) {
                if (!id) {
                    console.error('Cannot remove email from storage without a valid id!');
                    return;
                }

                // delete email from local storage
                var key = dbType + '_' + id;
                emailDao._devicestorage.removeList(key, function(err) {
                    if (err) {
                        console.error(err);
                        return;
                    }

                    outbox.count = (outbox.count > 0) ? outbox.count - 1 : outbox.count;
                    $scope.$apply();
                });
            }
        };

        //
        // Start
        //

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
            senderIntervalId = setInterval($scope.sendFirstFromOutbox, config.checkOutboxInterval);
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

                if (e.keyCode === 78 && !cs.writerOpen) {
                    // n -> new mail
                    e.preventDefault();
                    cs.openWriter();

                } else if (e.keyCode === 82 && !cs.writerOpen && cs.selected) {
                    // r -> reply
                    e.preventDefault();
                    cs.openWriter(cs.selected);

                } else if (e.keyCode === 27 && cs.writerOpen) {
                    // escape -> close writer
                    e.preventDefault();
                    cs.closeWriter();

                } else if (e.keyCode === 27 && cs.accountOpen) {
                    // escape -> close account view
                    e.preventDefault();
                    cs.closeAccount();

                } else if (e.keyCode === 83 && !cs.writerOpen && cs.synchronize) {
                    // s -> sync folder
                    e.preventDefault();
                    cs.synchronize();
                }

                scope.$apply();
            });
        };
    });

    return NavigationCtrl;
});