/**
 * A high-level Data-Access Api for handling Keypair synchronization
 * between the cloud service and the device's local storage
 */
app.dao.KeychainDAO = function(jsonDao, cloudstorage) {
	'use strict';

	/**
	 * Get an array of public keys by looking in local storage and
	 * fetching missing keys from the cloud service.
	 * @param ids [Array] the key ids as [{_id, userId}]
	 * @return [PublicKeyCollection] The requiested public keys
	 */
	this.getPublicKeys = function(ids, callback) {

	};

	/**
	 * Gets the local user's key either from local storage
	 * or syncronizes from the cloud. The private key is encrypted.
	 * If no key pair exists, null is returned.
	 * return [Object] The user's key pair {publicKey, privateKey}
	 */
	this.getUserKeyPair = function(userId, callback) {
		// loojup public key id
		jsonDao.read('publickey_' + userId, function(pubkeyId) {
			// try to read public key from local storage
			jsonDao.read('publickey_' + pubkeyId._id, function(pubkey) {
				if (!pubkey) {
					// no public key in storage
					// TODO: fetch from cloud
					// TODO: persist in local storage
					callback({
						errMsg: 'Not implemented yet!'
					});
				} else {
					// public key found
					// get corresponding private key
					fetchEncryptedPrivateKey(pubkey);
				}
			});
		});

		function fetchEncryptedPrivateKey(publicKey) {
			// try to read private key from local storage
			jsonDao.read('privatekey_' + publicKey._id, function(privkey) {
				if (!privkey) {
					// no private key in storage
					// TODO: fetch from cloud
					// TODO: persist in local storage
					callback({
						errMsg: 'Not implemented yet!'
					});
				} else {
					// private key found
					callback(null, {
						publicKey: publicKey,
						privateKey: privkey
					});
				}
			});
		}
	};

	/**
	 * Checks to see if the user's key pair is stored both
	 * locally and in the cloud and persist arccordingly
	 * @param [Object] The user's key pair {publicKey, privateKey}
	 */
	this.putUserKeyPair = function(keypair, callback) {
		// validate input
		if (!keypair || !keypair.publicKey || !keypair.privateKey || !keypair.publicKey.userId || keypair.publicKey.userId !== keypair.privateKey.userId) {
			callback({
				errMsg: 'Incorrect input!'
			});
			return;
		}

		// persist public key (email, _id)
		var pkLookupKey = 'publickey_' + keypair.publicKey.userId;
		jsonDao.persist(pkLookupKey, {
			_id: keypair.publicKey._id
		}, function(res1) {
			// validate result
			if (res1.key !== pkLookupKey) {
				callback({
					errMsg: 'Persisting went wrong!'
				});
				return;
			}

			// persist public key
			var pkKey = 'publickey_' + keypair.publicKey._id;
			jsonDao.persist(pkKey, keypair.publicKey, function(res2) {
				// validate result
				if (res2.key !== pkKey) {
					callback({
						errMsg: 'Persisting went wrong!'
					});
					return;
				}

				// persist public key (email, _id)
				var prkLookupKey = 'privatekey_' + keypair.privateKey.userId;
				jsonDao.persist(prkLookupKey, {
					_id: keypair.privateKey._id
				}, function(res3) {
					// validate result
					if (res3.key !== prkLookupKey) {
						callback({
							errMsg: 'Persisting went wrong!'
						});
						return;
					}

					// persist private key
					var prkKey = 'privatekey_' + keypair.privateKey._id;
					jsonDao.persist(prkKey, keypair.privateKey, function(res4) {
						// validate result
						if (res4.key !== prkKey) {
							callback({
								errMsg: 'Persisting went wrong!'
							});
							return;
						}

						callback(null);
					});
				});
			});
		});
	};

};