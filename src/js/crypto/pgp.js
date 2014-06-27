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
        openpgp.initWorker(config.workerPath + '/../lib/openpgp/openpgp.worker.min.js');
    };

    /**
     * Generate a key pair for the user
     */
    PGP.prototype.generateKeys = function(options, callback) {
        var userId, passphrase;

        if (!util.emailRegEx.test(options.emailAddress) || !options.keySize) {
            callback(new Error('Crypto init failed. Not all options set!'));
            return;
        }

        // generate keypair
        userId = 'Whiteout User <' + options.emailAddress + '>';
        passphrase = (options.passphrase) ? options.passphrase : undefined;
        openpgp.generateKeyPair({
            keyType: 1, // (keytype 1=RSA)
            numBits: options.keySize,
            userId: userId,
            passphrase: passphrase
        }, onGenerated);

        function onGenerated(err, keys) {
            if (err) {
                callback(new Error('Keygeneration failed!'));
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
            return key.getKeyPacket().getFingerprint().toUpperCase();
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
        var key, packet, userIds;

        // process armored key input
        if (keyArmored) {
            key = openpgp.key.readArmored(keyArmored).keys[0];
        } else if (this._publicKey) {
            key = this._publicKey;
        } else {
            throw new Error('Cannot read key params... keys not set!');
        }

        packet = key.getKeyPacket();

        // read user names and email addresses
        userIds = [];
        key.getUserIds().forEach(function(userId) {
            userIds.push({
                name: userId.split('<')[0].trim(),
                emailAddress: userId.split('<')[1].split('>')[0].trim()
            });
        });

        return {
            _id: packet.getKeyId().toHex().toUpperCase(),
            userId: userIds[0].emailAddress, // the primary (first) email address of the key
            userIds: userIds, // a dictonary of all the key's name/address pairs
            fingerprint: packet.getFingerprint().toUpperCase(),
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
        if (!options.privateKeyArmored || !options.publicKeyArmored) {
            callback(new Error('Importing keys failed. Not all options set!'));
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
            callback(new Error('Importing keys failed. Parsing error!'));
            return;
        }

        // decrypt private key with passphrase
        if (!this._privateKey.decrypt(options.passphrase)) {
            resetKeys();
            callback(new Error('Incorrect passphrase!'));
            return;
        }

        // check if keys have the same id
        pubKeyId = this._publicKey.getKeyPacket().getKeyId().toHex();
        privKeyId = this._privateKey.getKeyPacket().getKeyId().toHex();
        if (!pubKeyId || !privKeyId || pubKeyId !== privKeyId) {
            resetKeys();
            callback(new Error('Key IDs dont match!'));
            return;
        }

        callback();
    };

    /**
     * Export the user's key pair
     */
    PGP.prototype.exportKeys = function(callback) {
        if (!this._publicKey || !this._privateKey) {
            callback(new Error('Could not export keys!'));
            return;
        }

        callback(null, {
            keyId: this._publicKey.getKeyPacket().getKeyId().toHex().toUpperCase(),
            privateKeyArmored: this._privateKey.armor(),
            publicKeyArmored: this._publicKey.armor()
        });
    };

    /**
     * Change the passphrase of an ascii armored private key.
     */
    PGP.prototype.changePassphrase = function(options, callback) {
        var privKey, packets, newPassphrase, newKeyArmored;

        // set undefined instead of empty string as passphrase
        newPassphrase = (options.newPassphrase) ? options.newPassphrase : undefined;

        if (!options.privateKeyArmored) {
            callback(new Error('Private key must be specified to change passphrase!'));
            return;
        }

        if (options.oldPassphrase === newPassphrase ||
            (!options.oldPassphrase && !newPassphrase)) {
            callback(new Error('New and old passphrase are the same!'));
            return;
        }

        // read armored key
        try {
            privKey = openpgp.key.readArmored(options.privateKeyArmored).keys[0];
        } catch (e) {
            callback(new Error('Importing key failed. Parsing error!'));
            return;
        }

        // decrypt private key with passphrase
        if (!privKey.decrypt(options.oldPassphrase)) {
            callback(new Error('Old passphrase incorrect!'));
            return;
        }

        // encrypt key with new passphrase
        try {
            packets = privKey.getAllKeyPackets();
            for (var i = 0; i < packets.length; i++) {
                packets[i].encrypt(newPassphrase);
            }
            newKeyArmored = privKey.armor();
        } catch (e) {
            callback(new Error('Setting new passphrase failed!'));
            return;
        }

        // check if new passphrase really works
        if (!privKey.decrypt(newPassphrase)) {
            callback(new Error('Decrypting key with new passphrase failed!'));
            return;
        }

        callback(null, newKeyArmored);
    };

    /**
     * Encrypt and sign a pgp message for a list of receivers
     */
    PGP.prototype.encrypt = function(plaintext, publicKeysArmored, callback) {
        var publicKeys = [];

        // check keys
        if (!this._privateKey || publicKeysArmored.length < 1) {
            callback(new Error('Error encrypting. Keys must be set!'));
            return;
        }

        // parse armored public keys
        try {
            publicKeysArmored.forEach(function(pubkeyArmored) {
                publicKeys = publicKeys.concat(openpgp.key.readArmored(pubkeyArmored).keys);
            });
        } catch (err) {
            callback(new Error('Error encrypting plaintext!'));
            return;
        }

        // encrypt and sign the plaintext
        openpgp.signAndEncryptMessage(publicKeys, this._privateKey, plaintext, callback);
    };

    /**
     * Decrypt and verify a pgp message for a single sender.
     * You need to check if signatures are both present and valid in the callback!
     */
    PGP.prototype.decrypt = function(ciphertext, publicKeyArmored, callback) {
        var publicKeys, message, signaturesValid, signaturesPresent;

        // check keys
        if (!this._privateKey || !publicKeyArmored) {
            callback(new Error('Error decrypting. Keys must be set!'));
            return;
        }

        // read keys and ciphertext message
        try {
            publicKeys = openpgp.key.readArmored(publicKeyArmored).keys;
            message = openpgp.message.readArmored(ciphertext);
        } catch (err) {
            callback(new Error('Error decrypting PGP message!'));
            return;
        }

        // decrypt and verify pgp message
        openpgp.decryptAndVerifyMessage(this._privateKey, publicKeys, message, onDecrypted);

        function onDecrypted(err, decrypted) {
            if (err) {
                callback(new Error('Error decrypting PGP message!'));
                return;
            }

            // check if signatures are valid
            signaturesValid = true;
            signaturesPresent = !!decrypted.signatures.length;
            decrypted.signatures.forEach(function(sig) {
                if (!sig.valid) {
                    signaturesValid = false;
                }
            });

            // return decrypted plaintext
            callback(null, decrypted.text, signaturesPresent, signaturesValid);
        }
    };

    return PGP;
});