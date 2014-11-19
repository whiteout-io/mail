'use strict';

var appController = require('../app-controller'),
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
            $scope.passphraseMsg = undefined;
        }
    };

    //
    // scope variables
    //

    //
    // scope functions
    //

    /*
     * Taken from jQuery validate.password plug-in 1.0
     * http://bassistance.de/jquery-plugins/jquery-plugin-validate.password/
     *
     * Copyright (c) 2009 Jörn Zaefferer
     *
     * Licensed under the MIT
     *   http://www.opensource.org/licenses/mit-license.php
     */
    $scope.checkPassphraseQuality = function() {
        var passphrase = $scope.newPassphrase;
        $scope.passphraseRating = 0;

        var LOWER = /[a-z]/,
            UPPER = /[A-Z]/,
            DIGIT = /[0-9]/,
            DIGITS = /[0-9].*[0-9]/,
            SPECIAL = /[^a-zA-Z0-9]/,
            SAME = /^(.)\1+$/;

        function uncapitalize(str) {
            return str.substring(0, 1).toLowerCase() + str.substring(1);
        }

        if (!passphrase) {
            // no rating for empty passphrase
            $scope.passphraseMsg = '';
            return;
        }

        if (passphrase.length < 8 || SAME.test(passphrase)) {
            $scope.passphraseMsg = 'Very weak';
            return;
        }

        var lower = LOWER.test(passphrase),
            upper = UPPER.test(uncapitalize(passphrase)),
            digit = DIGIT.test(passphrase),
            digits = DIGITS.test(passphrase),
            special = SPECIAL.test(passphrase);

        if (lower && upper && digit || lower && digits || upper && digits || special) {
            $scope.passphraseMsg = 'Strong';
            $scope.passphraseRating = 3;
        } else if (lower && upper || lower && digit || upper && digit) {
            $scope.passphraseMsg = 'Good';
            $scope.passphraseRating = 2;
        } else {
            $scope.passphraseMsg = 'Weak';
            $scope.passphraseRating = 1;
        }
    };

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

module.exports = SetPassphraseCtrl;