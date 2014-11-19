/**
 * High level crypto api that handles all calls to OpenPGP.js
 */

'use strict';

var util = openpgp.util,
    config = require('../app-config').config;

var PGP = function() {
    openpgp.config.prefer_hash_algorithm = openpgp.enums.hash.sha256;
    openpgp.initWorker(config.workerPath + '/openpgp.worker.min.js');
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
    }).then(function(keys) {
        callback(null, {
            keyId: keys.key.primaryKey.getKeyId().toHex().toUpperCase(),
            privateKeyArmored: keys.privateKeyArmored,
            publicKeyArmored: keys.publicKeyArmored
        });
    }).catch(callback);
};

/**
 * Show a user's fingerprint
 */
PGP.prototype.getFingerprint = function(keyArmored) {
    function fingerprint(key) {
        return key.primaryKey.getFingerprint().toUpperCase();
    }

    // process armored key input
    if (keyArmored) {
        return fingerprint(openpgp.key.readArmored(keyArmored).keys[0]);
    }

    if (!this._publicKey) {
        throw new Error('No public key set for fingerprint generation!');
    }

    // get local fingerprint
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
        return key.primaryKey.getKeyId().toHex().toUpperCase();
    }

    // check already imported keys
    if (!this._privateKey || !this._publicKey) {
        throw new Error('Cannot read key IDs... keys not set!');
    }

    pubKeyId = this._publicKey.primaryKey.getKeyId().toHex().toUpperCase();
    privKeyId = this._privateKey.primaryKey.getKeyId().toHex().toUpperCase();

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

    packet = key.primaryKey;

    // read usernames and email addresses
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
 * Extract a public key from a private key
 * @param  {String}   privateKeyArmored The private PGP key block
 * @return {String}                     The publick PGP key block
 */
PGP.prototype.extractPublicKey = function(privateKeyArmored) {
    var privkey = openpgp.key.readArmored(privateKeyArmored).keys[0];
    var pubkey = privkey.toPublic();
    return pubkey.armor();
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
    pubKeyId = this._publicKey.primaryKey.getKeyId().toHex();
    privKeyId = this._privateKey.primaryKey.getKeyId().toHex();
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
        keyId: this._publicKey.primaryKey.getKeyId().toHex().toUpperCase(),
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
    var publicKeys;

    // check keys
    if (!this._privateKey) {
        callback(new Error('Error encrypting. Keys must be set!'));
        return;
    }

    // parse armored public keys
    try {
        if (publicKeysArmored && publicKeysArmored.length) {
            publicKeys = [];
            publicKeysArmored.forEach(function(pubkeyArmored) {
                publicKeys = publicKeys.concat(openpgp.key.readArmored(pubkeyArmored).keys);
            });
        }
    } catch (err) {
        callback(new Error('Error encrypting plaintext!'));
        return;
    }

    if (publicKeys) {
        // encrypt and sign the plaintext
        openpgp.signAndEncryptMessage(publicKeys, this._privateKey, plaintext).then(callback.bind(null, null)).catch(callback);
    } else {
        // if no public keys are available encrypt for myself
        openpgp.signAndEncryptMessage([this._publicKey], this._privateKey, plaintext).then(callback.bind(null, null)).catch(callback);
    }
};

/**
 * Decrypts a ciphertext
 * @param  {String}   ciphertext       The encrypted PGP message block
 * @param  {String}   publicKeyArmored The public key used to sign the message
 * @param  {Function} callback(error, plaintext, signaturesValid) signaturesValid is undefined in case there are no signature, null in case there are signatures but the wrong public key or no key was used to verify, true if the signature was successfully verified, or false if the signature verification failed.
 */
