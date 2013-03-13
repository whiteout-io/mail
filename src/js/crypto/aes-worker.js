'use strict';

// import web worker dependencies
importScripts('../../lib/sjcl/sjcl.js');
importScripts('../../lib/sjcl/bitArray.js');
importScripts('../../lib/sjcl/codecBase64.js');
importScripts('../../lib/sjcl/codecString.js');
importScripts('../../lib/sjcl/aes.js');
importScripts('../../lib/sjcl/ccm.js');
importScripts('../app-config.js');
importScripts('./aes-ccm.js');

var AESWORKER = (function () {
	
	/**
	 * In the web worker thread context, 'this' and 'self' can be used as a global
	 * variable namespace similar to the 'window' object in the main thread
	 */
	self.addEventListener('message', function(e) {
		
		var args = e.data,
			output = null,
			aes = new app.crypto.AesCCM();
			
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
	}, false);
	
}());