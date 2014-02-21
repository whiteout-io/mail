define(function(require) {
    'use strict';

    var angular = require('angular'),
        _ = require('underscore'),
        appController = require('js/app-controller'),
        IScroll = require('iscroll'),
        str = require('js/app-config').string,
        cfg = require('js/app-config').config,
        emailDao, outboxBo;

    var MailListCtrl = function($scope) {
        //
        // Init
        //

        emailDao = appController._emailDao;
        outboxBo = appController._outboxBo;

        // push handler
        if (emailDao) {
            emailDao.onIncomingMessage = function(email) {
                if (!email.subject) {
                    return;
                }

                if (email.subject.indexOf(str.subjectPrefix) === -1 ||
                    email.subject === str.subjectPrefix + str.verificationSubject) {
                    return;
                }

                // sync
                $scope.synchronize(function() {
                    // show notification
                    notificationForEmail(email);
                });
            };
            chrome.notifications.onClicked.addListener(notificationClicked);
        }

        function notificationClicked(uidString) {
            var email, uid = parseInt(uidString, 10);

            if (isNaN(uid)) {
                return;
            }

            email = _.findWhere(getFolder().messages, {
                uid: uid
            });

            if (email) {
                $scope.select(email);
            }
        }

        //
        // scope functions
        //

        $scope.getBody = function(email) {
            // don't stream message content of outbox messages...
            if (getFolder().type === 'Outbox') {
                return;
            }

            emailDao.getBody({
                folder: getFolder().path,
                message: email
            }, function(err) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                // display fetched body
                $scope.$apply();

                // automatically decrypt if it's the selected email
                if (email === $scope.state.mailList.selected) {
                    emailDao.decryptMessageContent({
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

            // if we're in the outbox, don't decrypt as usual
            if (getFolder().type !== 'Outbox') {
                emailDao.decryptMessageContent({
                    message: email
                }, $scope.onError);
            }

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
        $scope.synchronize = function(callback) {
            // if we're in the outbox, don't do an imap sync
            if (getFolder().type === 'Outbox') {
                updateStatus('Last update: ', new Date());
                selectFirstMessage(outboxBo.pendingEmails);
                return;
            }

            updateStatus('Syncing ...');

            // let email dao handle sync transparently
            emailDao.sync({
                folder: getFolder().path
            }, function(err) {
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

                // sort emails
                selectFirstMessage(getFolder().messages);
                // display last update
                updateStatus('Last update: ', new Date());
                $scope.$apply();

                if (callback) {
                    callback();
                }
            });
        };

        /**
         * Delete an email by moving it to the trash folder or purging it.
         */
        $scope.remove = function(email) {
            if (!email) {
                return;
            }

            var index, currentFolder, outboxFolder;

            currentFolder = getFolder();
            // trashFolder = _.findWhere($scope.folders, {
            //     type: 'Trash'
            // });
            outboxFolder = _.findWhere($scope.account.folders, {
                type: 'Outbox'
            });

            if (currentFolder === outboxFolder) {
                $scope.onError({
                    errMsg: 'Deleting messages from the outbox is not yet supported.'
                });
                return;
            }

            removeAndShowNext();
            $scope.synchronize();

            function removeAndShowNext() {
                index = getFolder().messages.indexOf(email);
                // show the next mail
                if (getFolder().messages.length > 1) {
                    // if we're about to delete the last entry of the array, show the previous (i.e. the one below in the list), 
                    // otherwise show the next one (i.e. the one above in the list)
                    $scope.select(_.last(getFolder().messages) === email ? getFolder().messages[index - 1] : getFolder().messages[index + 1]);
                } else {
                    // if we have only one email in the array, show nothing
                    $scope.select();
                    $scope.state.mailList.selected = undefined;
                }
                getFolder().messages.splice(index, 1);
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
            if (!getFolder()) {
                return;
            }

            // development... display dummy mail objects
            if (!window.chrome || !chrome.identity) {
                updateStatus('Last update: ', new Date());
                getFolder().messages = createDummyMails();
                selectFirstMessage(getFolder().messages);
                return;
            }

            // production... in chrome packaged app

            // if we're in the outbox, read directly from there.
            if (getFolder().type === 'Outbox') {
                updateStatus('Last update: ', new Date());
                selectFirstMessage(outboxBo.pendingEmails);
                return;
            }

            // unselect selection from old folder
            $scope.select();
            // display and select first
            selectFirstMessage(getFolder().messages);

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

        function notificationForEmail(email) {
            chrome.notifications.create('' + email.uid, {
                type: 'basic',
                title: email.from[0].name || email.from[0].address,
                message: email.subject.replace(str.subjectPrefix, ''),
                iconUrl: chrome.runtime.getURL(cfg.iconPath)
            }, function() {});
        }

        function updateStatus(lbl, time) {
            $scope.lastUpdateLbl = lbl;
            $scope.lastUpdate = (time) ? time : '';
        }

        function selectFirstMessage(emails) {
            if (!emails || emails.length < 1) {
                $scope.select();
                return;
            }

            if (!$scope.state.mailList.selected) {
                // select first message
                $scope.select(emails[emails.length - 1]);
            }
        }

        function getFolder() {
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
            this.body = 'Here are a few pointers to help you get started with Whiteout Mail.\n\n# Write encrypted message\n- You can compose a message by clicking on the compose button on the upper right (keyboard shortcut is "n" for a new message or "r" to reply).\n- When typing the recipient\'s email address, secure recipients are marked with a blue label and insecure recipients are red.\n- When sending an email to insecure recipients, the default behavior for Whiteout Mail is to invite them to the service and only send the message content in an encrypted form, once they have joined.\n\n# Advanced features\n- To verify a recipient\'s PGP key, you can hover over the blue label containing their email address and their key fingerprint will be displayed.\n- To view your own key fingerprint, open the account view in the navigation bar on the left. You can compare these with your correspondants over a second channel such as a phonecall.\n\nWe hope this helped you to get started with Whiteout Mail.\n\nYour Whiteout Networks team'; // plaintext body
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
    ngModule.directive('ngIscroll', function() {
        return {
            link: function(scope, elm, attrs) {
                var model = attrs.ngIscroll,
                    listEl = elm[0];

                scope.$watch(model, function() {
                    var myScroll;
                    // activate iscroll
                    myScroll = new IScroll(listEl, {
                        mouseWheel: true
                    });

                    // load the visible message bodies, when the list is re-initialized and when scrolling stopped
                    loadVisible();
                    myScroll.on('scrollEnd', loadVisible);
                }, true);

                /*
                 * iterates over the mails in the mail list and loads their bodies if they are visible in the viewport
                 */
                function loadVisible() {
                    var listBorder = listEl.getBoundingClientRect(),
                        top = listBorder.top,
                        bottom = listBorder.bottom,
                        listItems = listEl.children[0].children,
                        i = listItems.length,
                        listItem, message,
                        isPartiallyVisibleTop, isPartiallyVisibleBottom, isVisible;

                    while (i--) {
                        // the n-th list item (the dom representation of an email) corresponds to 
                        // the n-th message model in the filteredMessages array
                        listItem = listItems.item(i).getBoundingClientRect();
                        message = scope.filteredMessages[i];

                        isPartiallyVisibleTop = listItem.top < top && listItem.bottom > top; // a portion of the list item is visible on the top
                        isPartiallyVisibleBottom = listItem.top < bottom && listItem.bottom > bottom; // a portion of the list item is visible on the bottom
                        isVisible = listItem.top >= top && listItem.bottom <= bottom; // the list item is visible as a whole

                        if (isPartiallyVisibleTop || isVisible || isPartiallyVisibleBottom) {
                            scope.getBody(message);
                        }
                    }
                }
            }
        };
    });

    return MailListCtrl;
});