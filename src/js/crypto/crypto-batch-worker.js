(function() {
	'use strict';

	// import web worker dependencies
	importScripts('../../lib/underscore-1.4.4.min.js');
	importScripts('../../lib/forge/forge.rsa.bundle.js');
	importScripts('../app-config.js');
	importScripts('./crypto-batch.js');
	importScripts('./aes-cbc.js');
	importScripts('./util.js');
	importScripts('./rsa.js');

	/**
	 * In the web worker thread context, 'this' and 'self' can be used as a global
	 * variable namespace similar to the 'window' object in the main thread
	 */
	self.onmessage = function(e) {

		var i = e.data,
			output = null,
			aes = new cryptoLib.AesCBC(forge),
			rsa = new cryptoLib.RSA(forge),
			util = new cryptoLib.Util(),
			batch = new cryptoLib.CryptoBatch(aes, rsa, util, _);

		if (i.type === 'encrypt' && i.receiverPubkeys && i.senderPrivkey && i.list) {
			// start encryption
			output = batch.encryptListForUser(i.list, i.receiverPubkeys, i.senderPrivkey);

		} else if (i.type === 'decrypt' && i.senderPubkeys && i.receiverPrivkey && i.list) {
			// start decryption
			output = batch.decryptListForUser(i.list, i.senderPubkeys, i.receiverPrivkey);

		} else {
			throw 'Not all arguments for web worker crypto are defined!';
		}

		// pass output back to main thread
		self.postMessage(output);
	};

}());