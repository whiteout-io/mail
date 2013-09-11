define(function(require) {
    'use strict';

    var appController = require('js/app-controller'),
        moment = require('moment');

    var MessageListCtrl = function($scope, $routeParams) {
        $scope.folder = $routeParams.folder;
        $scope.messageId = $routeParams.messageId;

        $scope.select = function(email) {
            email.bodyDisplayParts = email.body.split('\n');
            $scope.selected = email;
        };

        if (true) {
            createDummyMails(function(emails) {
                $scope.emails = emails;
                $scope.select($scope.emails[0]);
            });
            return;
        }

        fetchList(function(emails) {
            $scope.emails = emails;
            $scope.$apply();
        });
    };

    function fetchList(callback) {
        appController.fetchOAuthToken('passphrase', function(err) {
            if (err) {
                console.log(err);
                return;
            }

            appController._emailDao.imapListMessages({
                folder: 'INBOX',
                offset: -6,
                num: 0
            }, function(err, emails) {
                if (err) {
                    console.log(err);
                    return;
                }

                addDisplayDate(emails);
                callback(emails);
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
        var Email = function(unread, attachments) {
            this.uid = '1';
            this.from = [{
                name: 'Whiteout Support',
                address: 'support@whiteout.io'
            }]; // sender address
            this.to = [{
                address: 'max.musterman@gmail.com'
            }]; // list of receivers
            this.attachments = attachments;
            this.unread = unread;
            this.displayDate = '23.08.13';
            this.longDisplayDate = 'Wednesday, 23.08.2013 19:23';
            this.subject = "Welcome Max"; // Subject line
            this.body = "Hi Max,\n" +
                "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.\n" +
                "Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi. Lorem ipsum dolor sit amet,\n" +
                "Best regards\nYour whiteout team"; // plaintext body
        };

        var dummys = [new Email(true, true), new Email(true), new Email(false, true), new Email(false), new Email(false), new Email(false)];

        callback(dummys);
    }

    return MessageListCtrl;
});