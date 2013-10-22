define(function(require) {
    'use strict';

    var angular = require('angular'),
        appController = require('js/app-controller');

    var LoginExistingCtrl = function($scope, $location) {
        $scope.confirmPassphrase = function() {
            var passphrase = $scope.passphrase,
                emailDao = appController._emailDao;

            if (!passphrase) {
                return;
            }

            unlockCrypto(imapLogin);

            function unlockCrypto(callback) {
                var userId = emailDao._account.emailAddress;
                emailDao._keychain.getUserKeyPair(userId, function(err, keypair) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    keypair.privateKey = {
                        _id: keypair.publicKey._id,
                        userId: userId,
                        encryptedKey: $scope.key
                    };
                    emailDao.unlock(keypair, passphrase, function(err) {
                        if (err) {
                            callback(err);
                            return;
                        }

                        emailDao._keychain.putUserKeyPair(keypair, callback);
                    });
                });
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

    var ngModule = angular.module('login-new-device', []);
    ngModule.directive('fileReader', function() {
        return function(scope, elm) {
            elm.bind('change', function(e) {
                var files = e.target.files,
                    reader = new FileReader();

                if (files.length === 0) {
                    return;
                }

                reader.onload = (function(scope) {
                    return function(e) {
                        scope.key = e.target.result;
                    };
                })(scope);
                reader.readAsText(files[0]);
            });
        };
    });

    return LoginExistingCtrl;
});