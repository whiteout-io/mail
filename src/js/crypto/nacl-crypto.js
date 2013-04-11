/**
 * A Wrapper for NaCl's asymmetric/symmetric crypto
 */
var NaclCrypto = function(nacl, util) {
	'use strict';

	/**
	 * Generates a baes64 encoded keypair for use with NaCl
	 * @param seed [String] A base64 encoded (pseudo) random seed e.g. PBKDF2
	 */
	this.generateKeypair = function(seed) {
		var keys;

		if (seed) {
			var seedBuf = nacl.encode_latin1(util.base642Str(seed));
			keys = nacl.crypto_box_keypair_from_seed(seedBuf);
		} else {
			keys = nacl.crypto_box_keypair();
		}

		return {
			id: util.UUID(),
			boxPk: util.str2Base64(nacl.decode_latin1(keys.boxPk)),
			boxSk: util.str2Base64(nacl.decode_latin1(keys.boxSk))
		};
	};

	/**
	 * Generates a random nonce and returns it base64 encoded
	 */
	this.generateNonce = function() {
		// generate nonce
		var nonce = nacl.crypto_secretbox_random_nonce();
		var nonceBase64 = util.str2Base64(nacl.decode_latin1(nonce));

		return nonceBase64;
	};

	/**
	 * Asymmetrically encrypt a String
	 * @param plaintext [String] The input string in UTF8
	 * @param nonce [String] The base64 encoded nonce
	 * @param recipientPk [String] The receiver's base64 encoded public key
	 * @param senderSk [String] The sender's base64 encoded private key
	 * @return [Object] The base64 encoded ciphertext and nonce
	 */
	this.asymEncrypt = function(plaintext, nonce, recipientPk, senderSk) {
		// convert to Uint8Array
		var ptBuf = nacl.encode_utf8(plaintext);
		var recipientPkBuf = nacl.encode_latin1(util.base642Str(recipientPk));
		var senderSkBuf = nacl.encode_latin1(util.base642Str(senderSk));
		var nonceBuf = nacl.encode_latin1(util.base642Str(nonce));
		// encrypt
		var ct = nacl.crypto_box(ptBuf, nonceBuf, recipientPkBuf, senderSkBuf);
		// encode to base64
		var ctBase64 = util.str2Base64(nacl.decode_latin1(ct));

		return ctBase64;
	};

	/**
	 * Asymmetrically decrypt a String
	 * @param ciphertext [String] The base64 encoded ciphertext
	 * @param nonce [String] The base64 encoded nonce
	 * @param senderPk [String] The sender's base64 encoded public key
	 * @param recipientSk [String] The receiver's base64 encoded private key
	 * @return [String] The decrypted plaintext in UTF8
	 */
	this.asymDecrypt = function(ciphertext, nonce, senderPk, recipientSk) {
		// convert to Uint8Array
		var ctBuf = nacl.encode_latin1(util.base642Str(ciphertext));
		var nonceBuf = nacl.encode_latin1(util.base642Str(nonce));
		var senderPkBuf = nacl.encode_latin1(util.base642Str(senderPk));
		var recipientSkBuf = nacl.encode_latin1(util.base642Str(recipientSk));
		// decrypt
		var pt = nacl.crypto_box_open(ctBuf, nonceBuf, senderPkBuf, recipientSkBuf);
		// decode to string
		var ptStr = nacl.decode_utf8(pt);

		return ptStr;
	};

	/**
	 * Symmetrically encrypt a String
	 * @param plaintext [String] The input string in UTF8
	 * @param nonce [String] The base64 encoded nonce
	 * @param secretKey [String] The receiver's base64 encoded public key
	 * @return [Object] The base64 encoded ciphertext and nonce
	 */
	this.symEncrypt = function(plaintext, nonce, secretKey) {
		// convert to Uint8Array
		var ptBuf = nacl.encode_utf8(plaintext);
		var secretKeyBuf = nacl.encode_latin1(util.base642Str(secretKey));
		var nonceBuf = nacl.encode_latin1(util.base642Str(nonce));
		// encrypt
		var ct = nacl.crypto_secretbox(ptBuf, nonceBuf, secretKeyBuf);
		// encode to base64
		var ctBase64 = util.str2Base64(nacl.decode_latin1(ct));

		return ctBase64;
	};

	/**
	 * Symmetrically decrypt a String
	 * @param ciphertext [String] The base64 encoded ciphertext
	 * @param nonce [String] The base64 encoded nonce
	 * @param secretKey [String] The sender's base64 encoded public key
	 * @return [String] The decrypted plaintext in UTF8
	 */
	this.symDecrypt = function(ciphertext, nonce, secretKey) {
		// convert to Uint8Array
		var ctBuf = nacl.encode_latin1(util.base642Str(ciphertext));
		var nonceBuf = nacl.encode_latin1(util.base642Str(nonce));
		var secretKeyBuf = nacl.encode_latin1(util.base642Str(secretKey));
		// decrypt
		var pt = nacl.crypto_secretbox_open(ctBuf, nonceBuf, secretKeyBuf);
		// decode to string
		var ptStr = nacl.decode_utf8(pt);

		return ptStr;
	};

};

if (typeof module !== 'undefined' && module.exports) {
	module.exports = NaclCrypto;
} else {
	app.crypto.NaclCrypto = NaclCrypto;
}