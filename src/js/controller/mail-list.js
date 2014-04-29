define(function(require) {
    'use strict';

    var angular = require('angular'),
        _ = require('underscore'),
        appController = require('js/app-controller'),
        IScroll = require('iscroll'),
        notification = require('js/util/notification'),
        emailDao, outboxBo, emailSync;

    var MailListCtrl = function($scope, $timeout) {
        //
        // Init
        //

        emailDao = appController._emailDao;
        outboxBo = appController._outboxBo;
        emailSync = appController._emailSync;

        emailDao.onNeedsSync = function(error, folder) {
            if (error) {
                $scope.onError(error);
                return;
            }

            $scope.synchronize({
                folder: folder
            });
        };

        emailSync.onIncomingMessage = function(msgs) {
            var popupId, popupTitle, popupMessage, unreadMsgs;

            unreadMsgs = msgs.filter(function(msg) {
                return msg.unread;
            });

            if (unreadMsgs.length === 0) {
                return;
            }

            popupId = '' + unreadMsgs[0].uid;
            if (unreadMsgs.length > 1) {
                popupTitle = unreadMsgs.length + ' new messages';
                popupMessage = _.pluck(unreadMsgs, 'subject').join('\n');
            } else {
                popupTitle = unreadMsgs[0].from[0].name || unreadMsgs[0].from[0].address;
                popupMessage = unreadMsgs[0].subject;
            }

            notification.create({
                id: popupId,
                title: popupTitle,
                message: popupMessage
            });
        };

        notification.setOnClickedListener(function(uidString) {
            var uid = parseInt(uidString, 10);

            if (isNaN(uid)) {
                return;
            }

            $scope.select(_.findWhere(currentFolder().messages, {
                uid: uid
            }));
        });


        //
        // scope functions
        //

        $scope.getBody = function(email) {
            emailDao.getBody({
                folder: currentFolder().path,
                message: email
            }, function(err) {
                if (err && err.code !== 42) {
                    $scope.onError(err);
                    return;
                }

                // display fetched body
                $scope.$digest();

                // automatically decrypt if it's the selected email
                if (email === $scope.state.mailList.selected) {
                    emailDao.decryptBody({
                        message: email
                    }, $scope.onError);
                }
            });
        };

        /**
         * Called when clicking on an email list item
         */
        $scope.select = function(email) {
            // unselect an item
            if (!email) {
                $scope.state.mailList.selected = undefined;
                return;
            }

            $scope.state.mailList.selected = email;
            $scope.state.read.toggle(true);

            emailDao.decryptBody({
                message: email
            }, $scope.onError);

            // if the email is unread, please sync the new state.
            // otherweise forget about it.
            if (!email.unread) {
                return;
            }

            email.unread = false;
            $scope.synchronize();
        };

        /**
         * Mark an email as unread or read, respectively
         */
        $scope.toggleUnread = function(email) {
            email.unread = !email.unread;
            $scope.synchronize();
        };

        /**
         * Synchronize the selected imap folder to local storage
         */
        $scope.synchronize = function(options) {
            updateStatus('Syncing ...');

            options = options || {};
            options.folder = options.folder || currentFolder().path;

            // let email dao handle sync transparently
            if (currentFolder().type === 'Outbox') {
                emailDao.syncOutbox({
                    folder: currentFolder().path
                }, done);
            } else {
                emailDao.sync({
                    folder: options.folder || currentFolder().path
                }, done);
            }


            function done(err) {
                if (err && err.code === 409) {
                    // sync still busy
                    return;
                }

                if (err && err.code === 42) {
                    // offline
                    updateStatus('Offline mode');
                    $scope.$apply();
                    return;
                }

                if (err) {
                    updateStatus('Error on sync!');
                    $scope.onError(err);
                    return;
                }

                // display last update
                updateStatus('Last update: ', new Date());

                // do not change the selection if we just updated another folder in the background
                if (currentFolder().path === options.folder) {
                    selectFirstMessage();
                }

                $scope.$apply();

                // fetch visible bodies at the end of a successful sync
                $scope.loadVisibleBodies();
            }
        };

        /**
         * Delete an email by moving it to the trash folder or purging it.
         */
        $scope.remove = function(email) {
            if (!email) {
                return;
            }

            if (currentFolder().type === 'Outbox') {
                $scope.onError({
                    errMsg: 'Deleting messages from the outbox is not yet supported.'
                });
                return;
            }

            removeAndShowNext();
            $scope.synchronize();

            function removeAndShowNext() {
                var index = currentFolder().messages.indexOf(email);
                // show the next mail
                if (currentFolder().messages.length > 1) {
                    // if we're about to delete the last entry of the array, show the previous (i.e. the one below in the list),
                    // otherwise show the next one (i.e. the one above in the list)
                    $scope.select(_.last(currentFolder().messages) === email ? currentFolder().messages[index - 1] : currentFolder().messages[index + 1]);
                } else {
                    // if we have only one email in the array, show nothing
                    $scope.select();
                    $scope.state.mailList.selected = undefined;
                }
                currentFolder().messages.splice(index, 1);
            }
        };

        // share local scope functions with root state
        $scope.state.mailList = {
            remove: $scope.remove,
            synchronize: $scope.synchronize
        };

        //
        // watch tasks
        //

        /**
         * List emails from folder when user changes folder
         */
        $scope._stopWatchTask = $scope.$watch('state.nav.currentFolder', function() {
            if (!currentFolder()) {
                return;
            }

            // development... display dummy mail objects
            if (!window.chrome || !chrome.identity) {
                updateStatus('Last update: ', new Date());
                currentFolder().messages = createDummyMails();
                selectFirstMessage();
                return;
            }

            // production... in chrome packaged app

            // unselect selection from old folder
            $scope.select();
            // display and select first
            selectFirstMessage();

            $scope.synchronize();
        });

        /**
         * Sync current folder when client comes back online
         */
        $scope.$watch('account.online', function(isOnline) {
            if (isOnline) {
                $scope.synchronize();
            } else {
                updateStatus('Offline mode');
            }
        }, true);

        //
        // helper functions
        //

        function updateStatus(lbl, time) {
            $scope.lastUpdateLbl = lbl;
            $scope.lastUpdate = (time) ? time : '';
        }

        function selectFirstMessage() {
            // wait until after first $digest() so $scope.filteredMessages is set
            $timeout(function() {
                var emails = $scope.filteredMessages;

                if (!emails || emails.length < 1) {
                    $scope.select();
                    return;
                }

                if (!$scope.state.mailList.selected) {
                    // select first message
                    $scope.select(emails[0]);
                }
            });
        }

        function currentFolder() {
            return $scope.state.nav.currentFolder;
        }
    };

    function createDummyMails() {
        var uid = 0;

        var Email = function(unread, attachments, answered, html) {
            this.uid = uid++;
            this.from = [{
                name: 'Whiteout Support',
                address: 'support@whiteout.io'
            }]; // sender address
            this.to = [{
                address: 'max.musterman@gmail.com'
            }, {
                address: 'max.musterman@gmail.com'
            }]; // list of receivers
            this.cc = [{
                address: 'john.doe@gmail.com'
            }]; // list of receivers
            if (attachments) {
                // body structure with three attachments
                this.bodystructure = {
                    "1": {
                        "part": "1",
                        "type": "text/plain",
                        "parameters": {
                            "charset": "us-ascii"
                        },
                        "encoding": "7bit",
                        "size": 9,
                        "lines": 2
                    },
                    "2": {
                        "part": "2",
                        "type": "application/octet-stream",
                        "parameters": {
                            "name": "a.md"
                        },
                        "encoding": "7bit",
                        "size": 123,
                        "disposition": [{
                            "type": "attachment",
                            "filename": "a.md"
                        }]
                    },
                    "3": {
                        "part": "3",
                        "type": "application/octet-stream",
                        "parameters": {
                            "name": "b.md"
                        },
                        "encoding": "7bit",
                        "size": 456,
                        "disposition": [{
                            "type": "attachment",
                            "filename": "b.md"
                        }]
                    },
                    "4": {
                        "part": "4",
                        "type": "application/octet-stream",
                        "parameters": {
                            "name": "c.md"
                        },
                        "encoding": "7bit",
                        "size": 789,
                        "disposition": [{
                            "type": "attachment",
                            "filename": "c.md"
                        }]
                    },
                    "type": "multipart/mixed"
                };
                this.attachments = [{
                    "filename": "a.md",
                    "filesize": 123,
                    "mimeType": "text/x-markdown",
                    "part": "2",
                    "content": null
                }, {
                    "filename": "b.md",
                    "filesize": 456,
                    "mimeType": "text/x-markdown",
                    "part": "3",
                    "content": null
                }, {
                    "filename": "c.md",
                    "filesize": 789,
                    "mimeType": "text/x-markdown",
                    "part": "4",
                    "content": null
                }];
            } else {
                this.bodystructure = {
                    "part": "1",
                    "type": "text/plain",
                    "parameters": {
                        "charset": "us-ascii"
                    },
                    "encoding": "7bit",
                    "size": 9,
                    "lines": 2
                };
                this.attachments = [];
            }
            this.unread = unread;
            this.answered = answered;
            this.html = html;
            this.sentDate = new Date('Thu Sep 19 2013 20:41:23 GMT+0200 (CEST)');
            this.subject = 'Getting started'; // Subject line
            this.body = 'And a good day to you too sir. \n' +
                '\n' +
                'Thursday, Apr 24, 2014 3:33 PM safewithme.testuser@gmail.com wrote:\n' +
                '> adsfadfasdfasdfasfdasdfasdfas\n' +
                '\n' +
                'http://example.com\n' +
                '\n' +
                '> Tuesday, Mar 25, 2014 4:19 PM gianniarcore@gmail.com wrote:\n' +
                '>> from 0.7.0.1\n' +
                '>>\n' +
                '>> God speed!'; // plaintext body
            this.encrypted = true;
            this.decrypted = true;
        };

        var dummys = [new Email(true, true), new Email(true, false, true, true), new Email(false, true, true), new Email(false, true), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false)];

        return dummys;
    }

    //
    // Directives
    //

    var ngModule = angular.module('mail-list', []);

    ngModule.directive('ngIscroll', function($timeout) {
        return {
            link: function(scope, elm, attrs) {
                var model = attrs.ngIscroll,
                    listEl = elm[0],
                    myScroll;

                /*
                 * iterates over the mails in the mail list and loads their bodies if they are visible in the viewport
                 */
                scope.loadVisibleBodies = function() {
                    var listBorder = listEl.getBoundingClientRect(),
                        top = listBorder.top,
                        bottom = listBorder.bottom,
                        listItems = listEl.children[0].children,
                        inViewport = false,
                        listItem, message,
                        isPartiallyVisibleTop, isPartiallyVisibleBottom, isVisible;

                    for (var i = 0, len = listItems.length; i < len; i++) {
                        // the n-th list item (the dom representation of an email) corresponds to
                        // the n-th message model in the filteredMessages array
                        listItem = listItems.item(i).getBoundingClientRect();
                        message = scope.filteredMessages[i];
                        if (!message) {
                            // stop if i get larger than the size of filtered messages
                            break;
                        }

                        isPartiallyVisibleTop = listItem.top < top && listItem.bottom > top; // a portion of the list item is visible on the top
                        isPartiallyVisibleBottom = listItem.top < bottom && listItem.bottom > bottom; // a portion of the list item is visible on the bottom
                        isVisible = listItem.top >= top && listItem.bottom <= bottom; // the list item is visible as a whole

                        if (isPartiallyVisibleTop || isVisible || isPartiallyVisibleBottom) {
                            // we are now iterating over visible elements
                            inViewport = true;
                            // load mail body of visible
                            scope.getBody(message);
                        } else if (inViewport) {
                            // we are leaving the viewport, so stop iterating over the items
                            break;
                        }
                    }
                };

                // activate iscroll
                myScroll = new IScroll(listEl, {
                    mouseWheel: true,
                    scrollbars: true,
                    fadeScrollbars: true
                });
                myScroll.on('scrollEnd', scope.loadVisibleBodies);

                // refresh iScroll when model length changes
                scope.$watchCollection(model, function() {
                    $timeout(function() {
                        myScroll.refresh();
                    });
                    // load the visible message bodies, when the list is re-initialized and when scrolling stopped
                    scope.loadVisibleBodies();
                });
            }
        };
    });

    return MailListCtrl;
});