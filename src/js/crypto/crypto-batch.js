/**
 * Crypto batch library for processing large sets of data
 */
var CryptoBatch = function(aes, rsa) {
	'use strict';

	/**
	 * Encrypt a list of items using AES
	 * @list list [Array] The list of items to encrypt
	 */
	this.encryptList = function(list) {
		var outList = [];

		list.forEach(function(i) {
			// stringify to JSON before encryption
			outList.push({
				id: i.id,
				ciphertext: aes.encrypt(JSON.stringify(i.plaintext), i.key, i.iv),
				key: i.key,
				iv: i.iv
			});
		});

		return outList;
	};

	/**
	 * Decrypt a list of items using AES
	 * @list list [Array] The list of items to decrypt
	 */
	this.decryptList = function(list) {
		var outList = [];

		list.forEach(function(i) {
			// decrypt JSON and parse to object literal
			outList.push({
				id: i.id,
				plaintext: JSON.parse(aes.decrypt(i.ciphertext, i.key, i.iv)),
				key: i.key,
				iv: i.iv
			});
		});

		return outList;
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
			i.signature = rsa.sign([i.iv, i.encryptedKey, i.ciphertext]);
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
		var list = [],
			self = this;

		// decrypt keys for user
		encryptedList.forEach(function(i) {
			// verify signature
			if (!rsa.verify([i.iv, i.encryptedKey, i.ciphertext], i.signature)) {
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
		decryptedList.forEach(function(i) {
			list.push(i.plaintext);
		});

		return list;
	};
};

if (typeof module !== 'undefined' && module.exports) {
	module.exports = CryptoBatch;
} else {
	app.crypto.CryptoBatch = CryptoBatch;
}