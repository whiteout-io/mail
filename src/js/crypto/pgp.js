/**
 * High level crypto api that handles all calls to OpenPGP.js
 */
define(function(require) {
    'use strict';

    var openpgp = require('openpgp').openpgp,
        openpgpUtil = require('openpgp').util,
        util = require('cryptoLib/util');

    var PGP = function() {
        openpgp.init();
    };

    /**
     * Generate a key pair for the user
     */
    PGP.prototype.generateKeys = function(options, callback) {
        var userId, keys;

        if (!util.validateEmailAddress(options.emailAddress) || !options.keySize || typeof options.passphrase !== 'string') {
            callback({
                errMsg: 'Crypto init failed. Not all options set!'
            });
            return;
        }

        // generate keypair (keytype 1=RSA)
        userId = 'Whiteout User <' + options.emailAddress + '>';
        keys = openpgp.generate_key_pair(1, options.keySize, userId, options.passphrase);

        callback(null, {
            keyId: openpgpUtil.hexstrdump(keys.privateKey.getKeyId()).toUpperCase(),
            privateKeyArmored: keys.privateKeyArmored,
            publicKeyArmored: keys.publicKeyArmored
        });
    };

    /**
     * Import the user's key pair
     */
    PGP.prototype.importKeys = function(options, callback) {
        // check passphrase
        if (typeof options.passphrase !== 'string' || !options.privateKeyArmored || !options.publicKeyArmored) {
            callback({
                errMsg: 'Importing keys failed. Not all options set!'
            });
            return;
        }

        // unlock and import private key 
        if (!openpgp.keyring.importPrivateKey(options.privateKeyArmored, options.passphrase)) {
            callback({
                errMsg: 'Incorrect passphrase!'
            });
            return;
        }
        // import public key
        openpgp.keyring.importPublicKey(options.publicKeyArmored);
        callback();
    };

    /**
     * Export the user's key pair
     */
    PGP.prototype.exportKeys = function(callback) {
        var publicKey, privateKey;

        privateKey = openpgp.keyring.exportPrivateKey(0);
        publicKey = openpgp.keyring.getPublicKeysForKeyId(privateKey.keyId)[0];

        if (privateKey && privateKey.keyId && privateKey.armored && publicKey && publicKey.armored) {
            callback(null, {
                keyId: openpgpUtil.hexstrdump(privateKey.keyId).toUpperCase(),
                privateKeyArmored: privateKey.armored,
                publicKeyArmored: publicKey.armored
            });
            return;
        }

        callback({
            errMsg: 'Could not export keys!'
        });
    };

    /**
     * Encrypt and sign a pgp message for a list of receivers
     */
    PGP.prototype.encrypt = function(plaintext, receiverPublicKeys, callback) {
        var ct, i,
            privateKey = openpgp.keyring.exportPrivateKey(0).obj;

        for (i = 0; i < receiverPublicKeys.length; i++) {
            receiverPublicKeys[i] = openpgp.read_publicKey(receiverPublicKeys[i])[0];
        }

        ct = openpgp.write_signed_and_encrypted_message(privateKey, receiverPublicKeys, plaintext);

        callback(null, ct);
    };

    /**
     * Decrypt and verify a pgp message for a single sender
     */
    PGP.prototype.decrypt = function(ciphertext, senderPublicKey, callback) {
        var privateKey = openpgp.keyring.exportPrivateKey(0).obj;
        senderPublicKey = openpgp.read_publicKey(senderPublicKey)[0];

        var msg = openpgp.read_message(ciphertext)[0];
        var keymat = null;
        var sesskey = null;

        // Find the private (sub)key for the session key of the message
        for (var i = 0; i < msg.sessionKeys.length; i++) {
            if (privateKey.privateKeyPacket.publicKey.getKeyId() === msg.sessionKeys[i].keyId.bytes) {
                keymat = {
                    key: privateKey,
                    keymaterial: privateKey.privateKeyPacket
                };
                sesskey = msg.sessionKeys[i];
                break;
            }
            for (var j = 0; j < privateKey.subKeys.length; j++) {
                if (privateKey.subKeys[j].publicKey.getKeyId() === msg.sessionKeys[i].keyId.bytes) {
                    keymat = {
                        key: privateKey,
                        keymaterial: privateKey.subKeys[j]
                    };
                    sesskey = msg.sessionKeys[i];
                    break;
                }
            }
        }
        if (keymat !== null) {
            var decrypted = msg.decryptAndVerifySignature(keymat, sesskey, senderPublicKey);
            callback(null, decrypted.text);

        } else {
            callback({
                errMsg: 'No private key found!'
            });
        }
    };

    return PGP;
});