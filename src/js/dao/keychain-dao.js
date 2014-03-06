/**
 * A high-level Data-Access Api for handling Keypair synchronization
 * between the cloud service and the device's local storage
 */
define(function(require) {
    'use strict';

    var _ = require('underscore');

    var KeychainDAO = function(localDbDao, publicKeyDao) {
        this._localDbDao = localDbDao;
        this._publicKeyDao = publicKeyDao;
    };

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
     * Look up a reveiver's public key by user id
     * @param userId [String] the receiver's email address
     */
    KeychainDAO.prototype.getReceiverPublicKey = function(userId, callback) {
        var self = this;

        // search local keyring for public key
        self._localDbDao.list('publickey', 0, null, function(err, allPubkeys) {
            if (err) {
                callback(err);
                return;
            }

            var pubkey = _.findWhere(allPubkeys, {
                userId: userId
            });

            if (pubkey && pubkey._id) {
                // that user's public key is already in local storage
                callback(null, pubkey);
                return;
            }

            // no public key by that user id in storage
            // find from cloud by email address
            self._publicKeyDao.getByUserId(userId, onKeyGotten);
        });

        function onKeyGotten(err, cloudPubkey) {
            if (err) {
                callback(err);
                return;
            }

            if (!cloudPubkey) {
                // no public key for that user
                callback();
                return;
            }

            // there is a public key for that user already in the cloud...
            // save to local storage
            self.saveLocalPublicKey(cloudPubkey, function(err) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, cloudPubkey);
            });
        }
    };

    /**
     * Gets the local user's key either from local storage
     * or fetches it from the cloud. The private key is encrypted.
     * If no key pair exists, null is returned.
     * return [Object] The user's key pair {publicKey, privateKey}
     */
    KeychainDAO.prototype.getUserKeyPair = function(userId, callback) {
        var self = this;

        // search for user's public key locally
        self._localDbDao.list('publickey', 0, null, function(err, allPubkeys) {
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
        self._localDbDao.read('publickey_' + id, function(err, pubkey) {
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
        this._localDbDao.list('publickey', 0, null, callback);
    };

    KeychainDAO.prototype.removeLocalPublicKey = function(id, callback) {
        this._localDbDao.remove('publickey_' + id, callback);
    };

    KeychainDAO.prototype.lookupPrivateKey = function(id, callback) {
        // lookup in local storage
        this._localDbDao.read('privatekey_' + id, callback);
    };

    KeychainDAO.prototype.saveLocalPublicKey = function(pubkey, callback) {
        // persist public key (email, _id)
        var pkLookupKey = 'publickey_' + pubkey._id;
        this._localDbDao.persist(pkLookupKey, pubkey, callback);
    };

    KeychainDAO.prototype.saveLocalPrivateKey = function(privkey, callback) {
        // persist private key (email, _id)
        var prkLookupKey = 'privatekey_' + privkey._id;
        this._localDbDao.persist(prkLookupKey, privkey, callback);
    };

    return KeychainDAO;
});