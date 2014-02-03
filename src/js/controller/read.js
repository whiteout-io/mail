define(function(require) {
    'use strict';

    var appController = require('js/app-controller'),
        download = require('js/util/download'),
        angular = require('angular'),
        emailDao, crypto, keychain;

    //
    // Controller
    //

    var ReadCtrl = function($scope) {

        emailDao = appController._emailDao;
        crypto = appController._crypto;
        keychain = appController._keychain;

        // set default value so that the popover height is correct on init
        $scope.fingerprint = 'XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX';

        $scope.state.read = {
            open: false,
            toggle: function(to) {
                this.open = to;
            }
        };

        $scope.lineEmpty = function(line) {
            return line.replace(/>/g, '').trim().length === 0;
        };

        $scope.getFingerprint = function(address) {
            $scope.fingerprint = 'Fingerprint cannot be displayed. Public key not found for that user.';
            keychain.getReceiverPublicKey(address, function(err, pubkey) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                var fpr = crypto.getFingerprint(pubkey.publicKey);
                var formatted = fpr.slice(0, 4) + ' ' + fpr.slice(4, 8) + ' ' + fpr.slice(8, 12) + ' ' + fpr.slice(12, 16) + ' ' + fpr.slice(16, 20) + ' ' + fpr.slice(20, 24) + ' ' + fpr.slice(24, 28) + ' ' + fpr.slice(28, 32) + ' ' + fpr.slice(32, 36) + ' ' + fpr.slice(36);

                $scope.fingerprint = formatted;
                $scope.$apply();
            });
        };

        $scope.$watch('state.mailList.selected', function() {
            var mail = $scope.state.mailList.selected;
            if (!mail) {
                return;
            }

            // display sender security status
            mail.from.forEach(checkPublicKey);
            // display recipient security status
            mail.to.forEach(checkPublicKey);
            // display recipient security status
            Array.isArray(mail.cc) && mail.cc.forEach(checkPublicKey);
        });

        function checkPublicKey(user) {
            user.secure = undefined;
            keychain.getReceiverPublicKey(user.address, function(err, pubkey) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                if (pubkey && pubkey.publicKey) {
                    user.secure = true;
                } else {
                    user.secure = false;
                }

                $scope.$apply();
            });
        }

        $scope.download = function(attachment) {
            // download file to disk if content is available
            if (attachment.content) {
                saveToDisk(attachment);
                return;
            }

            var folder = $scope.state.nav.currentFolder;
            var email = $scope.state.mailList.selected;

            emailDao.getAttachment({
                path: folder.path,
                uid: email.uid,
                attachment: attachment
            }, function(err) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                saveToDisk(attachment);
            });

            function saveToDisk(attachment) {
                download.createDownload({
                    content: attachment.content,
                    filename: attachment.filename,
                    contentType: attachment.mimeType
                }, $scope.onError);
            }
        };
    };

    //
    // Directives
    //

    var ngModule = angular.module('read', []);
    ngModule.directive('frameLoad', function() {
        return function(scope, elm) {
            elm.bind('load', function() {
                var frame = elm[0];
                frame.height = frame.contentWindow.document.body.scrollHeight + 'px';
            });
        };
    });

    return ReadCtrl;
});