(function() {
	'use strict';

	// import web worker dependencies
	importScripts('../../lib/require.js');

	/**
	 * In the web worker thread context, 'this' and 'self' can be used as a global
	 * variable namespace similar to the 'window' object in the main thread
	 */
	self.onmessage = function(e) {
		// fetch dependencies via require.js
		require(['../../require-config'], function() {
			require.config({
				baseUrl: '../../lib'
			});

			require(['cryptoLib/crypto-batch'], function(batch) {

				var i = e.data,
					output = null;

				if (i.type === 'encrypt' && i.receiverPubkeys && i.senderPrivkey && i.list) {
					// start encryption
					output = batch.encryptListForUser(i.list, i.receiverPubkeys, i.senderPrivkey);

				} else if (i.type === 'decrypt' && i.senderPubkeys && i.receiverPrivkey && i.list) {
					// start decryption
					output = batch.decryptListForUser(i.list, i.senderPubkeys, i.receiverPrivkey);

				} else if (i.type === 'reencrypt' && i.senderPubkeys && i.receiverPrivkey && i.list && i.symKey) {
					// start validation and re-encryption
					output = batch.reencryptListKeysForUser(i.list, i.senderPubkeys, i.receiverPrivkey, i.symKey);

				} else if (i.type === 'decryptItems' && i.symKey && i.list) {
					// start decryption
					output = batch.decryptKeysAndList(i.list, i.symKey);

				} else {
					throw 'Not all arguments for web worker crypto are defined!';
				}

				// pass output back to main thread
				self.postMessage(output);

			});
		});
	};

}());