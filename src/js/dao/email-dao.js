/**
 * A high-level Data-Access Api for handling Email synchronization
 * between the cloud service and the device's local storage
 */
define(['underscore', 'cryptoLib/util', 'js/crypto/crypto', 'js/dao/lawnchair-dao',
		'js/dao/devicestorage-dao', 'js/app-config', 'js/model/account-model'
], function(_, util, crypto, jsonDB, devicestorage, app) {
	'use strict';

	var EmailDAO = function(cloudstorage, keychain) {
		var self = this;

		/**
		 * Inits all dependencies
		 */
		self.init = function(account, password, callback) {
			self.account = account;

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
		self.getItem = function(folderName, itemId) {
			var folder = self.account.get('folders').where({
				name: folderName
			})[0];
			var mail = _.find(folder.get('items'), function(email) {
				return email.id + '' === itemId + '';
			});
			return mail;
		};

		/**
		 * Fetch a list of emails from the device's local storage
		 * @param offset [Number] The offset of items to fetch (0 is the last stored item)
		 * @param num [Number] The number of items to fetch (null means fetch all)
		 */
		self.listItems = function(folderName, offset, num, callback) {
			var collection, folder;

			// check if items are in memory already (account.folders model)
			folder = self.account.get('folders').where({
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
						callback(null, []);
						return;
					}

					// decrypt list
					crypto.decryptKeysAndList(encryptedList, function(err, decryptedList) {
						if (err) {
							callback(err);
							return;
						}

						// cache collection in folder memory
						if (decryptedList.length > 0) {
							folder = new app.model.Folder({
								name: folderName
							});
							folder.set('items', decryptedList);
							self.account.get('folders').add(folder);
						}

						callback(null, decryptedList);
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
		self.syncFromCloud = function(folderName, callback) {
			var folder, already, pubkeyIds = [];

			cloudstorage.listEncryptedItems('email', self.account.get('emailAddress'), folderName, function(err, encryptedList) {
				// return if an error occured
				if (err) {
					callback({
						errMsg: 'Syncing encrypted items from cloud failed!',
						err: err
					}); // error
					return;
				}
				if (encryptedList.length === 0) {
					callback();
					return;
				}

				// TODO: remove old folder items from devicestorage

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

					// verfiy signatures and re-encrypt item keys
					crypto.reencryptListKeysForUser(encryptedList, senderPubkeys, function(err, encryptedKeyList) {
						if (err) {
							callback(err);
							return;
						}

						// persist encrypted list in device storage
						devicestorage.storeEcryptedList(encryptedKeyList, 'email_' + folderName, function() {
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

				});
			});
		};

		/**
		 * Send a plaintext Email to the user's outbox in the cloud
		 */
		self.sendEmail = function(email, callback) {
			var userId = self.account.get('emailAddress');

			// validate email addresses
			var invalidRecipient;
			_.each(email.to, function(address) {
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
			if (!validateEmail(email.from)) {
				callback({
					errMsg: 'Invalid sender: ' + email.from
				});
				return;
			}

			// generate a new UUID for the new email
			email.id = util.UUID();

			// send email to cloud service
			cloudstorage.putEncryptedItem(email, 'email', userId, 'outbox', function(err) {
				callback(err);
			});
		};
	};

	//
	// helper functions
	//

	function validateEmail(email) {
		var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(email);
	}

	return EmailDAO;
});