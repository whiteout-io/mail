'use strict';

var appController = require('../app-controller');

var LoginCtrl = function($scope, $location) {

    // start main application controller
    appController.start({
        onError: $scope.onError
    }, function(err) {
        if (err) {
            $scope.onError(err);
            return;
        }

        // check for app update
        appController.checkForUpdate();

        initializeUser();
    });

    // TODO: move to Account service login function

    function initializeUser() {
        // get OAuth token from chrome
        appController._auth.getEmailAddress(function(err, info) {
            if (err) {
                $scope.onError(err);
                return;
            }

            // check if account needs to be selected
            if (!info.emailAddress) {
                goTo('/add-account');
                return;
            }

            // initiate controller by creating email dao
            appController.init({
                emailAddress: info.emailAddress,
                realname: info.realname
            }, function(err, availableKeys) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                redirect(availableKeys);
            });
        });
    }

    function redirect(availableKeys) {
        if (availableKeys && availableKeys.publicKey && availableKeys.privateKey) {
            // public and private key available, try empty passphrase
            appController._emailDao.unlock({
                keypair: availableKeys,
                passphrase: undefined
            }, function(err) {
                if (err) {
                    goTo('/login-existing');
                    return;
                }

                appController._auth.storeCredentials(function(err) {
                    if (err) {
                        return $scope.onError(err);
                    }

                    goTo('/desktop');
                });
            });
        } else if (availableKeys && availableKeys.publicKey && !availableKeys.privateKey) {
            // check if private key is synced
            appController._keychain.requestPrivateKeyDownload({
                userId: availableKeys.publicKey.userId,
                keyId: availableKeys.publicKey._id,
            }, function(err, privateKeySynced) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                if (privateKeySynced) {
                    // private key is synced, proceed to download
                    goTo('/login-privatekey-download');
                    return;
                }

                // no private key, import key file
                goTo('/login-new-device');
            });
        } else {
            // no public key available, start onboarding process
            goTo('/login-initial');
        }
    }

    function goTo(location) {
        $scope.$apply(function() {
            $location.path(location);
        });
    }
};

module.exports = LoginCtrl;