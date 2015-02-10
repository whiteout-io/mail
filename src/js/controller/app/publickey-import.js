'use strict';

//
// Controller
//

var PublickeyImportCtrl = function($scope, $q, keychain, pgp, hkp, dialog, appConfig) {

    //
    // scope state
    //

    $scope.state.publickeyImport = {
        toggle: function(to) {
            $scope.state.lightbox = (to) ? 'publickey-import' : undefined;
        }
    };

    //
    // scope variables
    //

    $scope.hkpUrl = appConfig.config.hkpUrl.replace(/http[s]?:\/\//, '');

    //
    // scope functions
    //

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
            $scope.pastedKey = '';
            // display success message
            return dialog.info({
                title: 'Success',
                message: 'Public key ' + keyParams._id + ' for ' + keyParams.userId + ' imported successfully!'
            });
        }).catch(dialog.error);
    };

    $scope.lookupKey = function(query) {
        var keyUrl = hkp.getIndexUrl(query);

        return dialog.info({
            title: 'Link',
            message: 'Follow this link and paste the PGP key block above...',
            faqLink: keyUrl,
            faqLinkTitle: keyUrl
        });
    };
};

module.exports = PublickeyImportCtrl;