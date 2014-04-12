/**
 * A Wrapper for Forge's PBKDF2 function
 */
define(['node-forge'], function(forge) {
    'use strict';

    var self = {};

    /**
     * PBKDF2-HMAC-SHA1 key derivation with a random salt and 1000 iterations
     * @param password [String] The password in UTF8
     * @param salt [String] The base64 encoded salt
     * @param keySize [Number] The key size in bits
     * @return [String] The base64 encoded key
     */
    self.getKey = function(password, salt, keySize) {
        var key = forge.pkcs5.pbkdf2(password, forge.util.decode64(salt), 1000, keySize / 8);
        var keyBase64 = forge.util.encode64(key);

        return keyBase64;
    };

    return self;
});
