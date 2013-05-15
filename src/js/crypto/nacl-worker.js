(function() {
	'use strict';

	// import web worker dependencies
	importScripts('../../lib/nacl.js');

	/**
	 * In the web worker thread context, 'this' and 'self' can be used as a global
	 * variable namespace similar to the 'window' object in the main thread
	 */
	self.onmessage = function(e) {

		var i = e.data,
			output = null;

		if (i.type === 'keygen') {
			// generate keypair
			if (i.seed) {
				output = nacl.crypto_box_keypair_from_seed(i.seed);
			} else {
				output = nacl.crypto_box_keypair();
			}

		} else if (i.type === 'encrypt' && i.plaintext && i.nonce && i.recipientPk && i.senderSk) {
			// start encryption
			output = nacl.crypto_box(i.plaintext, i.nonce, i.recipientPk, i.senderSk);

		} else if (i.type === 'decrypt' && i.ciphertext && i.nonce && i.senderPk && i.recipienSk) {
			// start decryption
			output = nacl.crypto_box_open(i.ciphertext, i.nonce, i.senderPk, i.recipienSk);

		} else {
			throw 'Not all arguments for web worker crypto are defined!';
		}

		// pass output back to main thread
		self.postMessage(output);
	};

}());