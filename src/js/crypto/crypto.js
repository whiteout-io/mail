/**
 * High level crypto api that invokes native crypto (if available) and
 * gracefully degrades to JS crypto (if unavailable)
 */
app.crypto.Crypto = function(window, util) {
	'use strict';

	var aes = new app.crypto.AesCBC(forge); // use AES-CBC mode by default
	var rsa = new app.crypto.RSA(forge, util); // use RSA for asym. crypto
	var keyStore = new app.dao.LocalStorageDAO(window);

	var storageId; // storage id for the encrypted keypair in local storage

	/**
	 * Initializes the crypto modules by fetching the user's
	 * encrypted secret key from storage and storing it in memory.
	 */
	this.init = function(args, callback) {
		var self = this;

		// valdiate input
		if (!args.emailAddress || !args.keySize || !args.rsaKeySize) {
			callback({
				errMsg: 'Crypto init failed. Not all args set!'
			});
			return;
		}

		this.emailAddress = args.emailAddress;
		this.keySize = args.keySize;
		this.ivSize = args.keySize;
		this.rsaKeySize = args.rsaKeySize;

		storageId = self.emailAddress + '_encryptedKeypair';

		// derive PBKDF2 from password in web worker thread
		this.deriveKey(args.password, self.keySize, function(pbkdf2) {

			// fetch user's encrypted secret key from keychain/storage
			var storedKeypair = keyStore.read(storageId);

			// check if key exists
			if (!storedKeypair) {
				// generate keys, encrypt and persist if none exists
				generateKeypair(pbkdf2);
			} else {
				// decrypt key
				decryptKeypair(storedKeypair, pbkdf2);
			}

		});

		function generateKeypair(pbkdf2) {
			// generate RSA keypair in web worker
			rsa.generateKeypair(self.rsaKeySize, function(err) {
				if (err) {
					callback(err);
					return;
				}

				var keypair = rsa.exportKeys();

				// encrypt keypair
				var iv = util.random(self.ivSize);
				var encryptedKeys = aes.encrypt(JSON.stringify(keypair), pbkdf2, iv);

				// store encrypted keypair
				var newStoredKeypair = {
					_id: keypair._id,
					userId: self.emailAddress,
					encryptedKey: encryptedKeys,
					iv: iv
				};
				keyStore.persist(storageId, newStoredKeypair);

				callback();
			});
		}

		function decryptKeypair(storedKeypair, pbkdf2) {
			var keypairJson, keypair;
			// try to decrypt with pbkdf2
			try {
				keypairJson = aes.decrypt(storedKeypair.encryptedKey, pbkdf2, storedKeypair.iv);
				keypair = JSON.parse(keypairJson);
			} catch (ex) {
				callback({
					errMsg: 'Wrong password!'
				});
				return;
			}
			// set rsa keys
			rsa.init(keypair.pubkeyPem, keypair.privkeyPem, keypair._id);

			callback();
		}
	};

	/**
	 * Return a Public Key object containing the Public Key PEM
	 */
	this.getPublicKey = function() {
		var keypair = rsa.exportKeys();

		return {
			_id: keypair._id,
			userId: this.emailAddress,
			publicKey: keypair.pubkeyPem
		};
	};

	/**
	 * Return a Private Key object containing the encrypted private key
	 */
	this.getEncryptedPrivateKey = function(emailAddress) {
		if (!emailAddress && !storageId) {
			throw new Error('Emailaddress needs to be set or crypto needs to be initiated!');
		}

		var strgId = (storageId) ? storageId : emailAddress + '_encryptedKeypair';
		var storedKeypair = keyStore.read(strgId);

		return storedKeypair;
	};

	this.putEncryptedPrivateKey = function(privkey) {
		var strgId = (storageId) ? storageId : privkey.userId + '_encryptedKeypair';

		// validate private key object
		if (!strgId || !privkey || !privkey._id || !privkey.userId || !privkey.encryptedKey || !privkey.iv) {
			throw new Error('Invalid encrypted private key object... will not store!');
		}

		return keyStore.persist(strgId, privkey);
	};

	/**
	 * Do PBKDF2 key derivation in a WebWorker thread
	 */
	this.deriveKey = function(password, keySize, callback) {
		// check for WebWorker support
		if (window.Worker) {

			// init webworker thread
			var worker = new Worker(app.config.workerPath + '/crypto/pbkdf2-worker.js');

			worker.onmessage = function(e) {
				// return derived key from the worker
				callback(e.data);
			};

			// send plaintext data to the worker
			worker.postMessage({
				password: password,
				keySize: keySize
			});

		} else {
			// no WebWorker support... do synchronous call
			var pbkdf2 = new app.crypto.PBKDF2();
			var key = pbkdf2.getKey(password, keySize);
			callback(key);
		}
	};

	//
	// En/Decrypts single item
	//

	this.aesEncrypt = function(plaintext, key, iv, callback) {
		if (window.Worker) {

			var worker = new Worker(app.config.workerPath + '/crypto/aes-worker.js');
			worker.onmessage = function(e) {
				callback(e.data);
			};
			worker.postMessage({
				type: 'encrypt',
				plaintext: plaintext,
				key: key,
				iv: iv
			});

		} else {
			var ct = this.aesEncryptSync(plaintext, key, iv);
			callback(ct);
		}
	};

	this.aesDecrypt = function(ciphertext, key, iv, callback) {
		if (window.Worker) {

			var worker = new Worker(app.config.workerPath + '/crypto/aes-worker.js');
			worker.onmessage = function(e) {
				callback(e.data);
			};
			worker.postMessage({
				type: 'decrypt',
				ciphertext: ciphertext,
				key: key,
				iv: iv
			});

		} else {
			var pt = this.aesDecryptSync(ciphertext, key, iv);
			callback(pt);
		}
	};

	this.aesEncryptSync = function(plaintext, key, iv) {
		return aes.encrypt(plaintext, key, iv);
	};

	this.aesDecryptSync = function(ciphertext, key, iv) {
		return aes.decrypt(ciphertext, key, iv);
	};

	//
	// En/Decrypt a list of items with AES in a WebWorker thread
	//

	this.aesEncryptList = function(list, callback) {
		if (window.Worker) {

			var worker = new Worker(app.config.workerPath + '/crypto/aes-batch-worker.js');
			worker.onmessage = function(e) {
				callback(e.data);
			};
			worker.postMessage({
				type: 'encrypt',
				list: list
			});

		} else {
			var batch = new app.crypto.CryptoBatch(aes);
			var encryptedList = batch.encryptList(list);
			callback(encryptedList);
		}
	};

	this.aesDecryptList = function(list, callback) {
		if (window.Worker) {

			var worker = new Worker(app.config.workerPath + '/crypto/aes-batch-worker.js');
			worker.onmessage = function(e) {
				callback(e.data);
			};
			worker.postMessage({
				type: 'decrypt',
				list: list
			});

		} else {
			var batch = new app.crypto.CryptoBatch(aes);
			var decryptedList = batch.decryptList(list);
			callback(decryptedList);
		}
	};

	//
	// En/Decrypt something speficially using the user's secret key
	//

	this.encryptListForUser = function(list, recipientPubkey, callback) {
		var envelope, envelopes = [],
			self = this;

		// package objects into batchable envelope format
		list.forEach(function(i) {
			envelope = {
				id: i.id,
				plaintext: i,
				key: util.random(self.keySize),
				iv: util.random(self.ivSize)
			};
			envelopes.push(envelope);
		});

		if (window.Worker) {

			var keypair = rsa.exportKeys();

			var worker = new Worker(app.config.workerPath + '/crypto/crypto-batch-worker.js');
			worker.onmessage = function(e) {
				callback(null, e.data);
			};
			worker.postMessage({
				type: 'encrypt',
				list: envelopes,
				pubkeyPem: keypair.pubkeyPem,
				privkeyPem: keypair.privkeyPem
			});

		} else {
			var batch = new app.crypto.CryptoBatch(aes, rsa, util);
			var encryptedList = batch.encryptListForUser(envelopes);
			callback(null, encryptedList);
		}
	};

	this.decryptListForUser = function(list, recipientPubkey, callback) {
		if (window.Worker) {

			var keypair = rsa.exportKeys();

			var worker = new Worker(app.config.workerPath + '/crypto/crypto-batch-worker.js');
			worker.onmessage = function(e) {
				callback(null, e.data);
			};
			worker.postMessage({
				type: 'decrypt',
				list: list,
				pubkeyPem: keypair.pubkeyPem,
				privkeyPem: keypair.privkeyPem
			});

		} else {
			var batch = new app.crypto.CryptoBatch(aes, rsa, util);
			var decryptedList = batch.decryptListForUser(list);
			callback(null, decryptedList);
		}
	};

};