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
            var userId = emailDao._account.emailAddress;
            emailDao._keychain.getUserKeyPair(userId, function(err, keypair) {
                if (err) {
                    console.error(err);
                    return;
                }

                download(keypair.privateKey.encryptedKey, 'key_' + userId + '.asc', 'text/plain');
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