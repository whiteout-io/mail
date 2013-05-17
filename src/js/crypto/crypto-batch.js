/**
 * Crypto batch library for processing large sets of data
 */
var CryptoBatch = function(aes, rsa, util) {
	'use strict';

	/**
	 * Encrypt a list of items using AES
	 * @list list [Array] The list of items to encrypt
	 */
	this.encryptList = function(list) {
		list.forEach(function(i) {
			// stringify to JSON before encryption
			i.ciphertext = aes.encrypt(JSON.stringify(i.plaintext), i.key, i.iv);
			delete i.plaintext;
		});

		return list;
	};

	/**
	 * Decrypt a list of items using AES
	 * @list list [Array] The list of items to decrypt
	 */
	this.decryptList = function(list) {
		list.forEach(function(i) {
			// decrypt JSON and parse to object literal
			i.plaintext = JSON.parse(aes.decrypt(i.ciphertext, i.key, i.iv));
			delete i.ciphertext;
		});

		return list;
	};

	/**
	 * Encrypt and sign a list of items using AES and RSA
	 * @list list [Array] The list of items to encrypt
	 */
	this.encryptListForUser = function(list) {
		// encrypt list
		var encryptedList = this.encryptList(list);

		// encrypt keys for user
		encryptedList.forEach(function(i) {
			// process new values
			i.encryptedKey = rsa.encrypt(i.key);
			i.signature = rsa.sign([i.iv, util.str2Base64(i.id), i.encryptedKey, i.ciphertext]);
			// delete old ones
			delete i.key;
		});

		return encryptedList;
	};

	/**
	 * Decrypt and verify a list of items using AES and RSA
	 * @list list [Array] The list of items to decrypt
	 */
	this.decryptListForUser = function(encryptedList) {
		var j, self = this;

		// decrypt keys for user
		encryptedList.forEach(function(i) {
			// verify signature
			if (!rsa.verify([i.iv, util.str2Base64(i.id), i.encryptedKey, i.ciphertext], i.signature)) {
				throw new Error('Verifying RSA signature failed!');
			}
			// precoess new values
			i.key = rsa.decrypt(i.encryptedKey);
			// delete old values
			delete i.signature;
			delete i.encryptedKey;
		});

		// decrypt list
		var decryptedList = this.decryptList(encryptedList);

		// add plaintext to list
		for (j = 0; j < decryptedList.length; j++) {
			decryptedList[j] = decryptedList[j].plaintext;
		}

		return decryptedList;
	};
};

if (typeof module !== 'undefined' && module.exports) {
	module.exports = CryptoBatch;
} else {
	app.crypto.CryptoBatch = CryptoBatch;
}