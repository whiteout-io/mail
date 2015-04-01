'use strict';

var LoginCtrl = function($scope, $timeout, $location, updateHandler, account, auth, email, keychain, dialog, appConfig) {

    //
    // Scope functions
    //

    $scope.init = function() {
        // initialize the user account
        return auth.init().then(function() {
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
    };

    function redirect(availableKeys) {
        if (availableKeys && availableKeys.publicKey && availableKeys.privateKey) {
            // public and private key available, try empty passphrase
            var passphraseIncorrect;
            return email.unlock({
                keypair: availableKeys,
                passphrase: undefined
            }).catch(function() {
                passphraseIncorrect = true;
                // passphrase set... ask for passphrase
                return $scope.goTo('/login-existing');

            }).then(function() {
                if (passphraseIncorrect) {
                    return;
                }
                // no passphrase set... go to main screen
                return auth.storeCredentials().then(function() {
                    return $scope.goTo('/account');
                });
            });

        } else if (availableKeys && availableKeys.publicKey && !availableKeys.privateKey) {
            // proceed to private key download
            return $scope.goTo('/login-privatekey-download');

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

    //
    // Start the app
    //

    // check for app update
    updateHandler.checkForUpdate();

    // init the app
    if (!appConfig.preventAutoStart) {
        $scope.init();
    }

};

module.exports = LoginCtrl;