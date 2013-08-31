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

				var output;

				try {
					output = doOperation(batch, e.data);
				} catch (e) {
					output = {
						err: {
							errMsg: (e.message) ? e.message : e
						}
					};
				}

				// pass output back to main thread
				self.postMessage(output);

			});
		});
	};

	function doOperation(batch, i) {
		var output;

		//
		// Asymmetric encryption
		//

		if (i.type === 'asymEncrypt' && i.receiverPubkeys && i.senderPrivkey && i.list) {
			// start encryption
			output = batch.encryptListForUser(i.list, i.receiverPubkeys, i.senderPrivkey);

		} else if (i.type === 'asymDecrypt' && i.senderPubkeys && i.receiverPrivkey && i.list) {
			// start decryption
			output = batch.decryptListForUser(i.list, i.senderPubkeys, i.receiverPrivkey);
		}

		//
		// Symmetric encryption
		//
		else if (i.type === 'symEncrypt' && i.list) {
			// start encryption
			output = batch.authEncryptList(i.list);

		} else if (i.type === 'symDecrypt' && i.list && i.keys) {
			// start decryption
			output = batch.authDecryptList(i.list, i.keys);
		}

		//
		// Reencryption of asymmetric items to symmetric items
		//
		else if (i.type === 'reencrypt' && i.senderPubkeys && i.receiverPrivkey && i.list && i.symKey) {
			// start validation and re-encryption
			output = batch.reencryptListKeysForUser(i.list, i.senderPubkeys, i.receiverPrivkey, i.symKey);

		} else if (i.type === 'decryptItems' && i.symKey && i.list) {
			// start decryption
			output = batch.decryptKeysAndList(i.list, i.symKey);
		}

		//
		// Error
		//
		else {
			output = {
				err: {
					errMsg: 'Not all arguments for web worker crypto are defined!'
				}
			};
		}

		return output;
	}

}());