define(function(require) {
    'use strict';

    var appController = require('js/app-controller');

    var LoginInitialCtrl = function($scope, $location) {

        $scope.confirmPassphrase = function() {
            var passphrase = $scope.passphrase,
                confirmation = $scope.confirmation,
                emailDao = appController._emailDao;

            if (!passphrase || passphrase !== confirmation) {
                return;
            }

            unlockCrypto(imapLogin);

            function unlockCrypto(callback) {
                emailDao.unlock({}, passphrase, callback);
            }

            function imapLogin(err) {
                if (err) {
                    console.error(err);
                    return;
                }

                // login to imap backend
                appController._emailDao.imapLogin(function(err) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    onLogin();
                });
            }
        };

        function onLogin() {
            $location.path('/desktop');
            $scope.$apply();
        }
    };

    return LoginInitialCtrl;
});
