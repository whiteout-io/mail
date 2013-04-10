(function() {
	'use strict';

	// import web worker dependencies
	importScripts('../../lib/nacl.js');
	importScripts('../app-config.js');
	importScripts('./util.js');
	importScripts('./nacl-crypto.js');

	/**
	 * In the web worker thread context, 'this' and 'self' can be used as a global
	 * variable namespace similar to the 'window' object in the main thread
	 */
	self.onmessage = function(e) {

		var args = e.data,
			output = null,
			util = new app.crypto.Util(),
			crypto = new app.crypto.NaclCrypto(nacl, util);

		if (args.type === 'encrypt' && args.plaintext && args.nonce && args.recipientPk && args.senderSk) {
			// start encryption
			output = nacl.crypto_box(args.plaintext, args.nonce, args.recipientPk, args.senderSk);

		} else if (args.type === 'decrypt' && args.ciphertext && args.nonce && args.senderPk && args.recipienSk) {
			// start decryption
			output = nacl.crypto_box_open(args.ciphertext, args.nonce, args.senderPk, args.recipienSk);

		} else {
			throw 'Not all arguments for web worker crypto are defined!';
		}

		// pass output back to main thread
		self.postMessage(output);
	};

}());