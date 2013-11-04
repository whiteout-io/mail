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