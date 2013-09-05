define(function(require) {
    'use strict';

    var appController = require('js/app-controller'),
        moment = require('moment');

    var MessageListCtrl = function($scope) {
        $scope.folderName = 'Inbox';

        $scope.select = function(email) {
            $scope.selected = email;
        };

        createDummyMails(function(emails) {
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
        var Email = function(unread) {
            this.from = [{
                name: 'Whiteout Support',
                address: 'support@whiteout.io'
            }]; // sender address
            this.to = [{
                address: 'max.musterman@gmail.com'
            }]; // list of receivers
            this.unread = unread;
            this.displayDate = '23.08.13';
            this.subject = "Welcome Max"; // Subject line
            this.body = "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy."; // plaintext body
        };

        var dummys = [new Email(true), new Email(true), new Email(false), new Email(false), new Email(false), new Email(false)];

        callback(dummys);
    }

    return MessageListCtrl;
});