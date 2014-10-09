/**
 * A Wrapper for Forge's PBKDF2 function
 */

'use strict';

var pbkdf2 = {};

/**
 * PBKDF2-HMAC-SHA256 key derivation with a random salt and 10000 iterations
 * @param  {String} password  The password in UTF8
 * @param  {String} salt      The base64 encoded salt
 * @param  {String} keySize   The key size in bits
 * @return {String}           The base64 encoded key
 */
pbkdf2.getKey = function(password, salt, keySize) {
    var saltUtf8 = forge.util.decode64(salt);
    var md = forge.md.sha256.create();
    var key = forge.pkcs5.pbkdf2(password, saltUtf8, 10000, keySize / 8, md);

    return forge.util.encode64(key);
};

module.exports = pbkdf2;