'use strict';

var LoginCtrl = function($scope, $timeout, $location, updateHandler, account, auth, email, keychain, dialog) {

    // check for app update
    updateHandler.checkForUpdate();

    // initialize the user account
    auth.init().then(function() {
        // get email address
        return auth.getEmailAddress();

    }).then(function(info) {
        // check if account needs to be selected
        if (!info.emailAddress) {
            return $scope.goTo('/add-account');
        }

        // initiate the account by initializing the email dao and user storage
        return account.init({
            emailAddress: info.emailAddress,
            realname: info.realname
        }).then(function(availableKeys) {
            return redirect(availableKeys);
        });

    }).catch(dialog.error);

    function redirect(availableKeys) {
        if (availableKeys && availableKeys.publicKey && availableKeys.privateKey) {
            // public and private key available, try empty passphrase
            return email.unlock({
                keypair: availableKeys,
                passphrase: undefined
            }).then(function() {
                // no passphrase set... go to main screen
                return auth.storeCredentials().then(function() {
                    return $scope.goTo('/account');
                });

            }).catch(function() {
                // passphrase set... ask for passphrase
                return $scope.goTo('/login-existing');
            });

        } else if (availableKeys && availableKeys.publicKey && !availableKeys.privateKey) {
            // check if private key is synced
            return keychain.requestPrivateKeyDownload({
                userId: availableKeys.publicKey.userId,
                keyId: availableKeys.publicKey._id,
            }).then(function(privateKeySynced) {
                if (privateKeySynced) {
                    // private key is synced, proceed to download
                    return $scope.goTo('/login-privatekey-download');
                } else {
                    // no private key, import key file
                    return $scope.goTo('/login-new-device');
                }
            });

        } else {
            // no public key available, start onboarding process
            return $scope.goTo('/login-initial');
        }
    }

    $scope.goTo = function(location) {
        return $timeout(function() {
            $location.path(location);
        });
    };
};

module.exports = LoginCtrl;