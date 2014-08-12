define(function(require) {
    'use strict';

    var appController = require('js/app-controller'),
        pgp, keychain;

    //
    // Controller
    //

    var SetPassphraseCtrl = function($scope) {
        keychain = appController._keychain;
        pgp = appController._pgp;

        $scope.state.setPassphrase = {
            toggle: function(to) {
                $scope.state.lightbox = (to) ? 'set-passphrase' : undefined;

                $scope.newPassphrase = undefined;
                $scope.oldPassphrase = undefined;
                $scope.confirmation = undefined;
            }
        };

        //
        // scope variables
        //

        //
        // scope functions
        //

        $scope.setPassphrase = function() {
            var keyId = pgp.getKeyParams()._id;
            keychain.lookupPrivateKey(keyId, function(err, savedKey) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                pgp.changePassphrase({
                    privateKeyArmored: savedKey.encryptedKey,
                    oldPassphrase: $scope.oldPassphrase,
                    newPassphrase: $scope.newPassphrase
                }, onPassphraseChanged);
            });
        };

        function onPassphraseChanged(err, newPrivateKeyArmored) {
            if (err) {
                err.showBugReporter = false;
                $scope.onError(err);
                return;
            }

            // persist new armored key
            var keyParams = pgp.getKeyParams(newPrivateKeyArmored);
            var privateKey = {
                _id: keyParams._id,
                userId: keyParams.userId,
                userIds: keyParams.userIds,
                encryptedKey: newPrivateKeyArmored
            };

            keychain.saveLocalPrivateKey(privateKey, onKeyPersisted);
        }

        function onKeyPersisted(err) {
            if (err) {
                $scope.onError(err);
                return;
            }

            $scope.state.setPassphrase.toggle(false);
            $scope.$apply();
            $scope.onError({
                title: 'Success',
                message: 'Passphrase change complete.'
            });
        }
    };

    return SetPassphraseCtrl;
});