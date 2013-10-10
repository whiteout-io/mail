define(function(require) {
    'use strict';

    var _ = require('underscore'),
        appController = require('js/app-controller'),
        emailDao;

    var MailListCtrl = function($scope) {
        var offset = 0,
            num = 100,
            loggedIn = false;

        emailDao = appController._emailDao;

        //
        // scope functions
        //

        $scope.select = function(email) {
            if (!email) {
                return;
            }
            // split text only emails into parts for easier rendering
            if (!email.html && typeof email.body === 'string') {
                email.bodyDisplayParts = email.body.split('\n');
            }
            $scope.selected = email;
            // set selected in parent scope ro it can be displayed in the read view
            $scope.$parent.selected = $scope.selected;

            // mark selected message as 'read'
            markAsRead(email);
        };

        $scope.synchronize = function() {
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
                });
            });
        };

        $scope.$watch('currentFolder', function() {
            if (!getFolder()) {
                return;
            }

            // production... in chrome packaged app
            if (window.chrome && chrome.identity) {
                initList();
                return;
            }

            // development... display dummy mail objects
            updateStatus('Last update: ', new Date());
            $scope.emails = createDummyMails();
            $scope.select($scope.emails[0]);
        });

        //
        // helper functions
        //

        function initList() {
            updateStatus('Read cache ...');

            // list messaged from local db
            listLocalMessages({
                folder: getFolder().path,
                offset: offset,
                num: num
            }, function() {
                if (loggedIn) {
                    // user is already logged in
                    sync();
                    return;
                }
                // login to imap
                loginImap(function() {
                    loggedIn = true;
                    sync();
                });
            });

            function sync() {
                updateStatus('Syncing ...');
                $scope.$apply();

                // sync imap folder to local db
                $scope.synchronize();
            }
        }

        function loginImap(callback) {
            updateStatus('Login ...');
            $scope.$apply();

            emailDao.imapLogin(function(err) {
                if (err) {
                    console.log(err);
                    updateStatus('Error on login!');
                    $scope.$apply();
                    return;
                }

                callback();
            });
        }

        function syncImapFolder(options, callback) {
            emailDao.unreadMessages(getFolder().path, function(err, unreadCount) {
                if (err) {
                    console.log(err);
                    updateStatus('Error on sync!');
                    $scope.$apply();
                    return;
                }
                // set unread count in folder model
                getFolder().count = unreadCount;
                $scope.$apply();

                emailDao.imapSync(options, function(err) {
                    if (err) {
                        console.log(err);
                        updateStatus('Error on sync!');
                        $scope.$apply();
                        return;
                    }

                    callback();
                });
            });
        }

        function listLocalMessages(options, callback) {
            emailDao.listMessages(options, function(err, emails) {
                if (err) {
                    console.log(err);
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
            $scope.$parent.lastUpdateLbl = $scope.lastUpdateLbl;
            $scope.$parent.lastUpdate = $scope.lastUpdate;
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
            return $scope.$parent.currentFolder;
        }

        function markAsRead(email) {
            email.unread = false;

            // only update imap state if user is logged in
            if (!loggedIn) {
                return;
            }

            emailDao.imapMarkMessageRead({
                folder: getFolder().path,
                uid: email.uid
            }, function(err) {
                if (err) {
                    console.log(err);
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

    return MailListCtrl;
});