/**
 * High level storage api for handling syncing of data to
 * and from the cloud.
 */
define(['jquery', 'js/app-config'], function($, app) {
	'use strict';

	var self = {};

	//
	// Generic Ajax helper functions
	//

	/**
	 * GET (read) request
	 */
	self.get = function(uri, callback) {
		$.ajax({
			url: uri,
			type: 'GET',
			dataType: 'json',
			success: function(res) {
				callback(null, res);
			},
			error: function(xhr, textStatus, err) {
				callback({
					errMsg: xhr.status + ': ' + xhr.statusText,
					err: err
				});
			}
		});
	};

	/**
	 * PUT (update) request
	 */
	self.put = function(item, uri, callback) {
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
					errMsg: xhr.status + ': ' + xhr.statusText,
					err: err
				});
			}
		});
	};

	/**
	 * DELETE (remove) request
	 */
	self.remove = function(uri, callback) {
		$.ajax({
			url: uri,
			type: 'DELETE',
			success: function() {
				callback();
			},
			error: function(xhr, textStatus, err) {
				callback({
					errMsg: xhr.status + ': ' + xhr.statusText,
					err: err
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
	self.putEncryptedItem = function(item, type, emailAddress, folderName, callback) {
		var uri = app.config.cloudUrl + '/' + type + '/user/' + emailAddress + '/folder/' + folderName + '/' + item.id;
		self.put(item, uri, callback);
	};

	/**
	 * Delete an encrypted item from the cloud
	 * @param type [String] The type of item e.g. 'email'
	 */
	self.deleteEncryptedItem = function(id, type, emailAddress, folderName, callback) {
		var uri = app.config.cloudUrl + '/' + type + '/user/' + emailAddress + '/folder/' + folderName + '/' + id;
		self.remove(uri, callback);
	};

	/**
	 * Lists the encrypted items
	 * @param type [String] The type of item e.g. 'email'
	 * @param offset [Number] The offset of items to fetch (0 is the last stored item)
	 * @param num [Number] The number of items to fetch (null means fetch all)
	 */
	self.listEncryptedItems = function(type, emailAddress, folderName, callback) {
		var uri = app.config.cloudUrl + '/' + type + '/user/' + emailAddress + '/folder/' + folderName;
		self.get(uri, callback);
	};

	//
	// Public Key
	//

	/**
	 * Find the user's corresponding public key
	 */
	self.getPublicKey = function(keyId, callback) {
		var uri = app.config.cloudUrl + '/publickey/key/' + keyId;

		self.get(uri, function(err, key) {
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
	 * Find the user's corresponding public key by email
	 */
	self.getPublicKeyByUserId = function(userId, callback) {
		var uri = app.config.cloudUrl + '/publickey/user/' + userId;

		self.get(uri, function(err, keys) {
			if (err) {
				callback(err);
				return;
			}

			if (!keys || keys.length < 1) {
				callback({
					errMsg: 'No public key for that user!'
				});
				return;
			}

			if (keys.length > 1) {
				callback({
					errMsg: 'That user has multiple public keys!'
				});
				return;
			}

			callback(null, keys[0]);
		});
	};

	/**
	 * Persist the user's publc key
	 */
	self.putPublicKey = function(pubkey, callback) {
		var uri = app.config.cloudUrl + '/publickey/user/' + pubkey.userId + '/key/' + pubkey._id;
		self.put(pubkey, uri, callback);
	};

	/**
	 * Delete the public key from the cloud storage service
	 */
	self.removePublicKey = function(keyId, callback) {
		var uri = app.config.cloudUrl + '/publickey/key/' + keyId;
		self.remove(uri, callback);
	};

	//
	// Ecrypted Private Key
	//

	/**
	 * Fetch private key by id
	 */
	self.getPrivateKey = function(keyId, callback) {
		var uri = app.config.cloudUrl + '/privatekey/key/' + keyId;
		self.get(uri, function(err, key) {
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
	self.putPrivateKey = function(privkey, callback) {
		var uri = app.config.cloudUrl + '/privatekey/user/' + privkey.userId + '/key/' + privkey._id;
		self.put(privkey, uri, callback);
	};

	/**
	 * Delete the private key from the cloud storage service
	 */
	self.removePrivateKey = function(keyId, callback) {
		var uri = app.config.cloudUrl + '/privatekey/key/' + keyId;
		self.remove(uri, callback);
	};

	return self;
});