/**
 * High level crypto api that handles all calls to OpenPGP.js
 */
define(function(require) {
    'use strict';

    var openpgp = require('openpgp'),
        util = require('openpgp').util;

    var PGP = function() {};

    /**
     * Generate a key pair for the user
     */
    PGP.prototype.generateKeys = function(options, callback) {
        var keys, userId;

        if (!util.emailRegEx.test(options.emailAddress) || !options.keySize || typeof options.passphrase !== 'string') {
            callback({
                errMsg: 'Crypto init failed. Not all options set!'
            });
            return;
        }

        // generate keypair (keytype 1=RSA)
        try {
            userId = 'Whiteout User <' + options.emailAddress + '>';
            keys = openpgp.generateKeyPair(1, options.keySize, userId, options.passphrase);
        } catch (e) {
            callback({
                errMsg: 'Keygeneration failed!',
                err: e
            });
            return;
        }

        callback(null, {
            keyId: keys.key.getKeyPacket().getKeyId().toHex().toUpperCase(),
            privateKeyArmored: keys.privateKeyArmored,
            publicKeyArmored: keys.publicKeyArmored
        });
    };

    /**
     * Show a user's fingerprint
     */
    PGP.prototype.getFingerprint = function(keyArmored) {
        function fingerprint(key) {
            return util.hexstrdump(key.getKeyPacket().getFingerprint()).toUpperCase();
        }

        // process armored key input
        if (keyArmored) {
            return fingerprint(openpgp.key.readArmored(keyArmored).keys[0]);
        }

        if (!this._publicKey) {
            throw new Error('No public key set for fingerprint generation!');
        }

        // get local fingerpring
        return fingerprint(this._publicKey);
    };

    /**
     * Show a user's key id
     */
    PGP.prototype.getKeyId = function() {
        var pubKeyId, privKeyId;

        // check keys
        if (!this._privateKey || !this._publicKey) {
            return;
        }

        pubKeyId = this._publicKey.getKeyPacket().getKeyId().toHex().toUpperCase();
        privKeyId = this._privateKey.getKeyPacket().getKeyId().toHex().toUpperCase();

        if (!pubKeyId || !privKeyId || pubKeyId !== privKeyId) {
            console.error('Key IDs do not match!');
            return;
        }

        return pubKeyId;
    };

    /**
     * Import the user's key pair
     */
    PGP.prototype.importKeys = function(options, callback) {
        var pubKeyId, privKeyId, self = this;

        // check options
        if (typeof options.passphrase !== 'string' || !options.privateKeyArmored || !options.publicKeyArmored) {
            callback({
                errMsg: 'Importing keys failed. Not all options set!'
            });
            return;
        }

        function resetKeys() {
            self._publicKey = undefined;
            self._privateKey = undefined;
        }

        // read armored keys
        try {
            this._publicKey = openpgp.key.readArmored(options.publicKeyArmored).keys[0];
            this._privateKey = openpgp.key.readArmored(options.privateKeyArmored).keys[0];
        } catch (e) {
            resetKeys();
            callback({
                errMsg: 'Importing keys failed. Parsing error!'
            });
            return;
        }

        // decrypt private key with passphrase
        if (!this._privateKey.decrypt(options.passphrase)) {
            resetKeys();
            callback({
                errMsg: 'Incorrect passphrase!'
            });
            return;
        }

        // check if keys have the same id
        pubKeyId = this._publicKey.getKeyPacket().getKeyId().toHex();
        privKeyId = this._privateKey.getKeyPacket().getKeyId().toHex();
        if (!pubKeyId || !privKeyId || pubKeyId !== privKeyId) {
            resetKeys();
            callback({
                errMsg: 'Key IDs dont match!'
            });
            return;
        }

        callback();
    };

    /**
     * Export the user's key pair
     */
    PGP.prototype.exportKeys = function(callback) {
        if (!this._publicKey || !this._privateKey) {
            callback({
                errMsg: 'Could not export keys!'
            });
            return;
        }

        callback(null, {
            keyId: this._publicKey.getKeyPacket().getKeyId().toHex().toUpperCase(),
            privateKeyArmored: this._privateKey.armor(),
            publicKeyArmored: this._publicKey.armor()
        });
    };

    /**
     * Encrypt and sign a pgp message for a list of receivers
     */
    PGP.prototype.encrypt = function(plaintext, publicKeysArmored, callback) {
        var ciphertext, publicKeys = [];

        // check keys
        if (!this._privateKey || publicKeysArmored.length < 1) {
            callback({
                errMsg: 'Error encrypting. Keys must be set!'
            });
            return;
        }

        try {
            // parse armored public keys
            publicKeysArmored.forEach(function(pubkeyArmored) {
                publicKeys.push(openpgp.key.readArmored(pubkeyArmored).keys[0]);
            });
            // encrypt and sign the plaintext
            ciphertext = openpgp.signAndEncryptMessage(publicKeys, this._privateKey, plaintext);
        } catch (err) {
            callback({
                errMsg: 'Error encrypting plaintext!',
                err: err
            });
            return;
        }

        callback(null, ciphertext);
    };

    /**
     * Decrypt and verify a pgp message for a single sender
     */
    PGP.prototype.decrypt = function(ciphertext, publicKeyArmored, callback) {
        var publicKey, message, decrypted, signaturesValid;

        // check keys
        if (!this._privateKey || !publicKeyArmored) {
            callback({
                errMsg: 'Error decrypting. Keys must be set!'
            });
            return;
        }

        // decrypt and verify pgp message
        try {
            publicKey = openpgp.key.readArmored(publicKeyArmored).keys[0];
            message = openpgp.message.readArmored(ciphertext);
            decrypted = openpgp.decryptAndVerifyMessage(this._privateKey, [publicKey], message);
        } catch (err) {
            callback({
                errMsg: 'Error decrypting PGP message!',
                err: err
            });
            return;
        }

        // check if signatures are valid
        signaturesValid = true;
        decrypted.signatures.forEach(function(sig) {
            if (!sig.valid) {
                signaturesValid = false;
            }
        });
        if (!signaturesValid) {
            callback({
                errMsg: 'Verifying PGP signature failed!'
            });
            return;
        }

        // return decrypted plaintext
        callback(null, decrypted.text);
    };

    return PGP;
});