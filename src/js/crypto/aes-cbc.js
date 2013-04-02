/**
 * A Wrapper for Crypto.js's AES-CBC encryption
 */
app.crypto.AesCBC = function() {
	'use strict';

	var mode = CryptoJS.mode.CBC; // use CBC mode for Crypto.js
	var padding = CryptoJS.pad.Pkcs7; // use Pkcs7/Pkcs5 padding for Crypto.js

	/**
	 * Encrypt a String using AES-CBC-Pkcs7 using the provided keysize (e.g. 128, 256)
	 * @param plaintext [String] The input string in UTF8
	 * @param key [String] The base64 encoded key
	 * @param iv [String] The base64 encoded IV
	 * @return [String] The base64 encoded ciphertext
	 */
	this.encrypt = function(plaintext, key, iv) {
		// parse base64 input to crypto.js WordArrays
		var keyWords = CryptoJS.enc.Base64.parse(key);
		var ivWords = CryptoJS.enc.Base64.parse(iv);
		var plaintextWords = CryptoJS.enc.Utf8.parse(plaintext);

		var encrypted = CryptoJS.AES.encrypt(plaintextWords, keyWords, {
			iv: ivWords,
			mode: mode,
			padding: padding
		});
		var ctBase64 = CryptoJS.enc.Base64.stringify(encrypted.ciphertext);

		return ctBase64;
	};

	/**
	 * Decrypt a String using AES-CBC-Pkcs7 using the provided keysize (e.g. 128, 256)
	 * @param ciphertext [String] The base64 encoded ciphertext
	 * @param key [String] The base64 encoded key
	 * @param iv [String] The base64 encoded IV
	 * @return [String] The decrypted plaintext in UTF8
	 */
	this.decrypt = function(ciphertext, key, iv) {
		// parse base64 input to crypto.js WordArrays
		var keyWords = CryptoJS.enc.Base64.parse(key);
		var ivWords = CryptoJS.enc.Base64.parse(iv);

		var decrypted = CryptoJS.AES.decrypt(ciphertext, keyWords, {
			iv: ivWords,
			mode: mode,
			padding: padding
		});
		var pt = decrypted.toString(CryptoJS.enc.Utf8);

		return pt;
	};

};