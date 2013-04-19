/**
 * High level storage api for handling syncing of data to
 * and from the cloud.
 */
app.dao.CloudStorage = function(window, $) {
	'use strict';

	//
	// Public Key
	//

	/**
	 * Find the user's corresponding public key
	 */
	this.getPublicKey = function(emailAddress, callback) {
		var uri;

		uri = app.config.cloudUrl + '/publickey/user/' + emailAddress;
		$.ajax({
			url: uri,
			type: 'GET',
			dataType: 'json',
			success: function(list) {
				if (!list || list.length === 0) {
					callback({
						error: 'No public key for that user!'
					});
					return;
				}

				callback(null, list[0]);
			},
			error: function(xhr, textStatus, err) {
				callback({
					error: err,
					status: textStatus
				});
			}
		});
	};

	/**
	 * Persist the user's publc key
	 */
	this.putPublicKey = function(pubkey, callback) {
		var uri;

		uri = app.config.cloudUrl + '/publickey/user/' + pubkey.userId + '/key/' + pubkey._id;
		$.ajax({
			url: uri,
			type: 'PUT',
			data: JSON.stringify(pubkey),
			contentType: 'application/json',
			success: function() {
				callback();
			},
			error: function(xhr, textStatus, err) {
				callback({
					error: err,
					status: textStatus
				});
			}
		});
	};

	//
	// Encrypted Mails
	//

	/**
	 * Lists the encrypted items
	 * @param type [String] The type of item e.g. 'email'
	 * @param offset [Number] The offset of items to fetch (0 is the last stored item)
	 * @param num [Number] The number of items to fetch (null means fetch all)
	 */
	this.listEncryptedItems = function(type, emailAddress, folderName, callback) {
		var uri;

		// fetch encrypted json objects from cloud service
		uri = app.config.cloudUrl + '/' + type + '/user/' + emailAddress + '/folder/' + folderName;
		$.ajax({
			url: uri,
			type: 'GET',
			dataType: 'json',
			success: function(list) {
				callback(null, list);
			},
			error: function(xhr, textStatus, err) {
				callback({
					error: err,
					status: textStatus
				});
			}
		});
	};

	//
	// Secret Key
	//

	/**
	 * Persist encrypted user key to cloud service
	 */
	this.putUserSecretKey = function(emailAddress, callback) {
		// fetch user's encrypted secret key from keychain/storage
		var keyStore = new app.dao.LocalStorageDAO(window),
			storageId = emailAddress + '_encryptedSymmetricKey',
			storedKey = keyStore.read(storageId),
			uri;

		if (!storedKey) {
			callback({
				error: 'err',
				status: 'No key found in storage!'
			});
			return;
		}

		uri = app.config.cloudUrl + '/secretkey/user/' + emailAddress + '/key/' + storedKey._id;
		$.ajax({
			url: uri,
			type: 'PUT',
			data: JSON.stringify(storedKey),
			contentType: 'application/json',
			success: function() {
				callback();
			},
			error: function(xhr, textStatus, err) {
				callback({
					error: err,
					status: textStatus
				});
			}
		});
	};

	/**
	 * Get encrypted user key from cloud service
	 */
	this.getUserSecretKey = function(emailAddress, callback, replaceCallback) {
		// fetch user's encrypted secret key from keychain/storage
		var self = this,
			keyStore = new app.dao.LocalStorageDAO(window),
			storageId = emailAddress + '_encryptedSymmetricKey',
			storedKey = keyStore.read(storageId),
			uri;

		uri = app.config.cloudUrl + '/secretkey/user/' + emailAddress;
		$.ajax({
			url: uri,
			type: 'GET',
			dataType: 'json',
			success: function(keys) {
				if (!keys || keys.length === 0) {
					callback({
						error: 'err',
						status: 'Key not synced!'
					});
					return;
				}

				handleKey(keys[0], callback);
			},
			error: function(xhr, textStatus, err) {
				callback({
					error: err,
					status: textStatus
				});
			}
		});

		function handleKey(fetchedKey, callback) {
			if ((!storedKey || !storedKey.encryptedKey) && fetchedKey && fetchedKey.encryptedKey && fetchedKey.keyIV) {
				// no local key... persist fetched key
				keyStore.persist(storageId, fetchedKey);
				replaceCallback();

			} else if (storedKey && fetchedKey && (storedKey.encryptedKey !== fetchedKey.encryptedKey || storedKey.keyIV !== fetchedKey.keyIV)) {
				// local and fetched keys are not equal
				if (window.confirm('Swap local key?')) {
					// replace local key with fetched key
					keyStore.persist(storageId, fetchedKey);
					replaceCallback();
				} else {
					if (window.confirm('Swap cloud key?')) {
						// upload local key to cloud
						self.putUserSecretKey(emailAddress, callback);
					} else {
						callback({
							error: 'err',
							status: 'Key not synced!'
						});
					}
				}

			} else {
				// local and cloud keys are equal or cloud key is null
				callback();
			}
		}
	};

};