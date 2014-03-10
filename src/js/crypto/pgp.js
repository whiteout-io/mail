/**
 * High level crypto api that handles all calls to OpenPGP.js
 */
define(function(require) {
    'use strict';

    var openpgp = require('openpgp'),
        util = require('openpgp').util,
        config = require('js/app-config').config;

    var PGP = function() {
        openpgp.config.prefer_hash_algorithm = openpgp.enums.hash.sha256;
        openpgp.initWorker(config.workerPath + '/../lib/openpgp/openpgp.worker.js');
    };

    /**
     * Generate a key pair for the user
     */
    PGP.prototype.generateKeys = function(options, callback) {
        var userId;

        if (!util.emailRegEx.test(options.emailAddress) || !options.keySize || typeof options.passphrase !== 'string') {
            callback({
                errMsg: 'Crypto init failed. Not all options set!'
            });
            return;
        }

        // generate keypair (keytype 1=RSA)
        userId = 'Whiteout User <' + options.emailAddress + '>';
        openpgp.generateKeyPair(1, options.keySize, userId, options.passphrase, onGenerated);

        function onGenerated(err, keys) {
            if (err) {
                callback({
                    errMsg: 'Keygeneration failed!',
                    err: err
                });
                return;
            }

            callback(null, {
                keyId: keys.key.getKeyPacket().getKeyId().toHex().toUpperCase(),
                privateKeyArmored: keys.privateKeyArmored,
                publicKeyArmored: keys.publicKeyArmored
            });
        }
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
     * Show a user's key id.
     */
    PGP.prototype.getKeyId = function(keyArmored) {
        var key, pubKeyId, privKeyId;

        // process armored key input
        if (keyArmored) {
            key = openpgp.key.readArmored(keyArmored).keys[0];
            return key.getKeyPacket().getKeyId().toHex().toUpperCase();
        }

        // check already imported keys
        if (!this._privateKey || !this._publicKey) {
            throw new Error('Cannot read key IDs... keys not set!');
        }

        pubKeyId = this._publicKey.getKeyPacket().getKeyId().toHex().toUpperCase();
        privKeyId = this._privateKey.getKeyPacket().getKeyId().toHex().toUpperCase();

        if (!pubKeyId || !privKeyId || pubKeyId !== privKeyId) {
            throw new Error('Key IDs do not match!');
        }

        return pubKeyId;
    };

    /**
     * Read all relevant params of an armored key.
     */
    PGP.prototype.getKeyParams = function(keyArmored) {
        var key = openpgp.key.readArmored(keyArmored).keys[0],
            packet = key.getKeyPacket();

        return {
            _id: packet.getKeyId().toHex().toUpperCase(),
            userId: key.getUserIds()[0].split('<')[1].split('>')[0],
            fingerprint: util.hexstrdump(packet.getFingerprint()).toUpperCase(),
            algorithm: packet.algorithm,
            bitSize: packet.getBitSize(),
            created: packet.created,
        };
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
        var publicKeys = [];

        // check keys
        if (!this._privateKey || publicKeysArmored.length < 1) {
            callback({
                errMsg: 'Error encrypting. Keys must be set!'
            });
            return;
        }

        // parse armored public keys
        try {
            publicKeysArmored.forEach(function(pubkeyArmored) {
                publicKeys.push(openpgp.key.readArmored(pubkeyArmored).keys[0]);
            });
        } catch (err) {
            callback({
                errMsg: 'Error encrypting plaintext!',
                err: err
            });
            return;
        }

        // encrypt and sign the plaintext
        openpgp.signAndEncryptMessage(publicKeys, this._privateKey, plaintext, callback);
    };

    /**
     * Decrypt and verify a pgp message for a single sender
     */
    PGP.prototype.decrypt = function(ciphertext, publicKeyArmored, callback) {
        var publicKey, message, signaturesValid;

        // check keys
        if (!this._privateKey || !publicKeyArmored) {
            callback({
                errMsg: 'Error decrypting. Keys must be set!'
            });
            return;
        }

        // read keys and ciphertext message
        try {
            publicKey = openpgp.key.readArmored(publicKeyArmored).keys[0];
            message = openpgp.message.readArmored(ciphertext);
        } catch (err) {
            callback({
                errMsg: 'Error decrypting PGP message!',
                err: err
            });
            return;
        }

        // decrypt and verify pgp message
        openpgp.decryptAndVerifyMessage(this._privateKey, [publicKey], message, onDecrypted);

        function onDecrypted(err, decrypted) {
            if (err) {
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
        }
    };

    return PGP;
});