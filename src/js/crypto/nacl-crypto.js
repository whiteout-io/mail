/**
 * A Wrapper for NaCl's asymmetric/symmetric crypto
 */
app.crypto.NaclCrypto = function() {
	'use strict';

	/**
	 * Encrypt a String with the provided keysize (e.g. 128, 256)
	 * @param plaintext [String] The input string in UTF8
	 * @param key [String] The base64 encoded key
	 * @param iv [String] The base64 encoded IV
	 * @return [String] The base64 encoded ciphertext
	 */
	this.encrypt = function(plaintext, key, iv) {

	};

	/**
	 * Decrypt a String with the provided keysize (e.g. 128, 256)
	 * @param ciphertext [String] The base64 encoded ciphertext
	 * @param key [String] The base64 encoded key
	 * @param iv [String] The base64 encoded IV
	 * @return [String] The decrypted plaintext in UTF8
	 */
	this.decrypt = function(ciphertext, key, iv) {

	};

};