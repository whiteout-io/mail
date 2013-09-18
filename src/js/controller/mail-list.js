define(function(require) {
    'use strict';

    var _ = require('underscore'),
        appController = require('js/app-controller'),
        moment = require('moment'),
        emailDao;

    var MailListCtrl = function($scope, $routeParams) {
        $scope.folder = $routeParams.folder;
        $scope.messageId = $routeParams.messageId;
        emailDao = appController._emailDao;

        $scope.select = function(email) {
            email.bodyDisplayParts = email.body.split('\n');
            $scope.selected = email;
        };

        $scope.write = function(replyTo) {
            var replyToId = (replyTo) ? replyTo.uid : '',
                url = 'index.html#/write/' + replyToId;

            if (window.chrome && chrome.app.window) {
                chrome.app.window.create(url, {
                    'bounds': {
                        'width': 800,
                        'height': 700
                    }
                });
                return;
            }

            window.open(url, 'Compose Message', 'toolbar=no,width=800,height=700,left=500,top=200,status=no,scrollbars=no,resize=no');
        };

        if (false && window.chrome && chrome.identity) {
            fetchList($scope.folder, function(emails) {
                $scope.emails = emails;
                $scope.select($scope.emails[0]);
                $scope.$apply();
            });
            return;
        }

        createDummyMails(function(emails) {
            $scope.emails = emails;
            $scope.select($scope.emails[0]);
        });
    };

    function fetchList(folder, callback) {
        // fetch imap folder's message list
        emailDao.imapListMessages({
            folder: folder,
            offset: -6,
            num: 0
        }, function(err, emails) {
            if (err) {
                console.log(err);
                return;
            }

            // fetch message bodies
            fetchBodies(emails, folder, function(messages) {
                addDisplayDate(messages);
                callback(messages);
            });
        });
    }

    function fetchBodies(messageList, folder, callback) {
        var emails = [];

        var after = _.after(messageList.length, function() {
            callback(emails);
        });

        _.each(messageList, function(messageItem) {
            emailDao.imapGetMessage({
                folder: folder,
                uid: messageItem.uid
            }, function(err, message) {
                if (err) {
                    console.log(err);
                    return;
                }

                emails.push(message);
                after();
            });
        });
    }

    function addDisplayDate(emails) {
        emails.forEach(function(email) {
            // set display date
            email.displayDate = moment(email.sentDate).format('DD.MM.YY');
        });

        return emails;
    }

    function createDummyMails(callback) {
        var Email = function(unread, attachments, replied) {
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
            this.replied = replied;
            this.displayDate = '23.08.13';
            this.longDisplayDate = 'Wednesday, 23.08.2013 19:23';
            this.subject = "Welcome Max"; // Subject line
            this.body = "Hi Max,\n\n" +
                "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.\n\n" +
                "Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi. Lorem ipsum dolor sit amet.\n\n" +
                "Best regards\nYour whiteout team"; // plaintext body
        };

        var dummys = [new Email(true, true), new Email(true), new Email(false, true, true), new Email(false), new Email(false), new Email(false)];

        callback(dummys);
    }

    return MailListCtrl;
});