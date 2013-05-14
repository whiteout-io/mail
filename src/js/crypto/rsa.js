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

	this.sign = function(input) {
		var sha = forge.md.sha256.create();
		sha.update(input);

		var sig = privateKey.sign(sha);
		return forge.util.encode64(sig);
	};

	this.verify = function(input, sig) {
		// parse base64 signature to utf8
		var sigUtf8 = forge.util.decode64(sig);

		var sha = forge.md.sha256.create();
		sha.update(input);

		return publicKey.verify(sha.digest().getBytes(), sigUtf8);
	};

};