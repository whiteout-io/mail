define(function(require) {
    'use strict';

    var appController = require('js/app-controller');

    var MessageListCtrl = function($scope) {
        $scope.folderName = 'Inbox';

        $scope.select = function(email) {
            $scope.selected = email;
        };

        fetchList(function(err, emails) {
            if (err) {
                console.log(err);
                return;
            }

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
            }, callback);
        });
    }

    return MessageListCtrl;
});