PGP.prototype.decrypt = function(ciphertext, publicKeyArmored, callback) {
    var publicKeys, message;

    // check keys
    if (!this._privateKey) {
        callback(new Error('Error decrypting. Keys must be set!'));
        return;
    }

    // read keys and ciphertext message
    try {
        if (publicKeyArmored) {
            // parse public keys if available ...
            publicKeys = openpgp.key.readArmored(publicKeyArmored).keys;
        } else {
            // use own public key to know if signatures are available
            publicKeys = [this._publicKey];
        }
        message = openpgp.message.readArmored(ciphertext);
    } catch (err) {
        callback(new Error('Error parsing encrypted PGP message!'));
        return;
    }

    // decrypt and verify pgp message
    openpgp.decryptAndVerifyMessage(this._privateKey, publicKeys, message).then(function(decrypted) {
        // return decrypted plaintext
        callback(null, decrypted.text, checkSignatureValidity(decrypted.signatures));
    }).catch(callback);
};

/**
 * Verifies a clearsigned message
 * @param {String} clearSignedText The clearsigned text, usually from a signed pgp/inline message
 * @param {String} publicKeyArmored The public key used to signed the message
 * @param  {Function} callback(error, signaturesValid) signaturesValid is undefined in case there are no signature, null in case there are signatures but the wrong public key or no key was used to verify, true if the signature was successfully verified, or false if the signature verification failed.
 */
PGP.prototype.verifyClearSignedMessage = function(clearSignedText, publicKeyArmored, callback) {
    var publicKeys,
        message;

    // check keys
    if (!this._privateKey) {
        callback(new Error('Error verifying signed PGP message. Keys must be set!'));
        return;
    }

    // read keys and ciphertext message
    try {
        if (publicKeyArmored) {
            // parse public keys if available ...
            publicKeys = openpgp.key.readArmored(publicKeyArmored).keys;
        } else {
            // use own public key to know if signatures are available
            publicKeys = [this._publicKey];
        }
        message = openpgp.cleartext.readArmored(clearSignedText);
    } catch (err) {
        callback(new Error('Error verifying signed PGP message!'));
        return;
    }

    openpgp.verifyClearSignedMessage(publicKeys, message).then(function(result) {
        callback(null, checkSignatureValidity(result.signatures));
    }).catch(callback);
};

/**
 * Verifies a message with a detached signature
 * @param {String} message The signed text, usually from a signed pgp/mime message
 * @param {String} pgpSignature The detached signature, usually from a signed pgp/mime message
 * @param {String} publicKeyArmored The public key used to sign the message
 * @param  {Function} callback(error, signaturesValid) signaturesValid is undefined in case there are no signature, null in case there are signatures but the wrong public key or no key was used to verify, true if the signature was successfully verified, or false if the signature verification failed.
 */
PGP.prototype.verifySignedMessage = function(message, pgpSignature, publicKeyArmored, callback) {
    var publicKeys;

    // check keys
    if (!this._privateKey) {
        callback(new Error('Error verifying signed PGP message. Keys must be set!'));
        return;
    }

    // read keys and ciphertext message
    try {
        if (publicKeyArmored) {
            // parse public keys if available ...
            publicKeys = openpgp.key.readArmored(publicKeyArmored).keys;
        } else {
            // use own public key to know if signatures are available
            publicKeys = [this._publicKey];
        }
    } catch (err) {
        callback(new Error('Error verifying signed PGP message!'));
        return;
    }

    var signatures;
    try {
        var msg = openpgp.message.readSignedContent(message, pgpSignature);
        signatures = msg.verify(publicKeys);
    } catch (err) {
        callback(new Error('Error verifying signed PGP message!'));
        return;
    }

    callback(null, checkSignatureValidity(signatures));
};

/**
 * Checks signature validity
 * @param {Object} decrypted OpenPGP.js Signature array
 * @return {undefined|null|true|false}
 *     If signatures array is empty (the message was not signed), returns undefined
 *     If you're using the wrong public key, returns null.
 *     If signatures are invalid, returns false.
 *     If everything is in order, returns true
 */
function checkSignatureValidity(signatures) {
    if (!signatures.length) {
        // signatures array is empty (the message was not signed)
        return;
    }

    for (var i = 0; i < signatures.length; i++) {
        if (signatures[i].valid !== true) { // null | false
            // you're using the wrong public key or signatures are invalid
            return signatures[i].valid;
        }
    }

    // everything is in order
    return true;
}

module.exports = PGP;
