define(function(require) {
    'use strict';

    var appController = require('js/app-controller'),
        moment = require('moment');

    var MessageListCtrl = function($scope) {
        $scope.folderName = 'Inbox';

        $scope.select = function(email) {
            $scope.selected = email;
        };

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

                emails.forEach(function(email) {
                    // set display date
                    email.displayDate = moment(email.sentDate).format('DD.MM.YY');
                });

                callback(emails);
            });
        });
    }

    return MessageListCtrl;
});