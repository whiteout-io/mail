(function() {
	'use strict';

	/**
	 * Crypto batch library for processing large sets of data
	 */
	var CryptoBatch = function(aes, rsa, util, _) {

		/**
		 * Encrypt a list of items using AES
		 * @param list [Array] The list of items to encrypt
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
		 * @param list [Array] The list of items to decrypt
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
		 * @param list [Array] The list of items to encrypt
		 * @param receiverPubkeys [Array] A list of public keys used to encrypt
		 * @param senderPrivkey [Array] The sender's private key used to sign
		 */
		this.encryptListForUser = function(list, receiverPubkeys, senderPrivkey) {
			// encrypt list with aes
			var encryptedList = this.encryptList(list);

			// set sender private key
			rsa.init(null, senderPrivkey.privateKey);

			// encrypt keys for user
			encryptedList.forEach(function(i) {
				// fetch correct public key
				var pk = _.findWhere(receiverPubkeys, {
					_id: i.receiverPk
				});
				// set rsa public key used to encrypt
				rsa.init(pk.publicKey);

				// process new values
				i.encryptedKey = rsa.encrypt(i.key);
				i.signature = rsa.sign([i.iv, util.str2Base64(i.id), i.encryptedKey, i.ciphertext]);
				i.senderPk = senderPrivkey._id;
				// delete old ones
				delete i.key;
				delete i.receiverPk;
			});

			return encryptedList;
		};

		/**
		 * Decrypt and verify a list of items using AES and RSA
		 * @param list [Array] The list of items to decrypt
		 * @param senderPubkeys [Array] A list of public keys used to verify
		 * @param receiverPrivkey [Array] The receiver's private key used to decrypt
		 */
		this.decryptListForUser = function(encryptedList, senderPubkeys, receiverPrivkey) {
			var j, self = this;

			// set receiver private key
			rsa.init(null, receiverPrivkey.privateKey);

			// decrypt keys for user
			encryptedList.forEach(function(i) {
				// fetch correct public key
				var pk = _.findWhere(senderPubkeys, {
					_id: i.senderPk
				});
				// set rsa public key used to verify
				rsa.init(pk.publicKey);

				// verify signature
				if (!rsa.verify([i.iv, util.str2Base64(i.id), i.encryptedKey, i.ciphertext], i.signature)) {
					throw new Error('Verifying RSA signature failed!');
				}
				// process new values
				i.key = rsa.decrypt(i.encryptedKey);
				// delete old values
				delete i.signature;
				delete i.encryptedKey;
				delete i.senderPk;
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
		var that = (typeof window !== 'undefined') ? window : self;
		that.cryptoLib = that.cryptoLib || {};
		that.cryptoLib.CryptoBatch = CryptoBatch;
	}

})();