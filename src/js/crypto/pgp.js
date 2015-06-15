'use strict';

var ngModule = angular.module('woCrypto');
ngModule.service('pgp', PGP);
module.exports = PGP;

var util = openpgp.util,
    config = require('../app-config').config;

/**
 * High level crypto api that handles all calls to OpenPGP.js
 */
function PGP() {
    openpgp.config.commentstring = config.pgpComment;
    openpgp.config.prefer_hash_algorithm = openpgp.enums.hash.sha256;
    openpgp.initWorker(config.workerPath + '/openpgp.worker.min.js');
}

/**
 * Generate a key pair for the user
 * @return {Promise}
 */
PGP.prototype.generateKeys = function(options) {
    return new Promise(function(resolve) {
        var userId, name, passphrase;

        if (!util.emailRegEx.test(options.emailAddress) || !options.keySize) {
            throw new Error('Crypto init failed. Not all options set!');
        }

        // generate keypair
        name = options.realname ? options.realname.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '').trim() : '';
        userId = name + ' <' + options.emailAddress + '>';
        passphrase = (options.passphrase) ? options.passphrase : undefined;

        resolve({
            userId: userId,
            passphrase: passphrase
        });

    }).then(function(res) {
        return openpgp.generateKeyPair({
            keyType: 1, // (keytype 1=RSA)
            numBits: options.keySize,
            userId: res.userId,
            passphrase: res.passphrase
        });
    }).then(function(keys) {
        return {
            keyId: keys.key.primaryKey.getKeyId().toHex().toUpperCase(),
            privateKeyArmored: keys.privateKeyArmored,
            publicKeyArmored: keys.publicKeyArmored
        };
    });
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
    var key, packet, userIds, emailAddress;

    // process armored key input
    if (keyArmored) {
        key = openpgp.key.readArmored(keyArmored).keys[0];
    } else if (this._publicKey) {
        key = this._publicKey;
    } else {
        throw new Error('Cannot read key params... keys not set!');
    }

    packet = key.primaryKey;

    // read user names and email addresses
    userIds = [];
    key.getUserIds().forEach(function(userId) {
        if (!userId || userId.indexOf('<') < 0 || userId.indexOf('>') < 0) {
            return;
        }
        userIds.push({
            name: userId.split('<')[0].trim(),
            emailAddress: userId.split('<')[1].split('>')[0].trim()
        });
    });

    // check user ID
    emailAddress = userIds[0] && userIds[0].emailAddress;
    if (!emailAddress) {
        throw new Error('Cannot parse PGP key user ID!');
    }

    return {
        _id: packet.getKeyId().toHex().toUpperCase(),
        userId: emailAddress, // the primary (first) email address of the key
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
 * @return {Promise}
 */
PGP.prototype.importKeys = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        var pubKeyId, privKeyId;

        // check options
        if (!options.privateKeyArmored || !options.publicKeyArmored) {
            throw new Error('Importing keys failed. Not all options set!');
        }

        function resetKeys() {
            self._publicKey = undefined;
            self._privateKey = undefined;
        }

        // read armored keys
        try {
            self._publicKey = openpgp.key.readArmored(options.publicKeyArmored).keys[0];
            self._privateKey = openpgp.key.readArmored(options.privateKeyArmored).keys[0];
        } catch (e) {
            resetKeys();
            throw new Error('Importing keys failed. Parsing error!');
        }

        // decrypt private key with passphrase
        if (!self._privateKey.decrypt(options.passphrase)) {
            resetKeys();
            throw new Error('Incorrect passphrase!');
        }

        // check if keys have the same id
        pubKeyId = self._publicKey.primaryKey.getKeyId().toHex();
        privKeyId = self._privateKey.primaryKey.getKeyId().toHex();
        if (!pubKeyId || !privKeyId || pubKeyId !== privKeyId) {
            resetKeys();
            throw new Error('Key IDs dont match!');
        }

        resolve();
    });
};

/**
 * Export the user's key pair
 * @return {Promise}
 */
PGP.prototype.exportKeys = function() {
    var self = this;
    return new Promise(function(resolve) {
        if (!self._publicKey || !self._privateKey) {
            throw new Error('Could not export keys!');
        }

        resolve({
            keyId: self._publicKey.primaryKey.getKeyId().toHex().toUpperCase(),
            privateKeyArmored: self._privateKey.armor(),
            publicKeyArmored: self._publicKey.armor()
        });
    });
};

/**
 * Change the passphrase of an ascii armored private key.
 * @return {Promise}
 */
PGP.prototype.changePassphrase = function(options) {
    return new Promise(function(resolve) {
        var privKey, packets, newPassphrase, newKeyArmored;

        // set undefined instead of empty string as passphrase
        newPassphrase = (options.newPassphrase) ? options.newPassphrase : undefined;

        if (!options.privateKeyArmored) {
            throw new Error('Private key must be specified to change passphrase!');
        }

        if (options.oldPassphrase === newPassphrase ||
            (!options.oldPassphrase && !newPassphrase)) {
            throw new Error('New and old passphrase are the same!');
        }

        // read armored key
        try {
            privKey = openpgp.key.readArmored(options.privateKeyArmored).keys[0];
        } catch (e) {
            throw new Error('Importing key failed. Parsing error!');
        }

        // decrypt private key with passphrase
        if (!privKey.decrypt(options.oldPassphrase)) {
            throw new Error('Old passphrase incorrect!');
        }

        // encrypt key with new passphrase
        try {
            packets = privKey.getAllKeyPackets();
            for (var i = 0; i < packets.length; i++) {
                packets[i].encrypt(newPassphrase);
            }
            newKeyArmored = privKey.armor();
        } catch (e) {
            throw new Error('Setting new passphrase failed!');
        }

        // check if new passphrase really works
        if (!privKey.decrypt(newPassphrase)) {
            throw new Error('Decrypting key with new passphrase failed!');
        }

        resolve(newKeyArmored);
    });
};

