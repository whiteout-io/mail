/**
 * High level crypto api that invokes native crypto (if available) and
 * gracefully degrades to JS crypto (if unavailable)
 */
define(['cryptoLib/util', 'cryptoLib/aes-cbc', 'cryptoLib/rsa', 'cryptoLib/crypto-batch'], function(util, aes, rsa, cryptoBatch) {
	'use strict';

	var self = {};

	/**
	 * Initializes the crypto modules by fetching the user's
	 * encrypted secret key from storage and storing it in memory.
	 */
	self.init = function(args, callback) {
		// valdiate input
		if (!args.emailAddress || !args.keySize || !args.rsaKeySize) {
			callback({
				errMsg: 'Crypto init failed. Not all args set!'
			});
			return;
		}

		self.emailAddress = args.emailAddress;
		self.keySize = args.keySize;
		self.ivSize = args.keySize;
		self.rsaKeySize = args.rsaKeySize;

		// derive PBKDF2 from password in web worker thread
		self.deriveKey(args.password, self.keySize, function(err, pbkdf2) {
			if (err) {
				callback(err);
				return;
			}

			// check if key exists
			if (!args.storedKeypair) {
				// generate keys, encrypt and persist if none exists
				generateKeypair(pbkdf2);
			} else {
				// decrypt key
				decryptKeypair(args.storedKeypair, pbkdf2);
			}

		});

		function generateKeypair(pbkdf2) {
			// generate RSA keypair in web worker
			rsa.generateKeypair(self.rsaKeySize, function(err, generatedKeypair) {
				if (err) {
					callback(err);
					return;
				}

				// encrypt keypair
				var iv = util.random(self.ivSize);
				var encryptedPrivateKey = aes.encrypt(generatedKeypair.privkeyPem, pbkdf2, iv);

				// new encrypted keypair object
				var newKeypair = {
					publicKey: {
						_id: generatedKeypair._id,
						userId: self.emailAddress,
						publicKey: generatedKeypair.pubkeyPem
					},
					privateKey: {
						_id: generatedKeypair._id,
						userId: self.emailAddress,
						encryptedKey: encryptedPrivateKey,
						iv: iv
					}
				};

				// return generated keypair for storage in keychain dao
				callback(null, newKeypair);
			});
		}

		function decryptKeypair(storedKeypair, pbkdf2) {
			var decryptedPrivateKey;

			// validate input
			if (!storedKeypair || !storedKeypair.privateKey || !storedKeypair.privateKey.encryptedKey || !storedKeypair.privateKey.iv) {
				callback({
					errMsg: 'Incomplete arguments for private key decryption!'
				});
				return;
			}

			// try to decrypt with pbkdf2
			try {
				var prK = storedKeypair.privateKey;
				decryptedPrivateKey = aes.decrypt(prK.encryptedKey, pbkdf2, prK.iv);
			} catch (ex) {
				callback({
					errMsg: 'Wrong password!'
				});
				return;
			}
			// set rsa keys
			rsa.init(storedKeypair.publicKey.publicKey, decryptedPrivateKey, storedKeypair.publicKey._id);

			callback();
		}
	};

	/**
	 * Do PBKDF2 key derivation in a WebWorker thread
	 */
	self.deriveKey = function(password, keySize, callback) {
		startWorker('/crypto/pbkdf2-worker.js', {
			password: password,
			keySize: keySize
		}, callback, function() {
			var pbkdf2 = new app.crypto.PBKDF2();
			return pbkdf2.getKey(password, keySize);
		});
	};

	//
	// En/Decrypts single item
	//

	self.aesEncrypt = function(plaintext, key, iv, callback) {
		startWorker('/crypto/aes-worker.js', {
			type: 'encrypt',
			plaintext: plaintext,
			key: key,
			iv: iv
		}, callback, function() {
			return self.aesEncryptSync(plaintext, key, iv);
		});
	};

	self.aesDecrypt = function(ciphertext, key, iv, callback) {
		startWorker('/crypto/aes-worker.js', {
			type: 'decrypt',
			ciphertext: ciphertext,
			key: key,
			iv: iv
		}, callback, function() {
			return self.aesDecryptSync(ciphertext, key, iv);
		});
	};

	self.aesEncryptSync = function(plaintext, key, iv) {
		return aes.encrypt(plaintext, key, iv);
	};

	self.aesDecryptSync = function(ciphertext, key, iv) {
		return aes.decrypt(ciphertext, key, iv);
	};

	//
	// En/Decrypt a list of items with AES in a WebWorker thread
	//

	self.aesEncryptList = function(list, callback) {
		startWorker('/crypto/aes-batch-worker.js', {
			type: 'encrypt',
			list: list
		}, callback, function() {
			return cryptoBatch.encryptList(list);
		});
	};

	self.aesDecryptList = function(list, callback) {
		startWorker('/crypto/aes-batch-worker.js', {
			type: 'decrypt',
			list: list
		}, callback, function() {
			return cryptoBatch.decryptList(list);
		});
	};

	//
	// En/Decrypt something speficially using the user's secret key
	//

	self.encryptListForUser = function(list, receiverPubkeys, callback) {
		var envelope, envelopes = [];

		if (!receiverPubkeys || receiverPubkeys.length !== 1) {
			callback({
				errMsg: 'Encryption is currently implemented for only one receiver!'
			});
			return;
		}

		var keypair = rsa.exportKeys();
		var senderPrivkey = {
			_id: keypair._id,
			privateKey: keypair.privkeyPem
		};

		// package objects into batchable envelope format
		list.forEach(function(i) {
			envelope = {
				id: i.id,
				plaintext: i,
				key: util.random(self.keySize),
				iv: util.random(self.ivSize),
				receiverPk: receiverPubkeys[0]._id
			};
			envelopes.push(envelope);
		});

		startWorker('/crypto/crypto-batch-worker.js', {
			type: 'encrypt',
			list: envelopes,
			senderPrivkey: senderPrivkey,
			receiverPubkeys: receiverPubkeys
		}, callback, function() {
			return cryptoBatch.encryptListForUser(envelopes, receiverPubkeys, senderPrivkey);
		});
	};

	self.decryptListForUser = function(list, senderPubkeys, callback) {
		if (!senderPubkeys || senderPubkeys < 1) {
			callback({
				errMsg: 'Sender public keys must be set!'
			});
			return;
		}

		var keypair = rsa.exportKeys();
		var receiverPrivkey = {
			_id: keypair._id,
			privateKey: keypair.privkeyPem
		};

		startWorker('/crypto/crypto-batch-worker.js', {
			type: 'decrypt',
			list: list,
			receiverPrivkey: receiverPrivkey,
			senderPubkeys: senderPubkeys
		}, callback, function() {
			return cryptoBatch.decryptListForUser(list, senderPubkeys, receiverPrivkey);
		});
	};

	function startWorker(script, args, callback, noWorker) {
		// check for WebWorker support
		if (window.Worker) {

			// init webworker thread
			var worker = new Worker(app.config.workerPath + script);

			worker.onmessage = function(e) {
				// return derived key from the worker
				callback(null, e.data);
			};

			// send data to the worker
			worker.postMessage(args);

		} else {
			// no WebWorker support... do synchronous call
			var result = noWorker();
			callback(null, result);
		}
	}

	return self;
});