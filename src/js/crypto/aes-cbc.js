/**
 * A Wrapper for Forge's AES-CBC encryption with HMAC-SHA-256 an integrify check
 */
app.crypto.AesCBC = function() {
	'use strict';

	/**
	 * Encrypt a String using AES-CBC-Pkcs7 using the provided keysize (e.g. 128, 256)
	 * and create an HMAC-SHA-265 for integrity check
	 * @param plaintext [String] The input string in UTF8
	 * @param key [String] The base64 encoded key
	 * @param iv [String] The base64 encoded IV
	 * @return [String] The base64 encoded ciphertext
	 */
	this.encrypt = function(plaintext, key, iv) {
		// parse base64 input to utf8
		var keyUtf8 = forge.util.decode64(key);
		var ivUtf8 = forge.util.decode64(iv);

		// encrypt
		var cipher = forge.aes.createEncryptionCipher(keyUtf8);
		cipher.start(ivUtf8);
		cipher.update(forge.util.createBuffer(plaintext));
		cipher.finish();
		var ctUtf8 = cipher.output.getBytes();

		// get hmac
		return {
			hmac: this.getHmac(ctUtf8, keyUtf8, ivUtf8),
			ciphertext: forge.util.encode64(ctUtf8)
		};
	};

	/**
	 * Decrypt a String using AES-CBC-Pkcs7 using the provided keysize (e.g. 128, 256)
	 * and does an HMAC-SHA-265 integrity check
	 * @param ciphertext [String] The base64 encoded ciphertext
	 * @param key [String] The base64 encoded key
	 * @param iv [String] The base64 encoded IV
	 * @param iv [String] The base64 encoded HMAC
	 * @return [String] The decrypted plaintext in UTF8
	 */
	this.decrypt = function(ciphertext, key, iv, hmac) {
		// parse base64 input to utf8
		var ctUtf8 = forge.util.decode64(ciphertext);
		var keyUtf8 = forge.util.decode64(key);
		var ivUtf8 = forge.util.decode64(iv);

		// check hmac
		var checkedHmac = this.getHmac(ctUtf8, keyUtf8, ivUtf8);
		if (hmac !== checkedHmac) {
			throw new Error('The integrity check via HMAC failed!');
		}

		var cipher = forge.aes.createDecryptionCipher(keyUtf8);
		cipher.start(ivUtf8);
		cipher.update(forge.util.createBuffer(ctUtf8));
		cipher.finish();

		return cipher.output.getBytes();
	};

	/**
	 * Generate a base64 encoded HMAC using SHA-265
	 * @param input [String] The input string in UTF8
	 * @param key [String] The UTF8 encoded key
	 * @param iv [String] The UTF8 encoded IV
	 * @return [String] The base64 encoded hmac
	 */
	this.getHmac = function(input, key, iv) {
		var hmac = forge.hmac.create();
		hmac.start('sha256', key);
		if (iv) {
			hmac.update(iv);
		}
		hmac.update(input);

		return forge.util.encode64(hmac.digest().getBytes());
	};

};