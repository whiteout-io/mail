/**
 * High level storage api for handling syncing of data to
 * and from the cloud.
 */
app.dao.CloudStorage = function(window, $) {
	'use strict';

	//
	// Generic Ajax helper functions
	//

	/**
	 * GET (read) request
	 */
	this.get = function(uri, callback) {
		$.ajax({
			url: uri,
			type: 'GET',
			dataType: 'json',
			success: function(res) {
				callback(null, res);
			},
			error: function(xhr, textStatus, err) {
				callback({
					errMsg: xhr.status + ': ' + xhr.statusText
				});
			}
		});
	};

	/**
	 * PUT (update) request
	 */
	this.put = function(item, uri, callback) {
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
					errMsg: xhr.status + ': ' + xhr.statusText
				});
			}
		});
	};

	/**
	 * DELETE (remove) request
	 */
	this.remove = function(uri, callback) {
		$.ajax({
			url: uri,
			type: 'DELETE',
			success: function() {
				callback();
			},
			error: function(xhr, textStatus, err) {
				callback({
					errMsg: xhr.status + ': ' + xhr.statusText
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
		var uri = app.config.cloudUrl + '/' + type + '/user/' + emailAddress + '/folder/' + folderName + '/' + item.id;
		this.put(item, uri, callback);
	};

	/**
	 * Delete an encrypted item from the cloud
	 * @param type [String] The type of item e.g. 'email'
	 */
	this.deleteEncryptedItem = function(id, type, emailAddress, folderName, callback) {
		var uri = app.config.cloudUrl + '/' + type + '/user/' + emailAddress + '/folder/' + folderName + '/' + id;
		this.remove(uri, callback);
	};

	/**
	 * Lists the encrypted items
	 * @param type [String] The type of item e.g. 'email'
	 * @param offset [Number] The offset of items to fetch (0 is the last stored item)
	 * @param num [Number] The number of items to fetch (null means fetch all)
	 */
	this.listEncryptedItems = function(type, emailAddress, folderName, callback) {
		var uri = app.config.cloudUrl + '/' + type + '/user/' + emailAddress + '/folder/' + folderName;
		this.get(uri, callback);
	};

	//
	// Public Key
	//

	/**
	 * Find the user's corresponding public key
	 */
	this.getPublicKey = function(keyId, callback) {
		var uri = app.config.cloudUrl + '/publickey/key/' + keyId;

		this.get(uri, function(err, key) {
			if (err) {
				callback(err);
				return;
			}

			if (!key || !key._id) {
				callback({
					errMsg: 'No public key for that user!'
				});
				return;
			}

			callback(null, key);
		});
	};

	/**
	 * Persist the user's publc key
	 */
	this.putPublicKey = function(pubkey, callback) {
		var uri = app.config.cloudUrl + '/publickey/user/' + pubkey.userId + '/key/' + pubkey._id;
		this.put(pubkey, uri, callback);
	};

	/**
	 * Delete the public key from the cloud storage service
	 */
	this.removePublicKey = function(keyId, callback) {
		var uri = app.config.cloudUrl + '/publickey/key/' + keyId;
		this.remove(uri, callback);
	};

	//
	// Ecrypted Private Key
	//

	/**
	 * Fetch private key by id
	 */
	this.getPrivateKey = function(keyId, callback) {
		var uri = app.config.cloudUrl + '/privatekey/key/' + keyId;
		this.get(uri, function(err, key) {
			if (err) {
				callback(err);
				return;
			}

			if (!key || !key._id) {
				callback({
					errMsg: 'No private key for that user!'
				});
				return;
			}

			callback(null, key);
		});
	};

	/**
	 * Persist encrypted private key to cloud service
	 */
	this.putPrivateKey = function(privkey, callback) {
		var uri = app.config.cloudUrl + '/privatekey/user/' + privkey.userId + '/key/' + privkey._id;
		this.put(privkey, uri, callback);
	};

	/**
	 * Delete the private key from the cloud storage service
	 */
	this.removePrivateKey = function(keyId, callback) {
		var uri = app.config.cloudUrl + '/privatekey/key/' + keyId;
		this.remove(uri, callback);
	};

	/**
	 * Sync encrypted private key from cloud service
	 */
	this.syncPrivateKey = function(emailAddress, storedkey, callback, replaceCallback) {
		// fetch user's encrypted secret key from keychain/storage
		var self = this,
			gottenKey, uri;

		uri = app.config.cloudUrl + '/privatekey/user/' + emailAddress;
		self.get(uri, function(err, keys) {
			if (err) {
				callback(err);
				return;
			}
			if (!keys) {
				callback({
					errMsg: 'Key not synced!'
				});
				return;
			}

			// use first key, if it exists
			if (keys.length > 0) {
				gottenKey = keys[0];
			}

			handleKey(gottenKey, callback);
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