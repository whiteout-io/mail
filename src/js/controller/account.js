define(function(require) {
    'use strict';

    var appController = require('js/app-controller'),
        dl = require('js/util/download'),
        emailDao;

    //
    // Controller
    //

    var AccountCtrl = function($scope) {
        emailDao = appController._emailDao;

        $scope.state.account = {
            open: false,
            toggle: function(to) {
                this.open = to;
            }
        };

        //
        // scope variables
        //

        var fpr = emailDao._crypto.getFingerprint(),
            keyId = emailDao._crypto.getKeyId();
        $scope.eMail = emailDao._account.emailAddress;
        $scope.keyId = keyId.slice(8);
        $scope.fingerprint = fpr.slice(0, 4) + ' ' + fpr.slice(4, 8) + ' ' + fpr.slice(8, 12) + ' ' + fpr.slice(12, 16) + ' ' + fpr.slice(16, 20) + ' ' + fpr.slice(20, 24) + ' ' + fpr.slice(24, 28) + ' ' + fpr.slice(28, 32) + ' ' + fpr.slice(32, 36) + ' ' + fpr.slice(36);
        $scope.keysize = emailDao._account.asymKeySize;

        //
        // scope functions
        //

        $scope.exportKeyFile = function() {
            emailDao._crypto.exportKeys(function(err, keys) {
                if (err) {
                    console.error(err);
                    return;
                }

                var id = keys.keyId.substring(8, keys.keyId.length);
                dl.createDownload({
                    content: keys.publicKeyArmored + keys.privateKeyArmored,
                    filename: id + '.asc',
                    contentType: 'text/plain'
                }, onSave);
            });
        };

        function onSave(err) {
            if (err) {
                console.error(err);
                return;
            }
        }
    };

    return AccountCtrl;
});