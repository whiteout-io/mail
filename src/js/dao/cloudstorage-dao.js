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
	this.getPublicKey = function(keyId, callback) {
		var uri;

		uri = app.config.cloudUrl + '/publickey/key/' + keyId;
		$.ajax({
			url: uri,
			type: 'GET',
			dataType: 'json',
			success: function(key) {
				if (!key || !key._id) {
					callback({
						error: 'No public key for that user!'
					});
					return;
				}

				callback(null, key);
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
	// Encrypted Mail storage
	//

	/**
	 * Pushes an encrypted item to the user's cloud storage
	 * @param type [String] The type of item e.g. 'email'
	 */
	this.putEncryptedItem = function(item, type, emailAddress, folderName, callback) {
		var uri;

		uri = app.config.cloudUrl + '/' + type + '/user/' + emailAddress + '/folder/' + folderName + '/' + item.id;
		$.ajax({
			url: uri,
			type: 'PUT',
			data: JSON.stringify(item),
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
	 * Delete an encrypted item from the cloud
	 * @param type [String] The type of item e.g. 'email'
	 */
	this.deleteEncryptedItem = function(id, type, emailAddress, folderName, callback) {
		var uri;

		uri = app.config.cloudUrl + '/' + type + '/user/' + emailAddress + '/folder/' + folderName + '/' + id;
		$.ajax({
			url: uri,
			type: 'DELETE',
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
	// Ecrypted Private Key
	//

	/**
	 * Persist encrypted private key to cloud service
	 */
	this.putPrivateKey = function(privkey, callback) {
		// fetch user's encrypted secret key from keychain/storage
		var uri;

		uri = app.config.cloudUrl + '/privatekey/user/' + privkey.userId + '/key/' + privkey._id;
		$.ajax({
			url: uri,
			type: 'PUT',
			data: JSON.stringify(privkey),
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
	 * Sync encrypted private key from cloud service
	 */
	this.syncPrivateKey = function(emailAddress, storedkey, callback, replaceCallback) {
		// fetch user's encrypted secret key from keychain/storage
		var self = this,
			gottenKey, uri;

		uri = app.config.cloudUrl + '/privatekey/user/' + emailAddress;
		$.ajax({
			url: uri,
			type: 'GET',
			dataType: 'json',
			success: function(keys) {
				if (!keys) {
					callback({
						error: 'err',
						status: 'Key not synced!'
					});
					return;
				}

				// use first key, if it exists
				if (keys.length > 0) {
					gottenKey = keys[0];
				}

				handleKey(gottenKey, callback);
			},
			error: function(xhr, textStatus, err) {
				callback({
					error: err,
					status: textStatus
				});
			}
		});

		function handleKey(fetchedKey, callback) {
			if ((!storedkey || !storedkey.encryptedKey) && fetchedKey && fetchedKey.encryptedKey) {
				// no local key... persist fetched key
				replaceCallback(fetchedKey);

			} else if (!fetchedKey && storedkey && storedkey.encryptedKey) {
				// no key in cloud... push local key to cloud
				self.putPrivateKey(storedkey, callback);

			} else if (storedkey && fetchedKey && (storedkey.encryptedKey !== fetchedKey.encryptedKey || storedkey.iv !== fetchedKey.iv)) {
				// local and fetched keys are not equal
				if (window.confirm('Swap local key?')) {
					// replace local key with fetched key
					replaceCallback(fetchedKey);
				} else {
					if (window.confirm('Swap cloud key?')) {
						// upload local key to cloud
						self.putPrivateKey(emailAddress, callback);
					} else {
						callback({
							error: 'err',
							status: 'Key not synced!'
						});
					}
				}

			} else {
				// local and cloud keys are equal
				callback();
			}
		}
	};

};