/**
 * A Wrapper for Forge's RSA encryption
 */
app.crypto.RSA = function(forge) {
	'use strict';

	var publicKey = null,
		privateKey = null;

	/**
	 * Initializes the RSA module by passing the user's keypair
	 * The private key is option and required only for decryption
	 * and signing
	 */
	this.init = function(pubkeyPem, privkeyPem) {
		publicKey = forge.pki.publicKeyFromPem(pubkeyPem);
		if (privkeyPem) {
			privateKey = forge.pki.privateKeyFromPem(privkeyPem);
		}
	};

	/**
	 * Generate RSA keypair with the corresponding keysize
	 */
	this.generateKeypair = function(keySize, callback) {
		forge.rsa.generateKeyPair({
			bits: keySize,
			workerScript: app.config.workerPath + '/../../lib/forge/prime.worker.js'
		}, function(err, keypair) {
			if (err || !keypair.publicKey || !keypair.privateKey) {
				callback({
					errMsg: 'RSA keygeneration failed!',
					err: err
				});
				return;
			}

			publicKey = keypair.publicKey;
			privateKey = keypair.privateKey;

			callback();
		});
	};

	/**
	 * Exports user's keypair as PEMs
	 */
	this.exportKeys = function() {
		return {
			pubkeyPem: forge.pki.publicKeyToPem(publicKey),
			privkeyPem: forge.pki.privateKeyToPem(privateKey)
		};
	};

	/**
	 * Encrypt a String using RSA with PKCS#1 v1.5 padding
	 * @param plaintext [String] The input string in UTF8
	 * @return [String] The base64 encoded ciphertext
	 */
	this.encrypt = function(plaintext) {
		var ct = publicKey.encrypt(plaintext);
		return forge.util.encode64(ct);
	};

	/**
	 * Decrypt a String using RSA with PKCS#1 v1.5 padding
	 * @param ciphertext [String] The base64 encoded ciphertext
	 * @return [String] The decrypted plaintext in UTF8
	 */
	this.decrypt = function(ciphertext) {
		// parse base64 input to utf8
		var ctUtf8 = forge.util.decode64(ciphertext);
		return privateKey.decrypt(ctUtf8);
	};

	/**
	 * Signs an Array of Base64 encoded parts with the private key
	 * @param parts [Array] Array of Base64 encoded parts
	 * @return [String] The Base64 encoded signature
	 */
	this.sign = function(parts) {
		var sha = forge.md.sha256.create();
		parts.forEach(function(i) {
			sha.update(forge.util.decode64(i));
		});

		return forge.util.encode64(privateKey.sign(sha));
	};

	/**
	 * Verifies an Array of Base64 encoded parts with the public key
	 * @param parts [Array] Array of Base64 encoded parts
	 * @param sig [String] The Base64 encoded signatrure
	 * @return [bool] if the verification was successful
	 */
	this.verify = function(parts, sig) {
		// parse base64 signature to utf8
		var sigUtf8 = forge.util.decode64(sig);

		var sha = forge.md.sha256.create();
		parts.forEach(function(i) {
			sha.update(forge.util.decode64(i));
		});

		return publicKey.verify(sha.digest().getBytes(), sigUtf8);
	};

};