/**
 * A high-level Data-Access Api for handling Email synchronization
 * between the cloud service and the device's local storage
 */
app.dao.EmailDAO = function(jsonDB, crypto, devicestorage, cloudstorage, util, keychain) {
	'use strict';

	/**
	 * Inits all dependencies
	 */
	this.init = function(account, password, callback) {
		this.account = account;

		// validate email address
		var emailAddress = account.get('emailAddress');
		if (!validateEmail(emailAddress)) {
			callback({
				errMsg: 'The user email address must be specified!'
			});
			return;
		}

		// init user's local database
		jsonDB.init(emailAddress);

		// call getUserKeyPair to read/sync keypair with devicestorage/cloud
		keychain.getUserKeyPair(emailAddress, function(err, storedKeypair) {
			if (err) {
				callback(err);
				return;
			}
			// init crypto
			initCrypto(storedKeypair);
		});

		function initCrypto(storedKeypair) {
			crypto.init({
				emailAddress: emailAddress,
				password: password,
				keySize: account.get('symKeySize'),
				rsaKeySize: account.get('asymKeySize'),
				storedKeypair: storedKeypair
			}, function(err, generatedKeypair) {
				if (err) {
					callback(err);
					return;
				}

				if (generatedKeypair) {
					// persist newly generated keypair
					keychain.putUserKeyPair(generatedKeypair, callback);
				} else {
					callback();
				}
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
		var collection, folder, already, pubkeyIds = [],
			self = this;

		// check if items are in memory already (account.folders model)
		folder = this.account.get('folders').where({
			name: folderName
		})[0];

		if (!folder) {
			// get encrypted items from storage
			devicestorage.listEncryptedItems('email_' + folderName, offset, num, function(err, encryptedList) {
				if (err) {
					callback(err);
					return;
				}
				if (encryptedList.length === 0) {
					callback(null, new app.model.EmailCollection());
					return;
				}

				// gather public key ids required to verify signatures
				encryptedList.forEach(function(i) {
					already = null;
					already = _.findWhere(pubkeyIds, {
						_id: i.senderPk
					});
					if (!already) {
						pubkeyIds.push({
							_id: i.senderPk
						});
					}
				});

				// fetch public keys from keychain
				keychain.getPublicKeys(pubkeyIds, function(err, senderPubkeys) {
					if (err) {
						callback(err);
						return;
					}

					// decrypt list
					crypto.decryptListForUser(encryptedList, senderPubkeys, function(err, decryptedList) {
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

				});
			});

		} else {
			// read items from memory
			collection = folder.get('items');
			callback(null, collection);
		}
	};

	/**
	 * Synchronize a folder's items from the cloud to the device-storage
	 * @param folderName [String] The name of the folder e.g. 'inbox'
	 */
	this.syncFromCloud = function(folderName, callback) {
		var folder, self = this;

		cloudstorage.listEncryptedItems('email', this.account.get('emailAddress'), folderName, function(err, data) {
			// return if an error occured
			if (err) {
				callback({
					errMsg: 'Syncing encrypted items from cloud failed!',
					err: err
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
	};

	function validateEmail(email) {
		var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(email);
	}

};