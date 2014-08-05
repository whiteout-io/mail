define(function(require) {
    'use strict';

    var angular = require('angular'),
        _ = require('underscore'),
        appController = require('js/app-controller'),
        keychain, pgp;

    //
    // Controller
    //

    var ContactsCtrl = function($scope) {
        keychain = appController._keychain,
        pgp = appController._pgp;

        $scope.state.contacts = {
            toggle: function(to) {
                $scope.state.lightbox = (to) ? 'contacts' : undefined;

                $scope.listKeys();
            }
        };

        // set default value so that the popover height is correct on init
        $scope.fingerprint = 'XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX';

        //
        // scope functions
        //

        $scope.listKeys = function() {
            keychain.listLocalPublicKeys(function(err, keys) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                keys.forEach(addParams);

                $scope.keys = keys;
                $scope.$apply();

                function addParams(key) {
                    var params = pgp.getKeyParams(key.publicKey);
                    _.extend(key, params);
                }
            });
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
                $scope.onError({
                    showBugReporter: false,
                    message: 'Invalid public key!'
                });
                return;
            }

            try {
                keyParams = pgp.getKeyParams(publicKeyArmored);
            } catch (e) {
                $scope.onError(new Error('Error reading public key params!'));
                return;
            }

            pubkey = {
                _id: keyParams._id,
                userId: keyParams.userId,
                userIds: keyParams.userIds,
                publicKey: publicKeyArmored,
                imported: true // mark manually imported keys
            };

            keychain.saveLocalPublicKey(pubkey, function(err) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                // update displayed keys
                $scope.listKeys();
            });
        };

        $scope.removeKey = function(key) {
            keychain.removeLocalPublicKey(key._id, function(err) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                // update displayed keys
                $scope.listKeys();
            });
        };
    };

    //
    // Directives
    //

    var ngModule = angular.module('contacts', []);

    ngModule.directive('keyfileInput', function() {
        return function(scope, elm) {
            elm.on('change', function(e) {
                for (var i = 0; i < e.target.files.length; i++) {
                    importKey(e.target.files.item(i));
                }
            });

            function importKey(file) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    scope.importKey(e.target.result);
                };
                reader.readAsText(file);
            }
        };
    });

    ngModule.directive('keyfileBtn', function() {
        return function(scope, elm) {
            elm.on('click touchstart', function(e) {
                e.preventDefault();
                document.querySelector('#keyfile-input').click();
            });
        };
    });

    return ContactsCtrl;
});