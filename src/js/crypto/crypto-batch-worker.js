(function() {
	'use strict';

	// import web worker dependencies
	importScripts('../../lib/forge/forge.rsa.bundle.js');
	importScripts('../app-config.js');
	importScripts('./aes-cbc.js');
	importScripts('./rsa.js');
	importScripts('./util.js');

	/**
	 * In the web worker thread context, 'this' and 'self' can be used as a global
	 * variable namespace similar to the 'window' object in the main thread
	 */
	self.onmessage = function(e) {

		var i = e.data,
			output = null,
			util = new app.crypto.Util(null, null),
			aes = new app.crypto.AesCBC(forge),
			rsa = new app.crypto.RSA(forge, util);

		rsa.init(i.pubkeyPem, i.privkeyPem);

		if (i.type === 'encrypt' && i.list) {
			// start encryption
			output = util.encryptListForUser(aes, rsa, i.list);

		} else if (i.type === 'decrypt' && i.list) {
			// start decryption
			output = util.decryptListForUser(aes, rsa, i.list);

		} else {
			throw 'Not all arguments for web worker crypto are defined!';
		}

		// pass output back to main thread
		self.postMessage(output);
	};

}());