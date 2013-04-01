(function() {
	'use strict';

	/**
	 * High level storage api for handling syncing of data to
	 * and from the cloud.
	 */
	app.dao.CloudStorage = function(window, $) {

		/**
		 * Lists the encrypted items
		 * @param type [String] The type of item e.g. 'email'
		 * @param offset [Number] The offset of items to fetch (0 is the last stored item)
		 * @param num [Number] The number of items to fetch (null means fetch all)
		 */
		this.listEncryptedItems = function(type, emailAddress, folderName, callback) {
			var folder, uri, self = this;

			// fetch encrypted json objects from cloud service
			uri = app.config.cloudUrl + '/' + type + '/user/' + emailAddress + '/folder/' + folderName;
			$.ajax({
				url: uri,
				type: 'GET',
				dataType: 'json',
				success: function(list) {
					callback(list);
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
		 * Persist encrypted user key to cloud service
		 */
		this.persistUserSecretKey = function(emailAddress, callback) {
			// fetch user's encrypted secret key from keychain/storage
			var keyStore = new app.dao.LocalStorageDAO(window);
			var storageId = emailAddress + '_encryptedSymmetricKey';
			var encryptedKey = keyStore.read(storageId);

			var payload = {
				userId: emailAddress,
				encryptedKey: encryptedKey.key,
				keyIV: encryptedKey.iv
			};

			var uri = app.config.cloudUrl + '/keys/user/' + emailAddress;
			$.ajax({
				url: uri,
				type: 'PUT',
				data: JSON.stringify(payload),
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
			var self = this;
			var keyStore = new app.dao.LocalStorageDAO(window);
			var storageId = emailAddress + '_encryptedSymmetricKey';
			var storedKey = keyStore.read(storageId);

			var uri = app.config.cloudUrl + '/keys/user/' + emailAddress;
			$.ajax({
				url: uri,
				type: 'GET',
				dataType: 'json',
				success: function(fetchedKey) {
					if ((!storedKey || !storedKey.key) && fetchedKey && fetchedKey.encryptedKey && fetchedKey.keyIV) {
						// no local key... persist fetched key
						keyStore.persist(storageId, {
							key: fetchedKey.encryptedKey,
							iv: fetchedKey.keyIV
						});
						replaceCallback();

					} else if (storedKey && fetchedKey && (storedKey.key !== fetchedKey.encryptedKey || storedKey.iv !== fetchedKey.keyIV)) {
						// local and fetched keys are not equal
						if (confirm('Swap local key?')) {
							// replace local key with fetched key
							keyStore.persist(storageId, {
								key: fetchedKey.encryptedKey,
								iv: fetchedKey.keyIV
							});
							replaceCallback();
						} else {
							if (confirm('Swap cloud key?')) {
								// upload local key to cloud
								self.persistUserSecretKey(emailAddress, callback);
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
				},
				error: function(xhr, textStatus, err) {
					callback({
						error: err,
						status: textStatus
					});
				}
			});
		};

	};

}());