/**
 * Encrypt and sign a pgp message for a list of receivers
 * @return {Promise}
 */
PGP.prototype.encrypt = function(plaintext, publicKeysArmored) {
    var self = this;
    return new Promise(function(resolve) {
        var publicKeys;

        // check keys
        if (!self._privateKey) {
            throw new Error('Error encrypting. Keys must be set!');
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
            throw new Error('Error encrypting plaintext!');
        }
        resolve(publicKeys);

    }).then(function(publicKeys) {
        if (publicKeys) {
            // encrypt and sign the plaintext
            return openpgp.signAndEncryptMessage(publicKeys, self._privateKey, plaintext);
        } else {
            // if no public keys are available encrypt for myself
            return openpgp.signAndEncryptMessage([self._publicKey], self._privateKey, plaintext);
        }
    });
};

/**
 * Decrypts a ciphertext
 * @param  {String}   ciphertext       The encrypted PGP message block
 * @param  {String}   publicKeyArmored The public key used to sign the message
 * @param  {Function} callback(error, plaintext, signaturesValid) signaturesValid is undefined in case there are no signature, null in case there are signatures but the wrong public key or no key was used to verify, true if the signature was successfully verified, or false if the signataure verification failed.
 * @return {Promise}
 */
PGP.prototype.decrypt = function(ciphertext, publicKeyArmored) {
    var self = this;
    return new Promise(function(resolve) {
        var publicKeys, message;

        // check keys
        if (!self._privateKey) {
            throw new Error('Error decrypting. Keys must be set!');
        }
        // read keys and ciphertext message
        try {
            if (publicKeyArmored) {
                // parse public keys if available ...
                publicKeys = openpgp.key.readArmored(publicKeyArmored).keys;
            } else {
                // use own public key to know if signatures are available
                publicKeys = [self._publicKey];
            }
            message = openpgp.message.readArmored(ciphertext);
        } catch (err) {
            throw new Error('Error parsing encrypted PGP message!');
        }
        resolve({
            publicKeys: publicKeys,
            message: message
        });

    }).then(function(res) {
        // decrypt and verify pgp message
        return openpgp.decryptAndVerifyMessage(self._privateKey, res.publicKeys, res.message);
    }).then(function(decrypted) {
        // return decrypted plaintext
        return {
            decrypted: decrypted.text,
            signaturesValid: checkSignatureValidity(decrypted.signatures)
        };
    });
};

/**
 * Verifies a clearsigned message
 * @param {String} clearSignedText The clearsigned text, usually from a signed pgp/inline message
 * @param {String} publicKeyArmored The public key used to signed the message
 * @param  {Function} callback(error, signaturesValid) signaturesValid is undefined in case there are no signature, null in case there are signatures but the wrong public key or no key was used to verify, true if the signature was successfully verified, or false if the signataure verification failed.
 * @return {Promise}
 */
PGP.prototype.verifyClearSignedMessage = function(clearSignedText, publicKeyArmored) {
    var self = this;
    return new Promise(function(resolve) {
        var publicKeys, message;

        // check keys
        if (!self._privateKey) {
            throw new Error('Error verifying signed PGP message. Keys must be set!');
        }
        // read keys and ciphertext message
        try {
            if (publicKeyArmored) {
                // parse public keys if available ...
                publicKeys = openpgp.key.readArmored(publicKeyArmored).keys;
            } else {
                // use own public key to know if signatures are available
                publicKeys = [self._publicKey];
            }
            message = openpgp.cleartext.readArmored(clearSignedText);
        } catch (err) {
            throw new Error('Error verifying signed PGP message!');
        }
        resolve({
            publicKeys: publicKeys,
            message: message
        });

    }).then(function(res) {
        return openpgp.verifyClearSignedMessage(res.publicKeys, res.message);
    }).then(function(result) {
        return checkSignatureValidity(result.signatures);
    });
};

/**
 * Verifies a message with a detached signature
 * @param {String} message The signed text, usually from a signed pgp/mime message
 * @param {String} pgpSignature The detached signature, usually from a signed pgp/mime message
 * @param {String} publicKeyArmored The public key used to signed the message
 * @param  {Function} callback(error, signaturesValid) signaturesValid is undefined in case there are no signature, null in case there are signatures but the wrong public key or no key was used to verify, true if the signature was successfully verified, or false if the signataure verification failed.
 * @return {Promise}
 */
PGP.prototype.verifySignedMessage = function(message, pgpSignature, publicKeyArmored) {
    var self = this;
    return new Promise(function(resolve) {
        var publicKeys, signatures;

        // check keys
        if (!self._privateKey) {
            throw new Error('Error verifying signed PGP message. Keys must be set!');
        }
        // read keys and ciphertext message
        try {
            if (publicKeyArmored) {
                // parse public keys if available ...
                publicKeys = openpgp.key.readArmored(publicKeyArmored).keys;
            } else {
                // use own public key to know if signatures are available
                publicKeys = [self._publicKey];
            }
        } catch (err) {
            throw new Error('Error verifying signed PGP message!');
        }
        // check signatures
        try {
            var msg = openpgp.message.readSignedContent(message, pgpSignature);
            signatures = msg.verify(publicKeys);
        } catch (err) {
            throw new Error('Error verifying signed PGP message!');
        }

        resolve(checkSignatureValidity(signatures));
    });
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