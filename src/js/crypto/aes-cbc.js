(function() {
	'use strict';

	/**
	 * A Wrapper for Forge's AES-CBC encryption
	 */
	var AesCBC = function(forge) {

		var utl = forge.util;

		/**
		 * Encrypt a String using AES-CBC-Pkcs7 using the provided keysize (e.g. 128, 256)
		 * @param plaintext [String] The input string in UTF-16
		 * @param key [String] The base64 encoded key
		 * @param iv [String] The base64 encoded IV
		 * @return [String] The base64 encoded ciphertext
		 */
		this.encrypt = function(plaintext, key, iv) {
			// decode args to utf8 and encrypt
			var cipher = forge.aes.createEncryptionCipher(utl.decode64(key));
			cipher.start(utl.decode64(iv));
			cipher.update(utl.createBuffer(utl.encodeUtf8(plaintext)));
			cipher.finish();

			// encode to base64
			return utl.encode64(cipher.output.getBytes());
		};

		/**
		 * Decrypt a String using AES-CBC-Pkcs7 using the provided keysize (e.g. 128, 256)
		 * @param ciphertext [String] The base64 encoded ciphertext
		 * @param key [String] The base64 encoded key
		 * @param iv [String] The base64 encoded IV
		 * @return [String] The decrypted plaintext in UTF-16
		 */
		this.decrypt = function(ciphertext, key, iv) {
			// decode args input to utf8 decrypt
			var cipher = forge.aes.createDecryptionCipher(utl.decode64(key));
			cipher.start(utl.decode64(iv));
			cipher.update(utl.createBuffer(utl.decode64(ciphertext)));
			cipher.finish();

			// decode to utf16
			return utl.decodeUtf8(cipher.output.getBytes());
		};

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