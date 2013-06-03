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
		var already, pubkeys = [];

		var after = _.after(ids.length, function() {
			callback(null, pubkeys);
		});

		_.each(ids, function(i) {
			// lookup locally and in storage			
			lookupPublicKey(i._id, function(err, pubkey) {
				if (err || !pubkey) {
					callback({
						errMsg: 'Error looking up public key!',
						err: err
					});
					return;
				}

				// check if public key with that id has already been fetched
				already = null;
				already = _.findWhere(pubkeys, {
					_id: i._id
				});
				if (!already) {
					pubkeys.push(pubkey);
				}

				after(); // asynchronously iterate through objects
			});
		});
	};

	/**
	 * Gets the local user's key either from local storage
	 * or fetches it from the cloud. The private key is encrypted.
	 * If no key pair exists, null is returned.
	 * return [Object] The user's key pair {publicKey, privateKey}
	 */
	this.getUserKeyPair = function(userId, callback) {
		// search for user's public key
		jsonDao.list('publickey', 0, null, function(allPubkeys) {
			var pubkey = _.findWhere(allPubkeys, {
				userId: userId
			});

			if (!pubkey) {
				// no public key by that user id in storage
				// TODO: find from cloud
				// TODO: persist in local storage
				callback();
				return;
			}

			// public key found				
			// get corresponding private key
			fetchEncryptedPrivateKey(pubkey);
		});

		function fetchEncryptedPrivateKey(publicKey) {
			// try to read private key from local storage
			lookupPrivateKey(publicKey._id, function(err, privkey) {
				if (err || !privkey) {
					callback({
						errMsg: 'Error looking up private key!',
						err: err
					});
					return;
				}

				// private key found
				callback(null, {
					publicKey: publicKey,
					privateKey: privkey
				});
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

		// store public key locally
		saveLocalPublicKey(keypair.publicKey, function(err) {
			if (err) {
				callback(err);
				return;
			}

			// persist public key in cloud storage
			cloudstorage.putPublicKey(keypair.publicKey, function(err) {
				// validate result
				if (err) {
					callback(err);
					return;
				}

				// store private key locally
				saveLocalPrivateKey(keypair.privateKey, function(err) {
					if (err) {
						callback(err);
						return;
					}

					// persist private key in cloud storage
					cloudstorage.putPrivateKey(keypair.privateKey, function(err) {
						// validate result
						if (err) {
							callback(err);
							return;
						}

						callback(null);
					});
				});
			});
		});
	};

	//
	// Helper functions
	//

	function lookupPublicKey(id, callback) {
		// lookup in local storage
		jsonDao.read('publickey_' + id, function(pubkey) {
			if (!pubkey) {
				// fetch from cloud storage
				cloudstorage.getPublicKey(id, function(err, cloudPubkey) {
					if (err) {
						callback(err);
						return;
					}

					// cache public key in cache
					saveLocalPublicKey(cloudPubkey, function(err) {
						if (err) {
							callback(err);
							return;
						}

						callback(null, cloudPubkey);
					});
				});

			} else {
				callback(null, pubkey);
			}
		});
	}

	function lookupPrivateKey(id, callback) {
		// lookup in local storage
		jsonDao.read('privatekey_' + id, function(privkey) {
			if (!privkey) {
				// fetch from cloud storage
				cloudstorage.getPrivateKey(id, function(err, cloudPrivkey) {
					if (err) {
						callback(err);
						return;
					}

					// cache private key in cache
					saveLocalPrivateKey(cloudPrivkey, function(err) {
						if (err) {
							callback(err);
							return;
						}

						callback(null, cloudPrivkey);
					});

				});

			} else {
				callback(null, privkey);
			}
		});
	}

	function saveLocalPublicKey(pubkey, callback) {
		// persist public key (email, _id)
		var pkLookupKey = 'publickey_' + pubkey._id;

		jsonDao.persist(pkLookupKey, pubkey, function(res1) {
			// validate result
			if (res1.key !== pkLookupKey) {
				callback({
					errMsg: 'Persisting public key in local storage went wrong!'
				});
				return;
			}

			callback();
		});
	}

	function saveLocalPrivateKey(privkey, callback) {
		// persist private key (email, _id)
		var prkLookupKey = 'privatekey_' + privkey._id;

		jsonDao.persist(prkLookupKey, privkey, function(res1) {
			// validate result
			if (res1.key !== prkLookupKey) {
				callback({
					errMsg: 'Persisting private key in local storage went wrong!'
				});
				return;
			}

			callback();
		});
	}

};