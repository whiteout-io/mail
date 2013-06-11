(function() {
	'use strict';

	/**
	 * A Wrapper for Forge's RSA encryption
	 */
	var RSA = function(forge, util, app) {

		var utl = forge.util;

		var keypair = {};

		/**
		 * Initializes the RSA module by passing the user's keypair
		 * The private key is option and required only for decryption
		 * and signing
		 */
		this.init = function(pubkeyPem, privkeyPem, keyId) {
			if (pubkeyPem) {
				keypair.publicKey = forge.pki.publicKeyFromPem(pubkeyPem);
			}
			if (privkeyPem) {
				keypair.privateKey = forge.pki.privateKeyFromPem(privkeyPem);
			}
			if (keyId) {
				keypair._id = keyId;
			}
		};

		/**
		 * Generate RSA keypair with the corresponding keysize
		 */
		this.generateKeypair = function(keySize, callback) {
			forge.rsa.generateKeyPair({
				bits: keySize,
				workerScript: (typeof app !== 'undefined') ? (app.config.workerPath + '/../lib/prime.worker.js') : undefined
			}, function(err, newKeypair) {
				if (err || !newKeypair || !newKeypair.publicKey || !newKeypair.privateKey) {
					callback({
						errMsg: 'RSA keygeneration failed!',
						err: err
					});
					return;
				}

				keypair = newKeypair;
				// generate unique keypair ID
				keypair._id = util.UUID();

				callback(null, {
					_id: keypair._id,
					pubkeyPem: forge.pki.publicKeyToPem(keypair.publicKey),
					privkeyPem: forge.pki.privateKeyToPem(keypair.privateKey)
				});
			});
		};

		/**
		 * Exports user's keypair as PEMs
		 */
		this.exportKeys = function() {
			return {
				_id: keypair._id,
				pubkeyPem: forge.pki.publicKeyToPem(keypair.publicKey),
				privkeyPem: forge.pki.privateKeyToPem(keypair.privateKey)
			};
		};

		/**
		 * Encrypt a String using RSA with PKCS#1 v1.5 padding
		 * @param plaintext [String] The input string in UTF-16
		 * @return [String] The base64 encoded ciphertext
		 */
		this.encrypt = function(plaintext) {
			// encode plaintext to utf8 and encrypt
			var ct = keypair.publicKey.encrypt(utl.encodeUtf8(plaintext));
			// encode ciphtext to base64
			return utl.encode64(ct);
		};

		/**
		 * Decrypt a String using RSA with PKCS#1 v1.5 padding
		 * @param ciphertext [String] The base64 encoded ciphertext
		 * @return [String] The decrypted plaintext in UTF-16
		 */
		this.decrypt = function(ciphertext) {
			// decode base64 ciphertext to utf8
			var ctUtf8 = utl.decode64(ciphertext);
			// decrypt and decode to utf16
			return utl.decodeUtf8(keypair.privateKey.decrypt(ctUtf8));
		};

		/**
		 * Signs an Array of Base64 encoded parts with the private key
		 * @param parts [Array] Array of Base64 encoded parts
		 * @return [String] The Base64 encoded signature
		 */
		this.sign = function(parts) {
			var sha = forge.md.sha256.create();
			parts.forEach(function(i) {
				// decode base64 part and append to sha msg
				sha.update(utl.decode64(i));
			});

			// encode signature to base64
			return utl.encode64(keypair.privateKey.sign(sha));
		};

		/**
		 * Verifies an Array of Base64 encoded parts with the public key
		 * @param parts [Array] Array of Base64 encoded parts
		 * @param sig [String] The Base64 encoded signatrure
		 * @return [bool] if the verification was successful
		 */
		this.verify = function(parts, sig) {
			// decode base64 signature to utf8
			var sigUtf8 = utl.decode64(sig);

			var sha = forge.md.sha256.create();
			parts.forEach(function(i) {
				// decode base64 part and append to sha msg
				sha.update(utl.decode64(i));
			});

			return keypair.publicKey.verify(sha.digest().getBytes(), sigUtf8);
		};

	};

	if (typeof define !== 'undefined' && define.amd) {
		// AMD
		define(['forge', 'cryptoLib/util', 'js/app-config'], function(forge, util, app) {
			return new RSA(forge, util, app);
		});
	} else if (typeof module !== 'undefined' && module.exports) {
		// node.js
		module.exports = new RSA(require('node-forge'), require('./util'));
	}

})();