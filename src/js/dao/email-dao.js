/**
 * A high-level Data-Access Api for handling Email synchronization
 * between the cloud service and the device's local storage
 */
app.dao.EmailDAO = function(_, crypto, devicestorage, cloudstorage, util) {
	'use strict';

	/**
	 * Inits all dependencies
	 */
	this.init = function(account, password, callback) {
		this.account = account;

		// sync user's cloud key with local storage
		var storedKey = crypto.getEncryptedPrivateKey(account.get('emailAddress'));
		cloudstorage.syncPrivateKey(account.get('emailAddress'), storedKey, function(err) {
			if (err) {
				console.log('Error syncing secret key to cloud: ' + err);
			}
			// init crypto
			initCrypto();

		}, function(fetchedKey) {
			// replace local key with cloud key
			crypto.putEncryptedPrivateKey(fetchedKey);
			// whipe local storage
			devicestorage.clear(function() {
				initCrypto();
			});
		});

		function initCrypto() {
			crypto.init({
				emailAddress: account.get('emailAddress'),
				password: password,
				keySize: account.get('symKeySize'),
				rsaKeySize: account.get('asymKeySize')
			}, function(err) {
				if (err) {
					callback(err);
					return;
				}

				publishPublicKey();
			});
		}

		function publishPublicKey() {
			// get public key from crypto
			var pubkey = crypto.getPublicKey();

			//publish public key to cloud service
			cloudstorage.putPublicKey(pubkey, function(err) {
				callback(err);
			});
		}
	};

	/**
	 * Fetch an email with the following id
	 */
	this.getItem = function(folderName, itemId) {
		var folder = this.account.get('folders').where({
			name: folderName
		})[0];
		var mail = _.find(folder.get('items').models, function(email) {
			return email.id + '' === itemId + '';
		});
		return mail;
	};

	/**
	 * Fetch a list of emails from the device's local storage
	 * @param offset [Number] The offset of items to fetch (0 is the last stored item)
	 * @param num [Number] The number of items to fetch (null means fetch all)
	 */
	this.listItems = function(folderName, offset, num, callback) {
		var collection, folder, self = this;

		// check if items are in memory already (account.folders model)
		folder = this.account.get('folders').where({
			name: folderName
		})[0];

		if (!folder) {
			// get items from storage
			devicestorage.listItems('email_' + folderName, offset, num, function(err, decryptedList) {
				if (err) {
					callback(err);
					return;
				}

				// parse to backbone model collection
				collection = new app.model.EmailCollection(decryptedList);

				// cache collection in folder memory
				if (decryptedList.length > 0) {
					folder = new app.model.Folder({
						name: folderName
					});
					folder.set('items', collection);
					self.account.get('folders').add(folder);
				}

				callback(null, collection);
			});

		} else {
			// read items from memory
			collection = folder.get('items');
			callback(null, collection);
		}
	};

	/**
	 * Checks the user virtual inbox containing end-2-end encrypted mail items
	 */
	this.checkVInbox = function(callback) {
		var self = this;

		cloudstorage.listEncryptedItems('email', this.account.get('emailAddress'), 'vinbox', function(err, data) {
			// if virtual inbox is emtpy just callback
			if (err || !data || data.status || data.length === 0) {
				callback(); // error
				return;
			}

			// asynchronously iterate over the encrypted items
			var after = _.after(data.length, function() {
				callback();
			});

			_.each(data, function(asymCt) {
				// asymmetric decrypt
				asymDecryptMail(asymCt, function(err, pt) {
					if (err) {
						callback(err);
						return;
					}

					// symmetric encrypt and push to cloud
					symEncryptAndUpload(pt, function(err) {
						if (err) {
							callback(err);
							return;
						}

						// delete asymmetricall encrypted item from virtual inbox
						deleteVinboxItem(asymCt, function(err) {
							if (err) {
								callback(err);
								return;
							}

							after(); // asynchronously iterate through objects
						});
					});
				});
			});
		});

		function asymDecryptMail(m, callback) {
			var pubKeyId = m.senderPk.split(';')[1];
			// pull the sender's public key
			cloudstorage.getPublicKey(pubKeyId, function(err, senderPk) {
				if (err) {
					callback(err);
					return;
				}

				// do authenticated decryption
				naclCrypto.asymDecrypt(m.ciphertext, m.itemIV, senderPk.publicKey, keypair.boxSk, function(plaintext) {
					callback(null, JSON.parse(plaintext));
				});
			});
		}

		function symEncryptAndUpload(email, callback) {
			var itemKey = util.random(self.account.get('symKeySize')),
				itemIV = util.random(self.account.get('symIvSize')),
				keyIV = util.random(self.account.get('symIvSize')),
				json = JSON.stringify(email),
				envelope, encryptedKey;

			// symmetrically encrypt item
			crypto.aesEncrypt(json, itemKey, itemIV, function(ct) {

				// encrypt item key for user
				encryptedKey = crypto.aesEncryptForUserSync(itemKey, keyIV);
				envelope = {
					id: email.id,
					crypto: 'aes-128-ccm',
					ciphertext: ct,
					encryptedKey: encryptedKey,
					keyIV: keyIV,
					itemIV: itemIV
				};

				// push encrypted item to cloud
				cloudstorage.putEncryptedItem(envelope, 'email', self.account.get('emailAddress'), 'inbox', function(err) {
					callback(err);
				});
			});
		}

		function deleteVinboxItem(email, callback) {
			cloudstorage.deleteEncryptedItem(email.id, 'email', self.account.get('emailAddress'), 'vinbox', function(err) {
				callback(err);
			});
		}
	};

	/**
	 * Synchronize a folder's items from the cloud to the device-storage
	 * @param folderName [String] The name of the folder e.g. 'inbox'
	 */
	this.syncFromCloud = function(folderName, callback) {
		var folder, self = this;

		cloudstorage.listEncryptedItems('email', this.account.get('emailAddress'), folderName, function(err, data) {
			// return if an error occured or if fetched list from cloud storage is empty
			if (err || !data || data.status || data.length === 0) {
				callback({
					error: err
				}); // error
				return;
			}

			// TODO: remove old folder items from devicestorage

			// persist encrypted list in device storage
			devicestorage.storeEcryptedList(data, 'email_' + folderName, function() {
				// remove cached folder in account model
				folder = self.account.get('folders').where({
					name: folderName
				})[0];
				if (folder) {
					self.account.get('folders').remove(folder);
				}
				callback();
			});
		});
	};

	/**
	 * Send a plaintext Email to the user's outbox in the cloud
	 */
	this.sendEmail = function(email, callback) {
		var userId = this.account.get('emailAddress');

		// validate email addresses
		var invalidRecipient;
		_.each(email.get('to'), function(address) {
			if (!validateEmail(address)) {
				invalidRecipient = address;
			}
		});
		if (invalidRecipient) {
			callback({
				errMsg: 'Invalid recipient: ' + invalidRecipient
			});
			return;
		}
		if (!validateEmail(email.get('from'))) {
			callback({
				errMsg: 'Invalid sender: ' + email.from
			});
			return;
		}

		// generate a new UUID for the new email
		email.set('id', util.UUID());

		// send email to cloud service
		cloudstorage.putEncryptedItem(email, 'email', userId, 'outbox', function(err) {
			callback(err);
		});

		function validateEmail(email) {
			var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
			return re.test(email);
		}
	};

};