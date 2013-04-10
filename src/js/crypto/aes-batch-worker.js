(function() {
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
	importScripts('./util.js');

	/**
	 * In the web worker thread context, 'this' and 'self' can be used as a global
	 * variable namespace similar to the 'window' object in the main thread
	 */
	self.onmessage = function(e) {

		var args = e.data,
			output = null,
			aes = new app.crypto.AesCCM(sjcl),
			util = new app.crypto.Util(null, null);

		if (args.type === 'encrypt' && args.list) {
			// start encryption
			output = util.encryptList(aes, args.list);

		} else if (args.type === 'decrypt' && args.list) {
			// start decryption
			output = util.decryptList(aes, args.list);

		} else {
			throw 'Not all arguments for web worker crypto are defined!';
		}

		// pass output back to main thread
		self.postMessage(output);
	};

}());