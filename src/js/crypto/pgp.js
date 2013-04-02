/**
 * A wrapper for asymmetric OpenPGP encryption logic
 */
app.crypto.PGP = function(window, openpgp, util, server) {
	'use strict';

	var self = this,
		privateKey, // user's private key
		publicKey, // user's public key
		passphrase; // user's passphrase used for decryption

	openpgp.init(); // initialize OpenPGP.js

	//
	// Key management
	//

	/**
	 * Check if user already has a public key on the server and if not,
	 * generate a new keypait for the user
	 */
	self.initKeyPair = function(loginInfo, callback, displayCallback, finishCallback) {
		// check if user already has a keypair in local storage
		if (loginInfo.publicKeyId) {
			// decode base 64 key ID
			var keyId = window.atob(loginInfo.publicKeyId);
			// read the user's keys from local storage
			callback(keyId);

		} else {
			// user has no key pair yet
			displayCallback(function() {
				// generate new key pair with 2048 bit RSA keys
				var keys = self.generateKeys(2048);
				var keyId = keys.privateKey.getKeyId();

				// display finish
				finishCallback(keyId);
				// read the user's keys from local storage
				callback(keyId);
			});
		}
	};

	/**
	 * Generate a key pair for the user
	 * @param numBits [int] number of bits for the key creation. (should be 1024+, generally)
	 * @email [string] user's email address
	 * @pass [string] a passphrase used to protect the private key
	 */
	self.generateKeys = function(numBits) {
		// check passphrase
		if (!passphrase && passphrase !== '') {
			throw 'No passphrase set!';
		}

		var userId = 'SafeWith.me User <anonymous@dunno.com>';
		var keys = openpgp.generate_key_pair(1, numBits, userId, passphrase); // keytype 1=RSA

		self.importKeys(keys.publicKeyArmored, keys.privateKeyArmored);

		return keys;
	};

	/**
	 * Import the users key into the HTML5 local storage
	 */
	self.importKeys = function(publicKeyArmored, privateKeyArmored) {
		// check passphrase
		if (!passphrase && passphrase !== '') {
			throw 'No passphrase set!';
		}

		// store keys in html5 local storage
		openpgp.keyring.importPrivateKey(privateKeyArmored, passphrase);
		openpgp.keyring.importPublicKey(publicKeyArmored);
		openpgp.keyring.store();
	};

	/**
	 * Export the keys by using the HTML5 FileWriter
	 */
	self.exportKeys = function(callback) {
		// build blob
		var buf = util.binStr2ArrBuf(publicKey.armored + privateKey.armored);
		var blob = util.arrBuf2Blob(buf, 'text/plain');
		// create url
		util.createUrl(undefined, blob, callback);
	};

	/**
	 * Read the users keys from the browser's HTML5 local storage
	 * @email [string] user's email address
	 * @keyId [string] the public key ID in unicode (not base 64)
	 */
	self.readKeys = function(keyId, callback, errorCallback) {
		// read keys from keyring (local storage)
		var privKeyQuery = openpgp.keyring.getPrivateKeyForKeyId(keyId)[0];
		if (privKeyQuery) {
			privateKey = privKeyQuery.key;
		}
		publicKey = openpgp.keyring.getPublicKeysForKeyId(keyId)[0];

		// check keys
		if (!publicKey || !privateKey || (publicKey.keyId !== privateKey.keyId)) {
			// no amtching keys found in the key store
			return false;
		}

		// read passphrase from local storage if no passphrase is specified
		if (!passphrase && passphrase !== '') {
			passphrase = window.sessionStorage.getItem(window.btoa(keyId) + 'Passphrase');
		}

		// check passphrase
		if (!passphrase && passphrase !== '') {
			return false;
		}
		// do test encrypt/decrypt to verify passphrase
		try {
			var testCt = self.asymmetricEncrypt('test');
			self.asymmetricDecrypt(testCt);
		} catch (e) {
			return false;
		}

		return true;
	};

	/**
	 * Generate a new key pair for the user and persist the public key on the server
	 */
	self.syncKeysToServer = function(email, callback) {
		// base64 encode key ID
		var keyId = publicKey.keyId;
		var encodedKeyId = window.btoa(keyId);
		var pubKey = {
			keyId: encodedKeyId,
			ownerEmail: email,
			asciiArmored: publicKey.armored
		};
		var privKey = {
			keyId: encodedKeyId,
			ownerEmail: email,
			asciiArmored: privateKey.armored
		};

		var jsonPublicKey = JSON.stringify(pubKey);
		var jsonPrivateKey = JSON.stringify(privKey);

		// first upload public key
		server.xhr({
			type: 'POST',
			uri: '/ws/publicKeys',
			contentType: 'application/json',
			expected: 201,
			body: jsonPublicKey,
			success: function(resp) {
				uploadPrivateKeys();
			},
			error: function(e) {
				// if server is not available, just continue
				// and read the user's keys from local storage
				console.log('Server unavailable: keys were not synced to server!');
				callback(keyId);
			}
		});

		// then upload private key

		function uploadPrivateKeys() {
			server.xhr({
				type: 'POST',
				uri: '/ws/privateKeys',
				contentType: 'application/json',
				expected: 201,
				body: jsonPrivateKey,
				success: function(resp) {
					// read the user's keys from local storage
					callback(keyId);
				}
			});
		}
	};

	/**
	 * Get the keypair from the server and import them into localstorage
	 */
	self.fetchKeys = function(email, keyId, callback, errCallback) {
		var base64Key = window.btoa(keyId);
		var encodedKeyId = encodeURIComponent(base64Key);

		// get public key
		server.xhr({
			type: 'GET',
			uri: '/ws/publicKeys?keyId=' + encodedKeyId,
			expected: 200,
			success: function(pubKey) {
				getPrivateKey(pubKey);
			},
			error: function(e) {
				// if server is not available, just continue
				console.log('Server unavailable: keys could not be fetched from server!');
				errCallback(e);
			}
		});

		// get private key

		function getPrivateKey(pubKey) {
			server.xhr({
				type: 'GET',
				uri: '/ws/privateKeys?keyId=' + encodedKeyId,
				expected: 200,
				success: function(privKey) {
					// import keys
					self.importKeys(pubKey.asciiArmored, privKey.asciiArmored, email);
					callback({
						privateKey: privKey,
						publicKey: pubKey
					});
				}
			});
		}
	};

	/**
	 * Get the current user's private key
	 */
	self.getPrivateKey = function() {
		if (!privateKey) {
			return undefined;
		}
		return privateKey.armored;
	};

	/**
	 * Get the current user's public key
	 */
	self.getPublicKey = function() {
		if (!publicKey) {
			return undefined;
		}
		return publicKey.armored;
	};

	/**
	 * Get the current user's base64 encoded public key ID
	 */
	self.getPublicKeyIdBase64 = function() {
		return window.btoa(publicKey.keyId);
	};

	/**
	 * Get the user's passphrase for decrypting their private key
	 */
	self.setPassphrase = function(pass) {
		passphrase = pass;
	};

	/**
	 * Store the passphrase for the current session
	 */
	self.rememberPassphrase = function(keyId) {
		var base64KeyId = window.btoa(keyId);
		window.sessionStorage.setItem(base64KeyId + 'Passphrase', passphrase);
	};

	//
	// Asymmetric crypto
	//

	/**
	 * Encrypt a string
	 * @param customPubKey [PublicKey] (optional) another user's public key for sharing
	 */
	self.asymmetricEncrypt = function(plaintext, customPubKey) {
		var pub_key = null;
		if (customPubKey) {
			// use a custom set public for e.g. or sharing
			pub_key = openpgp.read_publicKey(customPubKey);
		} else {
			// use the user's local public key
			pub_key = openpgp.read_publicKey(publicKey.armored);
		}

		var ciphertext = openpgp.write_encrypted_message(pub_key, window.btoa(plaintext));
		return ciphertext;
	};

	/**
	 * Decrypt a string
	 */
	self.asymmetricDecrypt = function(ciphertext) {
		var priv_key = openpgp.read_privateKey(privateKey.armored);

		var msg = openpgp.read_message(ciphertext);
		var keymat = null;
		var sesskey = null;

		// Find the private (sub)key for the session key of the message
		for (var i = 0; i < msg[0].sessionKeys.length; i++) {
			if (priv_key[0].privateKeyPacket.publicKey.getKeyId() == msg[0].sessionKeys[i].keyId.bytes) {
				keymat = {
					key: priv_key[0],
					keymaterial: priv_key[0].privateKeyPacket
				};
				sesskey = msg[0].sessionKeys[i];
				break;
			}
			for (var j = 0; j < priv_key[0].subKeys.length; j++) {
				if (priv_key[0].subKeys[j].publicKey.getKeyId() == msg[0].sessionKeys[i].keyId.bytes) {
					keymat = {
						key: priv_key[0],
						keymaterial: priv_key[0].subKeys[j]
					};
					sesskey = msg[0].sessionKeys[i];
					break;
				}
			}
		}
		if (keymat !== null) {
			if (!keymat.keymaterial.decryptSecretMPIs(passphrase)) {
				throw "Passphrase for secrect key was incorrect!";
			}

			var decrypted = msg[0].decrypt(keymat, sesskey);
			return window.atob(decrypted);

		} else {
			throw "No private key found!";
		}
	};

};

/**
 * This function needs to be implemented, since it is used by the openpgp utils
 */

function showMessages(str) {}