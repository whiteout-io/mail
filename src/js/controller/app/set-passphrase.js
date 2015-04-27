'use strict';

var SetPassphraseCtrl = function($scope, $q, pgp, keychain, dialog) {

    //
    // scope variables
    //

    $scope.state.setPassphrase = {
        toggle: function(to) {
            $scope.state.lightbox = (to) ? 'set-passphrase' : undefined;

            $scope.newPassphrase = undefined;
            $scope.oldPassphrase = undefined;
            $scope.confirmation = undefined;
            $scope.passphraseMsg = undefined;
        }
    };

    //
    // scope functions
    //

    $scope.setPassphrase = function() {
        var keyId = pgp.getKeyParams()._id;

        return $q(function(resolve) {
            resolve();

        }).then(function() {
            return keychain.lookupPrivateKey(keyId);

        }).then(function(savedKey) {
            // change passphrase
            return pgp.changePassphrase({
                privateKeyArmored: savedKey.encryptedKey,
                oldPassphrase: $scope.oldPassphrase,
                newPassphrase: $scope.newPassphrase
            }).catch(function(err) {
                err.showBugReporter = false;
                throw err;
            });

        }).then(function(newPrivateKeyArmored) {
            // persist new armored key
            var keyParams = pgp.getKeyParams(newPrivateKeyArmored);
            var privateKey = {
                _id: keyParams._id,
                userId: keyParams.userId,
                userIds: keyParams.userIds,
                encryptedKey: newPrivateKeyArmored
            };
            return keychain.saveLocalPrivateKey(privateKey);

        }).then(function() {
            $scope.state.setPassphrase.toggle(false);
            return dialog.info({
                title: 'Success',
                message: 'Passphrase change complete.'
            });

        }).catch(dialog.error);
    };
};

module.exports = SetPassphraseCtrl;