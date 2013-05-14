(function() {
	'use strict';

	// import web worker dependencies
	importScripts('../../lib/forge/forge.rsa.bundle.js');
	importScripts('../app-config.js');
	importScripts('./aes-cbc.js');

	/**
	 * In the web worker thread context, 'this' and 'self' can be used as a global
	 * variable namespace similar to the 'window' object in the main thread
	 */
	self.onmessage = function(e) {

		var args = e.data,
			output = null,
			aes = new app.crypto.AesCBC(forge);

		if (args.type === 'encrypt' && args.plaintext && args.key && args.iv) {
			// start encryption
			output = aes.encrypt(args.plaintext, args.key, args.iv);

		} else if (args.type === 'decrypt' && args.ciphertext && args.key && args.iv) {
			// start decryption
			output = aes.decrypt(args.ciphertext, args.key, args.iv);

		} else {
			throw 'Not all arguments for web worker crypto are defined!';
		}

		// pass output back to main thread
		self.postMessage(output);
	};

}());