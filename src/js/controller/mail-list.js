define(function(require) {
    'use strict';

    var angular = require('angular'),
        appController = require('js/app-controller'),
        IScroll = require('iscroll'),
        str = require('js/app-config').string,
        cfg = require('js/app-config').config,
        emailDao, outboxBo;

    var MailListCtrl = function($scope) {
        var firstSelect = true;

        //
        // Init
        //

        emailDao = appController._emailDao;
        outboxBo = appController._outboxBo;

        // // push handler
        // if (emailDao) {
        //     emailDao.onIncomingMessage = function(email) {
        //         if (email.subject.indexOf(str.subjectPrefix) === -1) {
        //             return;
        //         }

        //         // sync
        //         $scope.synchronize(function() {
        //             // show notification
        //             notificationForEmail(email);
        //         });
        //     };
        //     chrome.notifications.onClicked.addListener(notificationClicked);
        // }

        // function notificationClicked(uidString) {
        //     var email, uid = parseInt(uidString, 10);

        //     if (isNaN(uid)) {
        //         return;
        //     }

        //     email = _.findWhere(getFolder().messages, {
        //         uid: uid
        //     });

        //     if (email) {
        //         $scope.select(email);
        //     }
        // }

        //
        // scope functions
        //

        $scope.select = function(email) {
            if (!email) {
                $scope.state.mailList.selected = undefined;
                return;
            }

            $scope.state.mailList.selected = email;

            // // mark selected message as 'read'
            // markAsRead(email);
        };

        $scope.synchronize = function() {
            // if we're in the outbox, don't do an imap sync
            if (getFolder().type === 'Outbox') {
                updateStatus('Last update: ', new Date());
                displayEmails(outboxBo.pendingEmails);
                return;
            }

            updateStatus('Syncing ...');

            // let email dao handle sync transparently
            emailDao.sync({
                folder: getFolder().path
            }, function(err) {
                if (err) {
                    updateStatus('Error on sync!');
                    $scope.onError(err);
                    return;
                }

                // sort emails
                displayEmails(getFolder().messages);
                // display last update
                updateStatus('Last update: ', new Date());

                $scope.$apply();
            });
        };

        $scope.remove = function(email) {
            if (!email) {
                return;
            }

            // var index, currentFolder, trashFolder, outboxFolder;

            // currentFolder = getFolder();

            // trashFolder = _.findWhere($scope.folders, {
            //     type: 'Trash'
            // });

            // outboxFolder = _.findWhere($scope.folders, {
            //     type: 'Outbox'
            // });

            // if (currentFolder === outboxFolder) {
            //     $scope.onError({
            //         errMsg: 'Deleting messages from the outbox is not yet supported.'
            //     });
            //     return;
            // }

            // if (currentFolder === trashFolder) {
            //     $scope.state.dialog = {
            //         open: true,
            //         title: 'Delete',
            //         message: 'Delete this message permanently?',
            //         callback: function(ok) {
            //             if (!ok) {
            //                 return;
            //             }

            //             removeLocalAndShowNext();
            //             removeRemote();
            //         }
            //     };
            //     return;
            // }

            // removeLocalAndShowNext();
            // removeRemote();

            // function removeLocalAndShowNext() {
            //     index = getFolder().messages.indexOf(email);
            //     // show the next mail
            //     if (getFolder().messages.length > 1) {
            //         // if we're about to delete the last entry of the array, show the previous (i.e. the one below in the list), 
            //         // otherwise show the next one (i.e. the one above in the list)
            //         $scope.select(_.last(getFolder().messages) === email ? getFolder().messages[index - 1] : getFolder().messages[index + 1]);
            //     } else {
            //         // if we have only one email in the array, show nothing
            //         $scope.select();
            //         $scope.state.mailList.selected = undefined;
            //     }
            //     getFolder().messages.splice(index, 1);
            // }

            // function removeRemote() {
            //     if (getFolder() === trashFolder) {
            //         emailDao.imapDeleteMessage({
            //             folder: getFolder().path,
            //             uid: email.uid
            //         }, moved);
            //         return;
            //     }

            //     emailDao.imapMoveMessage({
            //         folder: getFolder().path,
            //         uid: email.uid,
            //         destination: trashFolder.path
            //     }, moved);
            // }

            // function moved(err) {
            //     if (err) {
            //         getFolder().messages.splice(index, 0, email);
            //         $scope.onError(err);
            //         return;
            //     }
            // }
        };

        $scope._stopWatchTask = $scope.$watch('state.nav.currentFolder', function() {
            if (!getFolder()) {
                return;
            }

            // development... display dummy mail objects
            if (!window.chrome || !chrome.identity) {
                firstSelect = true;
                updateStatus('Last update: ', new Date());
                getFolder().messages = createDummyMails();
                displayEmails(getFolder().messages);
                return;
            }

            // production... in chrome packaged app

            // if we're in the outbox, read directly from there.
            if (getFolder().type === 'Outbox') {
                updateStatus('Last update: ', new Date());
                displayEmails(outboxBo.pendingEmails);
                return;
            }

            displayEmails(getFolder().messages);

            $scope.synchronize();
        });

        // share local scope functions with root state
        $scope.state.mailList = {
            remove: $scope.remove,
            synchronize: $scope.synchronize
        };

        //
        // helper functions
        //

        // function notificationForEmail(email) {
        //     chrome.notifications.create('' + email.uid, {
        //         type: 'basic',
        //         title: email.from[0].address,
        //         message: email.subject.split(str.subjectPrefix)[1],
        //         iconUrl: chrome.runtime.getURL(cfg.iconPath)
        //     }, function() {});
        // }

        function updateStatus(lbl, time) {
            $scope.lastUpdateLbl = lbl;
            $scope.lastUpdate = (time) ? time : '';
        }

        function displayEmails(emails) {
            if (!emails || emails.length < 1) {
                $scope.select();
                return;
            }

            // select first message
            $scope.select(emails[emails.length - 1]);
        }

        function getFolder() {
            return $scope.state.nav.currentFolder;
        }

        // function markAsRead(email) {
        //     // marking mails as read is meaningless in the outbox
        //     if (getFolder().type === 'Outbox') {
        //         return;
        //     }

        //     // don't mark top selected email automatically
        //     if (firstSelect) {
        //         firstSelect = false;
        //         return;
        //     }

        //     $scope.state.read.toggle(true);
        //     if (!window.chrome || !chrome.socket) {
        //         return;
        //     }

        //     if (!email.unread) {
        //         return;
        //     }

        //     email.unread = false;
        //     emailDao.imapMarkMessageRead({
        //         folder: getFolder().path,
        //         uid: email.uid
        //     }, function(err) {
        //         if (err) {
        //             updateStatus('Error marking read!');
        //             $scope.onError(err);
        //             return;
        //         }
        //     });
        // }
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
            this.attachments = (attachments) ? [true] : undefined;
            this.unread = unread;
            this.answered = answered;
            this.html = html;
            this.sentDate = new Date('Thu Sep 19 2013 20:41:23 GMT+0200 (CEST)');
            this.subject = 'Getting started'; // Subject line
            this.body = 'Here are a few pointers to help you get started with Whiteout Mail.\n\n# Write encrypted message\n- You can compose a message by clicking on the compose button on the upper right (keyboard shortcut is "n" for a new message or "r" to reply).\n- When typing the recipient\'s email address, secure recipients are marked with a blue label and insecure recipients are red.\n- When sending an email to insecure recipients, the default behavior for Whiteout Mail is to invite them to the service and only send the message content in an encrypted form, once they have joined.\n\n# Advanced features\n- To verify a recipient\'s PGP key, you can hover over the blue label containing their email address and their key fingerprint will be displayed.\n- To view your own key fingerprint, open the account view in the navigation bar on the left. You can compare these with your correspondants over a second channel such as a phonecall.\n\nWe hope this helped you to get started with Whiteout Mail.\n\nYour Whiteout Networks team'; // plaintext body
        };

        var dummys = [new Email(true, true), new Email(true, false, false, true), new Email(false, true, true), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false)];

        return dummys;
    }

    //
    // Directives
    //

    var ngModule = angular.module('mail-list', []);
    ngModule.directive('ngIscroll', function($parse) {
        return {
            link: function(scope, elm, attrs) {
                var model = $parse(attrs.ngIscroll);
                scope.$watch(model, function() {
                    var myScroll;
                    // activate iscroll
                    myScroll = new IScroll(elm[0], {
                        mouseWheel: true
                    });
                });
            }
        };
    });

    return MailListCtrl;
});