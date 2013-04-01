(function() {
	'use strict';

	// import web worker dependencies
	importScripts('../../lib/crypto-js/core.js');
	importScripts('../../lib/crypto-js/enc-base64.js');
	importScripts('../../lib/crypto-js/sha1.js');
	importScripts('../../lib/crypto-js/hmac.js');
	importScripts('../../lib/crypto-js/pbkdf2.js');
	importScripts('../app-config.js');
	importScripts('./pbkdf2.js');

	/**
	 * In the web worker thread context, 'this' and 'self' can be used as a global
	 * variable namespace similar to the 'window' object in the main thread
	 */
	self.addEventListener('message', function(e) {

		var args = e.data,
			key = null;

		if (e.data.password && e.data.keySize) {
			// start deriving key
			var pbkdf2 = new app.crypto.PBKDF2();
			key = pbkdf2.getKey(e.data.password, e.data.keySize);

		} else {
			throw 'Not all arguments for web worker crypto are defined!';
		}

		// pass output back to main thread
		self.postMessage(key);
	}, false);

}());