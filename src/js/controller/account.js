define(function(require) {
    'use strict';

    var appController = require('js/app-controller'),
        dl = require('js/util/download'),
        pgp, keychain, userId;

    //
    // Controller
    //

    var AccountCtrl = function($scope) {
        userId = appController._emailDao._account.emailAddress;
        keychain = appController._keychain;
        pgp = appController._crypto;

        $scope.state.account = {
            toggle: function(to) {
                $scope.state.lightbox = (to) ? 'account' : undefined;
            }
        };

        //
        // scope variables
        //

        var keyParams = pgp.getKeyParams();

        $scope.eMail = userId;
        $scope.keyId = keyParams._id.slice(8);
        var fpr = keyParams.fingerprint;
        $scope.fingerprint = fpr.slice(0, 4) + ' ' + fpr.slice(4, 8) + ' ' + fpr.slice(8, 12) + ' ' + fpr.slice(12, 16) + ' ' + fpr.slice(16, 20) + ' ' + fpr.slice(20, 24) + ' ' + fpr.slice(24, 28) + ' ' + fpr.slice(28, 32) + ' ' + fpr.slice(32, 36) + ' ' + fpr.slice(36);
        $scope.keysize = keyParams.bitSize;

        //
        // scope functions
        //

        $scope.exportKeyFile = function() {
            keychain.getUserKeyPair(userId, function(err, keys) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                var keyId = keys.publicKey._id;
                var file = 'whiteout_mail_' + userId + '_' + keyId.substring(8, keyId.length);

                dl.createDownload({
                    content: keys.publicKey.publicKey + keys.privateKey.encryptedKey,
                    filename: file + '.asc',
                    contentType: 'text/plain'
                }, onExport);
            });
        };

        function onExport(err) {
            if (err) {
                $scope.onError(err);
                return;
            }

            $scope.state.account.toggle(false);
            $scope.$apply();
            $scope.onError({
                title: 'Success',
                message: 'Exported keypair to file.'
            });
        }
    };

    return AccountCtrl;
});