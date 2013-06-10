(function() {
	'use strict';

	/**
	 * Crypto batch library for processing large sets of data
	 */
	var CryptoBatch = function(aes, rsa, util, _) {

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
		};

		/**
		 * Decrypt and verify an item using AES and RSA
		 * @param i [Object] The item to decrypt
		 * @param senderPubkey [String] A public key used to verify
		 */
		this.decryptItemForUser = function(i, senderPubkey) {
			// set rsa public key used to verify
			rsa.init(senderPubkey);

			// verify signature
			if (!rsa.verify([i.iv, util.str2Base64(i.id), util.str2Base64(i.senderPk), i.encryptedKey, i.ciphertext], i.signature)) {
				throw new Error('Verifying RSA signature failed!');
			}
			// decrypt symmetric item key for user
			i.key = rsa.decrypt(i.encryptedKey);

			// symmetrically decrypt JSON and parse to object literal
			i.plaintext = JSON.parse(aes.decrypt(i.ciphertext, i.key, i.iv));

			// delete ciphertext values
			delete i.signature;
			delete i.encryptedKey;
			delete i.senderPk;
			delete i.ciphertext;
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

		/**
		 * Decrypt and verify a list of items using AES and RSA
		 * @param list [Array] The list of items to decrypt
		 * @param senderPubkeys [Array] A list of public keys used to verify
		 * @param receiverPrivkey [Array] The receiver's private key used to decrypt
		 */
		this.decryptListForUser = function(list, senderPubkeys, receiverPrivkey) {
			var senderPk, j,
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
				self.decryptItemForUser(i, senderPk.publicKey);
			});

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