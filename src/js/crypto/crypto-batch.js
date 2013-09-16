(function() {
    'use strict';

    /**
     * Crypto batch library for processing large sets of data
     */
    var CryptoBatch = function(aes, rsa, util, _) {
        this._aes = aes;
        this._rsa = rsa;
        this._util = util;
        this.__ = _;
    };

    //
    // Encrypt batch for user AES/RSA
    //

    /**
     * Encrypt and sign a list of items using AES and RSA
     * @param list [Array] The list of items to encrypt
     * @param receiverPubkeys [Array] A list of public keys used to encrypt
     * @param senderPrivkey [Array] The sender's private key used to sign
     */
    CryptoBatch.prototype.encryptListForUser = function(list, receiverPubkeys, senderPrivkey) {
        var receiverPk,
            self = this;

        // validate presence of args
        if (!list || !receiverPubkeys || !senderPrivkey || !senderPrivkey._id || !senderPrivkey.privateKey) {
            throw new Error('Arguments missing!');
        }

        // set sender private key
        self._rsa.init(null, senderPrivkey.privateKey);

        // encrypt a list of items
        self.encryptList(list);

        list.forEach(function(i) {
            // fetch correct public key for encryption
            receiverPk = null;
            receiverPk = self.__.findWhere(receiverPubkeys, {
                _id: i.receiverPk
            });

            // validate presence of args
            if (!receiverPk || !receiverPk.publicKey || !i.key || !i.iv || !i.ciphertext) {
                throw new Error('Arguments missing!');
            }

            // encrypt item for user
            self.encryptItemKeyForUser(i, receiverPk.publicKey, senderPrivkey._id);
        });

        return list;
    };

    /**
     * Encrypt and sign an item using AES and RSA
     * @param i [Object] The item to encrypt
     * @param receiverPubkey [String] The public key used to encrypt
     * @param senderKeyId [String] The sender's private key ID used to sign
     */
    CryptoBatch.prototype.encryptItemKeyForUser = function(i, receiverPubkey, senderKeyId) {
        var self = this;

        // set rsa public key used to encrypt
        self._rsa.init(receiverPubkey);
        // encrypt symmetric item key for user
        i.encryptedKey = self._rsa.encrypt(i.key);
        // set sender's keypair id for later verification
        i.senderPk = senderKeyId;
        // sign the bundle
        i.signature = self._rsa.sign([i.iv, i.key, i.ciphertext]);

        // delete plaintext values
        delete i.key;
        delete i.receiverPk;

        return i;
    };

    //
    // Decrypt batch for user AES/RSA
    //

    /**
     * Decrypt and verify a list of items using AES and RSA
     * @param list [Array] The list of items to decrypt
     * @param senderPubkeys [Array] A list of public keys used to verify
     * @param receiverPrivkey [Array] The receiver's private key used to decrypt
     */
    CryptoBatch.prototype.decryptListForUser = function(list, senderPubkeys, receiverPrivkey) {
        var j;

        // validate presence of args
        if (!list || !senderPubkeys || !receiverPrivkey || !receiverPrivkey._id || !receiverPrivkey.privateKey) {
            throw new Error('Arguments missing!');
        }

        // verify and decrypt a list of items using RSA
        this.decryptListKeysForUser(list, senderPubkeys, receiverPrivkey);

        // decrypt a list of items
        this.decryptList(list);

        // set plaintext as list item
        for (j = 0; j < list.length; j++) {
            list[j] = list[j].plaintext;
        }

        return list;
    };

    /**
     * Decrypt and verify a list of item keys using RSA
     * @param list [Array] The list of items to decrypt
     * @param senderPubkeys [Array] A list of public keys used to verify
     * @param receiverPrivkey [String] The receiver's private key used to decrypt
     */
    CryptoBatch.prototype.decryptListKeysForUser = function(list, senderPubkeys, receiverPrivkey) {
        var self = this,
            senderPk;

        // set receiver private key
        self._rsa.init(null, receiverPrivkey.privateKey);

        list.forEach(function(i) {
            // fetch correct public key for verification
            senderPk = null;
            senderPk = self.__.findWhere(senderPubkeys, {
                _id: i.senderPk
            });

            // validate presence of args
            if (!senderPk || !senderPk.publicKey || !i.encryptedKey || !i.iv || !i.ciphertext) {
                throw new Error('Arguments missing!');
            }

            // decrypt item for user
            self.decryptItemKeyForUser(i, senderPk.publicKey);
        });

        return list;
    };

    /**
     * Verfiy an item and decrypt its item key using RSA
     * @param i [Object] The item to decrypt
     * @param senderPubkey [String] A public key used to verify
     */
    CryptoBatch.prototype.decryptItemKeyForUser = function(i, senderPubkey) {
        var self = this;

        // set rsa public key used to verify
        self._rsa.init(senderPubkey);

        // decrypt symmetric item key for user
        i.key = self._rsa.decrypt(i.encryptedKey);

        // verify signature
        if (!self._rsa.verify([i.iv, i.key, i.ciphertext], i.signature)) {
            throw new Error('Verifying RSA signature failed!');
        }

        // delete ciphertext values
        delete i.signature;
        delete i.encryptedKey;
        delete i.senderPk;

        return i;
    };

    //
    // Encrypt batch AES
    //

    /**
     * Encrypt an item using AES
     * @param i [Object] The item to encrypt
     */
    CryptoBatch.prototype.encryptItem = function(i) {
        var self = this;

        // stringify to JSON before symmetric encryption
        i.ciphertext = self._aes.encrypt(JSON.stringify(i.plaintext), i.key, i.iv);

        // delete plaintext values
        delete i.plaintext;

        return i;
    };

    /**
     * Encrypt a list of items using AES
     * @param i [Object] The item to encrypt
     */
    CryptoBatch.prototype.encryptList = function(list) {
        var self = this;

        list.forEach(function(i) {
            // encrypt item
            self.encryptItem(i);
        });

        return list;
    };

    /**
     * Encrypt a list of items using AES and hash using HMAC
     * @param i [Object] The item to encrypt
     */
    CryptoBatch.prototype.authEncryptList = function(list) {
        var self = this;

        self.encryptList(list);

        list.forEach(function(i) {
            // calculate hmac of iv and ciphertext using key
            i.hmac = self._aes.hmac([i.iv, i.ciphertext], i.key);

            // delete symmetric key on each item
            delete i.key;
        });

        return list;
    };

    //
    // Decrypt batch AES
    //

    /**
     * Decrypt an item using AES
     * @param i [Object] The item to decrypt
     */
    CryptoBatch.prototype.decryptItem = function(i) {
        var self = this;

        // symmetrically decrypt JSON and parse to object literal
        i.plaintext = JSON.parse(self._aes.decrypt(i.ciphertext, i.key, i.iv));

        // delete ciphertext values
        delete i.ciphertext;

        return i;
    };

    /**
     * Decrypt a list of items using AES
     * @param i [Object] The item to decrypt
     */
    CryptoBatch.prototype.decryptList = function(list) {
        var self = this;

        list.forEach(function(i) {
            // decrypt item
            self.decryptItem(i);
        });

        return list;
    };

    /**
     * Encrypt a list of items using AES and verfiy using HMAC
     * @param i [Object] The item to decrypt
     */
    CryptoBatch.prototype.authDecryptList = function(list, keys) {
        var self = this,
            i, len, calculated, j;

        for (i = 0, len = list.length; i < len; i++) {
            // validate presence of args
            if (!list[i].hmac || !list[i].iv || !list[i].ciphertext || !keys[i]) {
                throw new Error('Arguments for hmac verification missing!');
            }

            // verify hmac of each item
            calculated = self._aes.hmac([list[i].iv, list[i].ciphertext], keys[i]);
            if (list[i].hmac !== calculated) {
                throw new Error('Hmac verification failed!');
            }

            // set key property for batch decryption
            list[i].key = keys[i];
        }

        // decrypt lsit using aes
        self.decryptList(list);

        // set plaintext as list item
        for (j = 0; j < list.length; j++) {
            list[j] = list[j].plaintext;
        }

        return list;
    };

    //
    // Reencrypt batch for user AES/RSA
    //

    /**
     * Decrypt a list of item keys using RSA and the encrypt them again using AES
     * @param list [Array] The list of items to decrypt
     * @param senderPubkeys [Array] A list of public keys used to verify
     * @param receiverPrivkey [String] The receiver's private key used to decrypt
     * @param symKey [String] The symmetric key used to re-encrypt the item key
     */
    CryptoBatch.prototype.reencryptListKeysForUser = function(list, senderPubkeys, receiverPrivkey, symKey) {
        var self = this;

        // verify and decrypt item keys using RSA
        this.decryptListKeysForUser(list, senderPubkeys, receiverPrivkey);

        list.forEach(function(i) {
            // re-encrypt item key using aes
            i.encryptedKey = self._aes.encrypt(i.key, symKey, i.iv);

            delete i.key;
        });

        return list;
    };

    /**
     * Decrypt keys and items using AES
     * @param list [Array] The list of items to decrypt
     * @param symKey [String] The symmetric key used to re-encrypt the item key
     */
    CryptoBatch.prototype.decryptKeysAndList = function(list, symKey) {
        var self = this,
            j;

        list.forEach(function(i) {
            // decrypt item key
            i.key = self._aes.decrypt(i.encryptedKey, symKey, i.iv);
            // decrypt item for user
            self.decryptItem(i);

            delete i.encryptedKey;
        });

        // set plaintext as list item
        for (j = 0; j < list.length; j++) {
            list[j] = list[j].plaintext;
        }

        return list;
    };

    if (typeof define !== 'undefined' && define.amd) {
        // AMD
        define(['cryptoLib/aes-cbc', 'cryptoLib/rsa', 'cryptoLib/util', 'underscore'], function(aes, rsa, util, _) {
            return new CryptoBatch(aes, rsa, util, _);
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        // node.js
        module.exports = new CryptoBatch(require('./aes-cbc'), require('./rsa'), require('./util'), require('underscore'));
    }

})();