define(function(require) {
    'use strict';

    var appController = require('js/app-controller'),
        emailDao;

    //
    // Controller
    //

    var AccountCtrl = function($scope) {
        emailDao = appController._emailDao;

        //
        // scope functions
        //

        $scope.hideAccountView = function() {
            $scope.$parent.$parent.accountOpen = false;
        };

        $scope.exportKeyFile = function() {
            emailDao._crypto.exportKeys(function(err, keys) {
                if (err) {
                    console.error(err);
                    return;
                }

                var id = keys.keyId.substring(8,keys.keyId.length);
                download(keys.publicKeyArmored + keys.privateKeyArmored, id + '.asc', 'text/plain');
            });
        };

        //
        // helper functions
        //

        function download(content, filename, contentType) {
            contentType = contentType || 'application/octet-stream';
            chrome.fileSystem.chooseEntry({
                type: 'saveFile',
                suggestedName: filename
            }, function(file) {
                if (!file) {
                    return;
                }
                file.createWriter(function(writer) {
                    writer.onerror = console.error;
                    writer.onwriteend = function() {};
                    writer.write(new Blob([content], { type: contentType }));
                }, console.error);
            });
        }

    };

    return AccountCtrl;
});