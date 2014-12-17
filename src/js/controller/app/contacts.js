'use strict';

//
// Controller
//

var ContactsCtrl = function($scope, $q, keychain, pgp, dialog) {

    //
    // scope state
    //

    $scope.state.contacts = {
        toggle: function(to) {
            $scope.state.lightbox = (to) ? 'contacts' : undefined;
            return $scope.listKeys();
        }
    };

    //
    // scope functions
    //

    $scope.listKeys = function() {
        return $q(function(resolve) {
            resolve();

        }).then(function() {
            return keychain.listLocalPublicKeys();

        }).then(function(keys) {
            // add params to key objects
            keys.forEach(function(key) {
                var params = pgp.getKeyParams(key.publicKey);
                _.extend(key, params);
            });
            $scope.keys = keys;

        }).catch(dialog.error);
    };

    $scope.getFingerprint = function(key) {
        var fpr = key.fingerprint;
        var formatted = fpr.slice(0, 4) + ' ' + fpr.slice(4, 8) + ' ' + fpr.slice(8, 12) + ' ' + fpr.slice(12, 16) + ' ' + fpr.slice(16, 20) + ' ... ' + fpr.slice(20, 24) + ' ' + fpr.slice(24, 28) + ' ' + fpr.slice(28, 32) + ' ' + fpr.slice(32, 36) + ' ' + fpr.slice(36);

        $scope.fingerprint = formatted;
    };

    $scope.importKey = function(publicKeyArmored) {
        var keyParams, pubkey;

        // verifiy public key string
        if (publicKeyArmored.indexOf('-----BEGIN PGP PUBLIC KEY BLOCK-----') < 0) {
            dialog.error({
                showBugReporter: false,
                message: 'Invalid public key!'
            });
            return;
        }

        try {
            keyParams = pgp.getKeyParams(publicKeyArmored);
        } catch (e) {
            dialog.error(new Error('Error reading public key params!'));
            return;
        }

        pubkey = {
            _id: keyParams._id,
            userId: keyParams.userId,
            userIds: keyParams.userIds,
            publicKey: publicKeyArmored,
            imported: true // mark manually imported keys
        };

        return keychain.saveLocalPublicKey(pubkey).then(function() {
            // update displayed keys
            return $scope.listKeys();
        }).catch(dialog.error);
    };

    $scope.removeKey = function(key) {
        return keychain.removeLocalPublicKey(key._id).then(function() {
            // update displayed keys
            return $scope.listKeys();
        }).catch(dialog.error);
    };

};

module.exports = ContactsCtrl;