(function() {
	'use strict';

	/**
	 * Crypto batch library for processing large sets of data
	 */
	var CryptoBatch = function(aes, rsa, util, _) {

		//
		// Encrypt batch
		//

		/**
		 * Encrypt and sign an item using AES and RSA
		 * @param i [Object] The item to encrypt
		 * @param receiverPubkey [String] The public key used to encrypt
		 * @param senderKeyId [String] The sender's private key ID used to sign
		 */
		this.encryptItemForUser = function(i, receiverPubkey, senderKeyId) {
			// set rsa public key used to encrypt
			rsa.init(receiverPubkey);

			// stringify to JSON before symmetric encryption
			i.ciphertext = aes.encrypt(JSON.stringify(i.plaintext), i.key, i.iv);

			// encrypt symmetric item key for user
			i.encryptedKey = rsa.encrypt(i.key);
			// set sender's keypair id for later verification
			i.senderPk = senderKeyId;
			// sign the bundle
			i.signature = rsa.sign([i.iv, util.str2Base64(i.id), util.str2Base64(i.senderPk), i.encryptedKey, i.ciphertext]);

			// delete plaintext values
			delete i.plaintext;
			delete i.key;
			delete i.receiverPk;

			return i;
		};

		/**
		 * Encrypt and sign a list of items using AES and RSA
		 * @param list [Array] The list of items to encrypt
		 * @param receiverPubkeys [Array] A list of public keys used to encrypt
		 * @param senderPrivkey [Array] The sender's private key used to sign
		 */
		this.encryptListForUser = function(list, receiverPubkeys, senderPrivkey) {
			var receiverPk,
				self = this;

			// set sender private key
			rsa.init(null, senderPrivkey.privateKey);

			list.forEach(function(i) {
				// fetch correct public key for encryption
				receiverPk = null;
				receiverPk = _.findWhere(receiverPubkeys, {
					_id: i.receiverPk
				});

				// encrypt item for user
				self.encryptItemForUser(i, receiverPk.publicKey, senderPrivkey._id);
			});

			return list;
		};

		//
		// Decrypt batch
		//

		/**
		 * Verfiy an item and decrypt its item key using RSA
		 * @param i [Object] The item to decrypt
		 * @param senderPubkey [String] A public key used to verify
		 */
		this.decryptItemKeyForUser = function(i, senderPubkey) {
			// set rsa public key used to verify
			rsa.init(senderPubkey);

			// verify signature
			if (!rsa.verify([i.iv, util.str2Base64(i.id), util.str2Base64(i.senderPk), i.encryptedKey, i.ciphertext], i.signature)) {
				throw new Error('Verifying RSA signature failed!');
			}
			// decrypt symmetric item key for user
			i.key = rsa.decrypt(i.encryptedKey);

			// delete ciphertext values
			delete i.signature;
			delete i.encryptedKey;
			delete i.senderPk;

			return i;
		};

		/**
		 * Decrypt and verify a list of item keys using RSA
		 * @param list [Array] The list of items to decrypt
		 * @param senderPubkeys [Array] A list of public keys used to verify
		 * @param receiverPrivkey [String] The receiver's private key used to decrypt
		 */
		this.decryptListKeysForUser = function(list, senderPubkeys, receiverPrivkey) {
			var senderPk,
				self = this;

			// set receiver private key
			rsa.init(null, receiverPrivkey.privateKey);

			list.forEach(function(i) {
				// fetch correct public key for verification
				senderPk = null;
				senderPk = _.findWhere(senderPubkeys, {
					_id: i.senderPk
				});

				// decrypt item for user
				self.decryptItemKeyForUser(i, senderPk.publicKey);
			});

			return list;
		};

		/**
		 * Decrypt a list of item keys using RSA and the encrypt them again using AES
		 * @param list [Array] The list of items to decrypt
		 * @param senderPubkeys [Array] A list of public keys used to verify
		 * @param receiverPrivkey [String] The receiver's private key used to decrypt
		 * @param symKey [String] The symmetric key used to re-encrypt the item key
		 */
		this.reencryptListKeysForUser = function(list, senderPubkeys, receiverPrivkey, symKey) {
			// verify and decrypt item keys using RSA
			this.decryptListKeysForUser(list, senderPubkeys, receiverPrivkey);

			list.forEach(function(i) {
				// re-encrypt item key using aes
				i.encryptedKey = aes.encrypt(i.key, symKey, i.iv);

				delete i.key;
			});

			return list;
		};

		/**
		 * Decrypt an item using AES
		 * @param i [Object] The item to decrypt
		 */
		this.decryptItem = function(i) {
			// symmetrically decrypt JSON and parse to object literal
			i.plaintext = JSON.parse(aes.decrypt(i.ciphertext, i.key, i.iv));

			// delete ciphertext values
			delete i.ciphertext;

			return i;
		};

		/**
		 * Decrypt a list of items using AES
		 * @param i [Object] The item to decrypt
		 */
		this.decryptList = function(list) {
			var self = this;

			list.forEach(function(i) {
				// decrypt item for user
				self.decryptItem(i);
			});

			return list;
		};

		/**
		 * Decrypt keys and items using AES
		 * @param list [Array] The list of items to decrypt
		 * @param symKey [String] The symmetric key used to re-encrypt the item key
		 */
		this.decryptKeysAndList = function(list, symKey) {
			var self = this,
				j;

			list.forEach(function(i) {
				// decrypt item key
				i.key = aes.decrypt(i.encryptedKey, symKey, i.iv);
				// decrypt item for user
				self.decryptItem(i);

				delete i.encryptedKey;
			});

			// set plaintext as list item
			for (j = 0; j < list.length; j++) {
				list[j] = list[j].plaintext;
			}

			return list;
		};

		/**
		 * Decrypt and verify an item using AES and RSA
		 * @param i [Object] The item to decrypt
		 * @param senderPubkey [String] A public key used to verify
		 */
		this.decryptItemForUser = function(i, senderPubkey) {
			// verfiy signature and decrypt item key
			this.decryptItemKeyForUser(i, senderPubkey);

			// symmetrically decrypt JSON and parse to object literal
			this.decryptItem(i);

			return i;
		};

		/**
		 * Decrypt and verify a list of items using AES and RSA
		 * @param list [Array] The list of items to decrypt
		 * @param senderPubkeys [Array] A list of public keys used to verify
		 * @param receiverPrivkey [Array] The receiver's private key used to decrypt
		 */
		this.decryptListForUser = function(list, senderPubkeys, receiverPrivkey) {
			var j;

			// verify and decrypt a list of items using RSA
			this.decryptListKeysForUser(list, senderPubkeys, receiverPrivkey);

			// decrypt a list of items
			this.decryptList(list);

			// set plaintext as list item
			for (j = 0; j < list.length; j++) {
				list[j] = list[j].plaintext;
			}

			return list;
		};
	};

	if (typeof define !== 'undefined' && define.amd) {
		// AMD
		define(['cryptoLib/aes-cbc', 'cryptoLib/rsa', 'cryptoLib/util', 'underscore'], function(aes, rsa, util, _) {
			return new CryptoBatch(aes, rsa, util, _);
		});
	} else if (typeof module !== 'undefined' && module.exports) {
		// node.js
		module.exports = new CryptoBatch(require('./aes-cbc'), require('./rsa'), require('./util'), require('underscore'));
	}

})();