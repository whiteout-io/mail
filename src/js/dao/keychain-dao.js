/**
 * A high-level Data-Access Api for handling Keypair synchronization
 * between the cloud service and the device's local storage
 */
define(function(require) {
    'use strict';

    var _ = require('underscore'),
        util = require('js/crypto/util');

    var DB_PUBLICKEY = 'publickey',
        DB_PRIVATEKEY = 'privatekey',
        DB_DEVICENAME = 'devicename',
        DB_DEVICEKEY = 'devicekey';

    var KeychainDAO = function(localDbDao, publicKeyDao, privateKeyDao, crypto) {
        this._localDbDao = localDbDao;
        this._publicKeyDao = publicKeyDao;
        this._privateKeyDao = privateKeyDao;
        this._crypto = crypto;
    };

    //
    // Public key functions
    //

    /**
     * Verifies the public key of a user o nthe public key store
     * @param {String} uuid The uuid to verify the key
     * @param {Function} callback(error) Callback with an optional error object when the verification is done. If the was an error, the error object contains the information for it.
     */
    KeychainDAO.prototype.verifyPublicKey = function(uuid, callback) {
        this._publicKeyDao.verify(uuid, callback);
    };

    /**
     * Get an array of public keys by looking in local storage and
     * fetching missing keys from the cloud service.
     * @param ids [Array] the key ids as [{_id, userId}]
     * @return [PublicKeyCollection] The requiested public keys
     */
    KeychainDAO.prototype.getPublicKeys = function(ids, callback) {
        var self = this,
            after, already, pubkeys = [];

        // return empty array if key ids are emtpy
        if (ids.length < 1) {
            callback(null, pubkeys);
            return;
        }

        after = _.after(ids.length, function() {
            callback(null, pubkeys);
        });

        _.each(ids, function(i) {
            // lookup locally and in storage
            self.lookupPublicKey(i._id, function(err, pubkey) {
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
     * Checks for public key updates of a given user id
     * @param {String} userId The user id (email address) for which to check the key
     * @param {Function} callback(error, key) Invoked when the key has been updated or an error occurred
     */
    KeychainDAO.prototype.refreshKeyForUserId = function(userId, callback) {
        var self = this;

        // get the public key corresponding to the userId
        self.getReceiverPublicKey(userId, function(err, localKey) {
            if (!localKey || !localKey._id) {
                // there is no key available, no need to refresh
                callback();
                return;
            }

            // no need to refresh manually imported public keys
            if (localKey.imported) {
                callback(null, localKey);
                return;
            }

            // check if the key id still exists on the key server
            checkKeyExists(localKey);
        });

        // checks if the user's key has been revoked by looking up the key id
        function checkKeyExists(localKey) {
            self._publicKeyDao.get(localKey._id, function(err, cloudKey) {
                if (err && err.code === 42) {
                    // we're offline, we're done checking the key
                    callback(null, localKey);
                    return;
                }

                if (err) {
                    // there was an error, exit and inform
                    callback(err);
                    return;
                }

                if (cloudKey && cloudKey._id === localKey._id) {
                    // the key is present on the server, all is well
                    callback(null, localKey);
                    return;
                }

                // the key has changed, update the key
                updateKey(localKey);
            });
        }

        function updateKey(localKey) {
            // look for an updated key for the user id
            self._publicKeyDao.getByUserId(userId, function(err, newKey) {
                // offline?
                if (err && err.code === 42) {
                    callback(null, localKey);
                    return;
                }

                if (err) {
                    callback(err);
                    return;
                }

                // the public key has changed, we need to ask for permission to update the key
                self.requestPermissionForKeyUpdate({
                    userId: userId,
                    newKey: newKey
                }, function(granted) {
                    if (!granted) {
                        // permission was not given to update the key, so don't overwrite the old one!
                        callback(null, localKey);
                        return;
                    }

                    // permission to update the key was given, so delete the old one and persist the new one
                    self.removeLocalPublicKey(localKey._id, function(err) {
                        if (err || !newKey) {
                            // error or no new key to save
                            callback(err);
                            return;
                        }

                        // persist the new key and return it
                        self.saveLocalPublicKey(newKey, function(err) {
                            callback(err, err ? undefined : newKey);
                        });
                    });
                });

            });
        }
    };

    /**
     * Look up a reveiver's public key by user id
     * @param userId [String] the receiver's email address
     */
    KeychainDAO.prototype.getReceiverPublicKey = function(userId, callback) {
        var self = this;

        // search local keyring for public key
        self._localDbDao.list(DB_PUBLICKEY, 0, null, function(err, allPubkeys) {
            if (err) {
                callback(err);
                return;
            }

            // query primary email address
            var pubkey = _.findWhere(allPubkeys, {
                userId: userId
            });

            // query mutliple userIds (for imported public keys)
            if (!pubkey) {
                for (var i = 0, match; i < allPubkeys.length; i++) {
                    match = _.findWhere(allPubkeys[i].userIds, {
                        emailAddress: userId
                    });
                    if (match) {
                        pubkey = allPubkeys[i];
                        break;
                    }
                }
            }

            if (pubkey && pubkey._id) {
                // that user's public key is already in local storage
                callback(null, pubkey);
                return;
            }

            // no public key by that user id in storage
            // find from cloud by email address
            self._publicKeyDao.getByUserId(userId, onKeyReceived);
        });

        function onKeyReceived(err, cloudPubkey) {
            if (err && err.code === 42) {
                // offline
                callback();
                return;
            }

            if (err) {
                callback(err);
                return;
            }

            if (!cloudPubkey) {
                // public key has been deleted without replacement
                callback();
                return;
            }

            self.saveLocalPublicKey(cloudPubkey, function(err) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, cloudPubkey);
            });
        }
    };

    //
    // Device registration functions
    //

    /**
     * Set the device's memorable name e.g 'iPhone Work'
     * @param {String}   deviceName The device name
     * @param {Function} callback(error)
     */
    KeychainDAO.prototype.setDeviceName = function(deviceName, callback) {
        this._localDbDao.persist(DB_DEVICENAME, deviceName, callback);
    };

    /**
     * Geneate a device specific key and secret to authenticate to the private key service.
     * @param {Function} callback(error, deviceSecret:[base64 encoded string])
     */
    KeychainDAO.prototype.getDeviceSecret = function(callback) {
        var self = this;

        // check if deviceName is already persisted in storage and if not return an error
        self._localDbDao.read(DB_DEVICENAME, function(err, deviceName) {
            if (err) {
                callback(err);
                return;
            }

            if (!deviceName) {
                callback(new Error('Device name not set!'));
                return;
            }

            readOrGenerateDeviceKey(function(deviceKey) {
                generateDeciceSecret(deviceName, deviceKey);
            });
        });

        // generate random deviceKey or get from storage
        function readOrGenerateDeviceKey(localCallback) {
            self._localDbDao.read(DB_DEVICEKEY, function(err, storedDevKey) {
                if (err) {
                    callback(err);
                    return;
                }

                if (storedDevKey) {
                    // a device key is already available locally
                    localCallback(storedDevKey);
                    return;
                }

                // generate random deviceKey
                var deviceKey = util.random(256);
                // persist deviceKey to local storage (in plaintext)
                self._localDbDao.persist(DB_DEVICEKEY, deviceKey, function(err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    localCallback(deviceKey);
                });
            });
        }

        // encrypt: deviceSecret = Es(deviceKey, deviceName) -> callback
        function generateDeciceSecret(deviceName, deviceKey) {
            self._crypto.encrypt(deviceName, deviceKey, callback);
        }
    };

    /**
     * Register the device on the private key server. This will give the device access to upload an encrypted private key.
     * @param  {String}   userId The user's email address
     * @param  {String}   deviceName The device's memorable name e.g 'iPhone Work'
     * @param  {[type]}   deviceSecret The device specific secret derived from the device key and the device name.
     * @param  {Function} callback(error)
     */
    KeychainDAO.prototype.registerDevice = function(userId, deviceName, deviceSecret, callback) {
        callback(new Error('Not yet implemented!'));
    };

    //
    // Private key functions
    //

    /**
     * Authenticate to the private key server (required before private PGP key upload).
     * @param  {String}   userId The user's email address
     * @param  {Function} callback(error)
     */
    KeychainDAO.prototype.authenticateToPrivateKeyServer = function(userId, callback) {
        callback(new Error('Not yet implemented!'));
    };

    /**
     * Encrypt and upload the private PGP key to the server.
     * @param  {Object}   privkey
     * @param  {String}   code The randomly generated or self selected code used to derive the key for the encryption of the private PGP key
     * @param  {Function} callback
     */
    KeychainDAO.prototype.uploadPrivateKeyToServer = function(privkey, code, callback) {
        // generate random salt

        // derive key from the code using PBKDF2

        // encrypt the private key with the derived key (AES-GCM authenticated encryption)

        // upload the 'privatekey' {salt:[base64 encoded string], encryptedPrivateKey:[base64 encoded string]}

        callback(new Error('Not yet implemented!'));
    };

    /**
     * Request downloading the user's encrypted private key. This will initiate the server to send the recovery token via email/sms to the user.
     * @param  {[type]}   userId The user's email address
     * @param  {Function} callback(error)
     */
    KeychainDAO.prototype.requestPrivateKeyDownload = function(userId, callback) {
        callback(new Error('Not yet implemented!'));
    };

    /**
     * Download the encrypted private PGP key from the server using the recovery token.
     * @param  {[type]}   recoveryToken The recovery token acquired via email/sms from the key server
     * @param  {Function} callback(error, encryptedPrivateKey)
     */
    KeychainDAO.prototype.downloadPrivateKeyFromServer = function(recoveryToken, callback) {
        callback(new Error('Not yet implemented!'));
    };

    /**
     * This is called after the encrypted private key has successfully been downloaded and it's ready to be decrypted and stored in localstorage.
     * @param  {[type]}   code The randomly generated or self selected code used to derive the key for the decryption of the private PGP key
     * @param  {Object}   encryptedPrivkey The encrypted private PGP key including the random salt {salt:[base64 encoded string], encryptedPrivateKey:[base64 encoded string]}
     * @param  {Function} callback(error, privateKey)
     */
    KeychainDAO.prototype.decryptAndStorePrivateKeyLocally = function(code, encryptedPrivkey, callback) {
        // derive key from the code and the salt using PBKDF2

        // decrypt the private key with the derived key (AES-GCM authenticated decryption)

        callback(new Error('Not yet implemented!'));
    };

    //
    // Keypair functions
    //

    /**
     * Gets the local user's key either from local storage
     * or fetches it from the cloud. The private key is encrypted.
     * If no key pair exists, null is returned.
     * return [Object] The user's key pair {publicKey, privateKey}
     */
    KeychainDAO.prototype.getUserKeyPair = function(userId, callback) {
        var self = this;

        // search for user's public key locally
        self._localDbDao.list(DB_PUBLICKEY, 0, null, function(err, allPubkeys) {
            if (err) {
                callback(err);
                return;
            }

            var pubkey = _.findWhere(allPubkeys, {
                userId: userId
            });

            if (pubkey && pubkey._id) {
                // that user's public key is already in local storage...
                // sync keypair to the cloud
                syncKeypair(pubkey._id);
                return;
            }

            // no public key by that user id in storage
            // find from cloud by email address
            self._publicKeyDao.getByUserId(userId, function(err, cloudPubkey) {
                if (err) {
                    callback(err);
                    return;
                }

                if (cloudPubkey && cloudPubkey._id) {
                    // there is a public key for that user already in the cloud...
                    // sync keypair to local storage
                    syncKeypair(cloudPubkey._id);
                    return;
                }

                // continue without keypair... generate in crypto.js
                callback();
            });
        });

        function syncKeypair(keypairId) {
            // persist key pair in local storage
            self.lookupPublicKey(keypairId, function(err, savedPubkey) {
                if (err) {
                    callback(err);
                    return;
                }

                // persist private key in local storage
                self.lookupPrivateKey(keypairId, function(err, savedPrivkey) {
                    var keys = {};

                    if (err) {
                        callback(err);
                        return;
                    }

                    if (savedPubkey && savedPubkey.publicKey) {
                        keys.publicKey = savedPubkey;
                    }

                    if (savedPrivkey && savedPrivkey.encryptedKey) {
                        keys.privateKey = savedPrivkey;
                    }

                    callback(null, keys);
                });
            });
        }
    };

    /**
     * Checks to see if the user's key pair is stored both
     * locally and in the cloud and persist arccordingly
     * @param [Object] The user's key pair {publicKey, privateKey}
     */
    KeychainDAO.prototype.putUserKeyPair = function(keypair, callback) {
        var self = this;

        // validate input
        if (!keypair || !keypair.publicKey || !keypair.privateKey || !keypair.publicKey.userId || keypair.publicKey.userId !== keypair.privateKey.userId) {
            callback({
                errMsg: 'Incorrect input!'
            });
            return;
        }

        // store public key locally
        self.saveLocalPublicKey(keypair.publicKey, function(err) {
            if (err) {
                callback(err);
                return;
            }

            // persist public key in cloud storage
            self._publicKeyDao.put(keypair.publicKey, function(err) {
                // validate result
                if (err) {
                    callback(err);
                    return;
                }

                // store private key locally
                self.saveLocalPrivateKey(keypair.privateKey, callback);
            });
        });
    };

    //
    // Helper functions
    //

    KeychainDAO.prototype.lookupPublicKey = function(id, callback) {
        var self = this;

        if (!id) {
            callback({
                errMsg: 'ID must be set for public key query!'
            });
            return;
        }

        // lookup in local storage
        self._localDbDao.read(DB_PUBLICKEY + '_' + id, function(err, pubkey) {
            if (err) {
                callback(err);
                return;
            }

            if (pubkey) {
                callback(null, pubkey);
                return;
            }

            // fetch from cloud storage
            self._publicKeyDao.get(id, function(err, cloudPubkey) {
                if (err) {
                    callback(err);
                    return;
                }

                // cache public key in cache
                self.saveLocalPublicKey(cloudPubkey, function(err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    callback(null, cloudPubkey);
                });
            });
        });
    };

    /**
     * List all the locally stored public keys
     */
    KeychainDAO.prototype.listLocalPublicKeys = function(callback) {
        // search local keyring for public key
        this._localDbDao.list(DB_PUBLICKEY, 0, null, callback);
    };

    KeychainDAO.prototype.removeLocalPublicKey = function(id, callback) {
        this._localDbDao.remove(DB_PUBLICKEY + '_' + id, callback);
    };

    KeychainDAO.prototype.lookupPrivateKey = function(id, callback) {
        // lookup in local storage
        this._localDbDao.read(DB_PRIVATEKEY + '_' + id, callback);
    };

    KeychainDAO.prototype.saveLocalPublicKey = function(pubkey, callback) {
        // persist public key (email, _id)
        var pkLookupKey = DB_PUBLICKEY + '_' + pubkey._id;
        this._localDbDao.persist(pkLookupKey, pubkey, callback);
    };

    KeychainDAO.prototype.saveLocalPrivateKey = function(privkey, callback) {
        // persist private key (email, _id)
        var prkLookupKey = DB_PRIVATEKEY + '_' + privkey._id;
        this._localDbDao.persist(prkLookupKey, privkey, callback);
    };

    return KeychainDAO;
});