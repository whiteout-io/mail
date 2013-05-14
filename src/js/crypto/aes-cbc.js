/**
 * A Wrapper for Forge's AES-CBC encryption
 */
app.crypto.AesCBC = function(forge) {
	'use strict';

	/**
	 * Encrypt a String using AES-CBC-Pkcs7 using the provided keysize (e.g. 128, 256)
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

		return forge.util.encode64(cipher.output.getBytes());
	};

	/**
	 * Decrypt a String using AES-CBC-Pkcs7 using the provided keysize (e.g. 128, 256)
	 * @param ciphertext [String] The base64 encoded ciphertext
	 * @param key [String] The base64 encoded key
	 * @param iv [String] The base64 encoded IV
	 * @param iv [String] The base64 encoded HMAC
	 * @return [String] The decrypted plaintext in UTF8
	 */
	this.decrypt = function(ciphertext, key, iv) {
		// parse base64 input to utf8
		var ctUtf8 = forge.util.decode64(ciphertext);
		var keyUtf8 = forge.util.decode64(key);
		var ivUtf8 = forge.util.decode64(iv);

		var cipher = forge.aes.createDecryptionCipher(keyUtf8);
		cipher.start(ivUtf8);
		cipher.update(forge.util.createBuffer(ctUtf8));
		cipher.finish();

		return cipher.output.getBytes();
	};

};