(function() {
    'use strict';

    /**
     * A Wrapper for Forge's AES-CBC encryption
     */
    var AesCBC = function(forge) {
        this._forge = forge;
    };

    /**
     * Encrypt a String using AES-CBC-Pkcs7 using the provided keysize (e.g. 128, 256)
     * @param plaintext [String] The input string in UTF-16
     * @param key [String] The base64 encoded key
     * @param iv [String] The base64 encoded IV
     * @return [String] The base64 encoded ciphertext
     */
    AesCBC.prototype.encrypt = function(plaintext, key, iv) {
        // validate args
        if (!plaintext || !key || !iv) {
            throw new Error("Missing args for encryption!");
        }

        // decode args to utf8 and encrypt
        var cipher = this._forge.aes.createEncryptionCipher(this._forge.util.decode64(key));
        cipher.start(this._forge.util.decode64(iv));
        cipher.update(this._forge.util.createBuffer(this._forge.util.encodeUtf8(plaintext)));
        cipher.finish();

        // encode to base64
        return this._forge.util.encode64(cipher.output.getBytes());
    };

    /**
     * Decrypt a String using AES-CBC-Pkcs7 using the provided keysize (e.g. 128, 256)
     * @param ciphertext [String] The base64 encoded ciphertext
     * @param key [String] The base64 encoded key
     * @param iv [String] The base64 encoded IV
     * @return [String] The decrypted plaintext in UTF-16
     */
    AesCBC.prototype.decrypt = function(ciphertext, key, iv) {
        // validate args
        if (!ciphertext || !key || !iv) {
            throw new Error("Missing args for decryption!");
        }

        // decode args input to utf8 decrypt
        var cipher = this._forge.aes.createDecryptionCipher(this._forge.util.decode64(key));
        cipher.start(this._forge.util.decode64(iv));
        cipher.update(this._forge.util.createBuffer(this._forge.util.decode64(ciphertext)));
        cipher.finish();

        // decode to utf16
        return this._forge.util.decodeUtf8(cipher.output.getBytes());
    };

    /**
     * Calculate a hmac using SHA-256 for a given input
     * @param parts [Array] Array of Base64 encoded parts
     * @param key [String] The base64 encoded key
     * @return [String] The Base64 encoded hmac
     */
    AesCBC.prototype.hmac = function(parts, key) {
        var self = this;

        // validate args
        if (!parts || parts.length < 1 || !key) {
            throw new Error("Missing args for hmac processing!");
        }

        var hmac = self._forge.hmac.create();
        hmac.start('sha256', self._forge.util.decode64(key));
        parts.forEach(function(i) {
            // decode base64 part and append to hmac msg
            hmac.update(self._forge.util.decode64(i));
        });

        return self._forge.util.encode64(hmac.digest().getBytes());
    };

    if (typeof define !== 'undefined' && define.amd) {
        // AMD
        define(['forge'], function(forge) {
            return new AesCBC(forge);
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        // node.js
        module.exports = new AesCBC(require('node-forge'));
    }

})();