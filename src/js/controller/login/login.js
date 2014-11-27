'use strict';

var LoginCtrl = function($scope, $timeout, $location, updateHandler, account, auth, email, keychain, dialog) {

    // check for app update
    updateHandler.checkForUpdate();
    // initialize the user account
    initializeUser();

    function initializeUser() {
        // init the auth modules
        auth.init();
        // get OAuth token from chrome
        auth.getEmailAddress(function(err, info) {
            if (err) {
                dialog.error(err);
                return;
            }

            // check if account needs to be selected
            if (!info.emailAddress) {
                $scope.goTo('/add-account');
                return;
            }

            // initiate the account by initializing the email dao and user storage
            account.init({
                emailAddress: info.emailAddress,
                realname: info.realname
            }, function(err, availableKeys) {
                if (err) {
                    dialog.error(err);
                    return;
                }

                redirect(availableKeys);
            });
        });
    }

    function redirect(availableKeys) {
        if (availableKeys && availableKeys.publicKey && availableKeys.privateKey) {
            // public and private key available, try empty passphrase
            email.unlock({
                keypair: availableKeys,
                passphrase: undefined
            }, function(err) {
                if (err) {
                    $scope.goTo('/login-existing');
                    return;
                }

                auth.storeCredentials(function(err) {
                    if (err) {
                        return dialog.error(err);
                    }

                    $scope.goTo('/desktop');
                });
            });
        } else if (availableKeys && availableKeys.publicKey && !availableKeys.privateKey) {
            // check if private key is synced
            keychain.requestPrivateKeyDownload({
                userId: availableKeys.publicKey.userId,
                keyId: availableKeys.publicKey._id,
            }, function(err, privateKeySynced) {
                if (err) {
                    dialog.error(err);
                    return;
                }

                if (privateKeySynced) {
                    // private key is synced, proceed to download
                    $scope.goTo('/login-privatekey-download');
                    return;
                }

                // no private key, import key file
                $scope.goTo('/login-new-device');
            });
        } else {
            // no public key available, start onboarding process
            $scope.goTo('/login-initial');
        }
    }

    $scope.goTo = function(location) {
        return $timeout(function() {
            $location.path(location);
        });
    };
};

module.exports = LoginCtrl;