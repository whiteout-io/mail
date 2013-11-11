define(function(require) {
    'use strict';

    var appController = require('js/app-controller'),
        dl = require('js/util/download');

    var LoginInitialCtrl = function($scope, $location) {
        var emailDao = appController._emailDao,
            states;

        // global state... inherited to all child scopes
        $scope.$root.state = {};

        states = {
            IDLE: 1,
            PROCESSING: 2,
            DONE: 4
        };
        $scope.state.ui = states.IDLE; // initial state


        //
        // scope functions
        //

        $scope.confirmPassphrase = function() {
            var passphrase = $scope.state.passphrase,
                confirmation = $scope.state.confirmation;

            if (!passphrase || passphrase !== confirmation) {
                return;
            }

            setState(states.PROCESSING);
            setTimeout(function() {
                emailDao.unlock({}, passphrase, function(err) {
                    if (err) {
                        console.error(err);
                        setState(states.IDLE, true);
                        return;
                    }

                    setState(states.DONE, true);
                });
            }, 500);
        };

        $scope.exportKeypair = function() {
            // export keys from keychain
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

            function onSave(err) {
                if (err) {
                    console.error(err);
                    return;
                }
                $scope.proceed();
                $scope.$apply();
            }
        };

        $scope.proceed = function() {
            $location.path('/desktop');
        };

        function setState(state, async) {
            $scope.state.ui = state;

            if (async) {
                $scope.$apply();
            }
        }
    };

    return LoginInitialCtrl;
});