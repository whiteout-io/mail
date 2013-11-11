define(function(require) {
    'use strict';

    var _ = require('underscore'),
        angular = require('angular'),
        appController = require('js/app-controller'),
        IScroll = require('iscroll'),
        str = require('js/app-config').string,
        cfg = require('js/app-config').config,
        emailDao;

    var MailListCtrl = function($scope) {
        var offset = 0,
            num = 100,
            firstSelect = true;

        //
        // Init
        //

        emailDao = appController._emailDao;
        if (emailDao) {
            emailDao.onIncomingMessage = function(email) {
                if (email.subject.indexOf(str.subjectPrefix) === -1) {
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

            email = _.findWhere($scope.emails, {
                uid: uid
            });

            if (email) {
                $scope.select(email);
            }
        }

        //
        // scope functions
        //

        $scope.select = function(email) {
            if (!email) {
                $scope.state.mailList.selected = undefined;
                return;
            }
            // split text only emails into parts for easier rendering
            if (!email.html && typeof email.body === 'string') {
                email.bodyDisplayParts = [];
                var parts = email.body.split('\n');
                parts.forEach(function(part) {
                    if (part.trim().length > 0) {
                        email.bodyDisplayParts.push(part);
                    }
                });
            }

            $scope.state.mailList.selected = email;

            // mark selected message as 'read'
            markAsRead(email);
        };

        $scope.synchronize = function(callback) {
            updateStatus('Syncing ...');
            // sync from imap to local db
            syncImapFolder({
                folder: getFolder().path,
                offset: -num,
                num: offset
            }, function() {
                // list again from local db after syncing
                listLocalMessages({
                    folder: getFolder().path,
                    offset: offset,
                    num: num
                }, function() {
                    updateStatus('Last update: ', new Date());
                    if (callback) {
                        callback();
                    }
                });
            });
        };

        $scope.remove = function(email) {
            if (!email) {
                return;
            }

            var index, trashFolder;

            trashFolder = _.findWhere($scope.folders, {
                type: 'Trash'
            });

            if (getFolder() === trashFolder) {
                $scope.state.dialog = {
                    open: true,
                    title: 'Delete',
                    message: 'Delete this message permanently?',
                    callback: function(ok) {
                        if (!ok) {
                            return;
                        }

                        removeLocalAndShowNext();
                        removeRemote();
                    }
                };
                return;
            }

            removeLocalAndShowNext();
            removeRemote();

            function removeLocalAndShowNext() {
                index = $scope.emails.indexOf(email);
                // show the next mail
                if ($scope.emails.length > 1) {
                    // if we're about to delete the last entry of the array, show the previous (i.e. the one below in the list), 
                    // otherwise show the next one (i.e. the one above in the list)
                    $scope.select(_.last($scope.emails) === email ? $scope.emails[index - 1] : $scope.emails[index + 1]);
                } else {
                    // if we have only one email in the array, show nothing
                    $scope.select();
                    $scope.state.mailList.selected = undefined;
                }
                $scope.emails.splice(index, 1);
            }

            function removeRemote() {
                if (getFolder() === trashFolder) {
                    emailDao.imapDeleteMessage({
                        folder: getFolder().path,
                        uid: email.uid
                    }, moved);
                    return;
                }

                emailDao.imapMoveMessage({
                    folder: getFolder().path,
                    uid: email.uid,
                    destination: trashFolder.path
                }, moved);
            }

            function moved(err) {
                if (err) {
                    console.error(err);
                    $scope.emails.splice(index, 0, email);
                    $scope.$apply();
                    return;
                }
            }
        };

        $scope.$watch('state.nav.currentFolder', function() {
            if (!getFolder()) {
                return;
            }

            // production... in chrome packaged app
            if (window.chrome && chrome.identity) {
                initList();
                return;
            }

            // development... display dummy mail objects
            firstSelect = true;
            updateStatus('Last update: ', new Date());
            $scope.emails = createDummyMails();
            $scope.select($scope.emails[0]);
        });

        // share local scope functions with root state
        $scope.state.mailList = {
            remove: $scope.remove,
            synchronize: $scope.synchronize
        };

        //
        // helper functions
        //

        function notificationForEmail(email) {
            chrome.notifications.create('' + email.uid, {
                type: 'basic',
                title: email.from[0].address,
                message: email.subject.split(str.subjectPrefix)[1],
                iconUrl: chrome.runtime.getURL(cfg.iconPath)
            }, function() {});
        }

        function initList() {
            updateStatus('Read cache ...');

            // list messaged from local db
            listLocalMessages({
                folder: getFolder().path,
                offset: offset,
                num: num
            }, function sync() {
                updateStatus('Syncing ...');
                $scope.$apply();

                // sync imap folder to local db
                $scope.synchronize();
            });
        }

        function syncImapFolder(options, callback) {
            emailDao.unreadMessages(getFolder().path, function(err, unreadCount) {
                if (err) {
                    $scope.onError(err);
                    updateStatus('Error on sync!');
                    $scope.$apply();
                    return;
                }
                // set unread count in folder model
                getFolder().count = unreadCount;
                $scope.$apply();

                emailDao.imapSync(options, function(err) {
                    if (err) {
                        $scope.onError(err);
                        updateStatus('Error on sync!');
                        $scope.$apply();
                        return;
                    }

                    callback();
                });
            });
        }

        function listLocalMessages(options, callback) {
            firstSelect = true;
            emailDao.listMessages(options, function(err, emails) {
                if (err) {
                    $scope.onError(err);
                    updateStatus('Error listing cache!');
                    $scope.$apply();
                    return;
                }

                callback(emails);
                displayEmails(emails);
            });
        }

        function updateStatus(lbl, time) {
            $scope.lastUpdateLbl = lbl;
            $scope.lastUpdate = (time) ? time : '';
        }

        function displayEmails(emails) {
            if (!emails || emails.length < 1) {
                $scope.emails = [];
                $scope.select();
                $scope.$apply();
                return;
            }

            // sort by uid
            emails = _.sortBy(emails, function(e) {
                return -e.uid;
            });

            $scope.emails = emails;
            $scope.select($scope.emails[0]);
            $scope.$apply();
        }

        function getFolder() {
            return $scope.state.nav.currentFolder;
        }

        function markAsRead(email) {
            // don't mark top selected email automatically
            if (firstSelect) {
                firstSelect = false;
                return;
            }

            $scope.state.read.toggle(true);
            if (!window.chrome || !chrome.socket) {
                return;
            }

            if (!email.unread) {
                return;
            }

            email.unread = false;
            emailDao.imapMarkMessageRead({
                folder: getFolder().path,
                uid: email.uid
            }, function(err) {
                if (err) {
                    $scope.onError(err);
                    updateStatus('Error marking read!');
                    $scope.$apply();
                    return;
                }
            });
        }
    };

    function createDummyMails() {
        var Email = function(unread, attachments, answered, html) {
            this.uid = '1';
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
            this.subject = "Welcome Max"; // Subject line
            this.body = "Hi Max,\n\n" +
                "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.\n\n" +
                "Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi. Lorem ipsum dolor sit amet.\n\n" +
                "Best regards\nYour whiteout team"; // plaintext body
        };

        var dummys = [new Email(true, true), new Email(true, false, false, true), new Email(false, true, true), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false)];

        return dummys;
    }

    //
    // Directives
    //

    var ngModule = angular.module('mail-list', []);
    ngModule.directive('ngIscroll', function($timeout) {
        return {
            link: function(scope, elm) {
                $timeout(function() {
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