/**
 * A high-level Data-Access Api for handling Keypair synchronization
 * between the cloud service and the device's local storage
 */
define(['underscore', 'js/dao/lawnchair-dao'], function(_, jsonDao) {
    'use strict';

    var KeychainDAO = function(cloudstorage) {
        var self = this;

        self._cloudstorage = cloudstorage;
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
    KeychainDAO.prototype.getReveiverPublicKey = function(userId, callback) {
        var self = this;

        // search local keyring for public key
        jsonDao.list('publickey', 0, null, function(allPubkeys) {
            var pubkey = _.findWhere(allPubkeys, {
                userId: userId
            });

            if (!pubkey || !pubkey._id) {
                // no public key by that user id in storage
                // find from cloud by email address
                self._cloudstorage.getPublicKeyByUserId(userId, function(err, cloudPubkey) {
                    if (err || !cloudPubkey) {
                        callback();
                        return;
                    }

                    if (cloudPubkey && cloudPubkey._id) {
                        // there is a public key for that user already in the cloud...
                        // save to local storage
                        self.saveLocalPublicKey(cloudPubkey, function(err) {
                            if (err) {
                                callback(err);
                                return;
                            }

                            callback(null, cloudPubkey);
                        });
                    } else {
                        // no public key for that user
                        callback();
                        return;
                    }
                });

            } else {
                // that user's public key is already in local storage
                callback(null, pubkey);
            }
        });
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
        jsonDao.list('publickey', 0, null, function(allPubkeys) {
            var pubkey = _.findWhere(allPubkeys, {
                userId: userId
            });

            if (!pubkey || !pubkey._id) {
                // no public key by that user id in storage
                // find from cloud by email address
                self._cloudstorage.getPublicKeyByUserId(userId, function(err, cloudPubkey) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    if (cloudPubkey && cloudPubkey._id) {
                        // there is a public key for that user already in the cloud...
                        // sync keypair to local storage
                        syncKeypair(cloudPubkey._id);
                    } else {
                        // continue without keypair... generate in crypto.js
                        callback();
                        return;
                    }
                });

            } else {
                // that user's public key is already in local storage...
                // sync keypair to the cloud
                syncKeypair(pubkey._id);
            }
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
                    if (err) {
                        callback(err);
                        return;
                    }

                    // validate fetched key
                    if (savedPubkey && savedPubkey.publicKey && savedPrivkey && savedPrivkey.encryptedKey) {
                        callback(null, {
                            publicKey: savedPubkey,
                            privateKey: savedPrivkey
                        });
                        return;

                    } else {
                        // continue without keypair... generate in crypto.js
                        callback();
                        return;
                    }
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
            self._cloudstorage.putPublicKey(keypair.publicKey, function(err) {
                // validate result
                if (err) {
                    callback(err);
                    return;
                }

                // store private key locally
                self.saveLocalPrivateKey(keypair.privateKey, function(err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    // persist private key in cloud storage
                    self._cloudstorage.putPrivateKey(keypair.privateKey, function(err) {
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

    KeychainDAO.prototype.lookupPublicKey = function(id, callback) {
        var self = this;

        // lookup in local storage
        jsonDao.read('publickey_' + id, function(pubkey) {
            if (!pubkey) {
                // fetch from cloud storage
                self._cloudstorage.getPublicKey(id, function(err, cloudPubkey) {
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

            } else {
                callback(null, pubkey);
            }
        });
    };

    KeychainDAO.prototype.lookupPrivateKey = function(id, callback) {
        var self = this;

        // lookup in local storage
        jsonDao.read('privatekey_' + id, function(privkey) {
            if (!privkey) {
                // fetch from cloud storage
                self._cloudstorage.getPrivateKey(id, function(err, cloudPrivkey) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    // cache private key in cache
                    self.saveLocalPrivateKey(cloudPrivkey, function(err) {
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
    };

    KeychainDAO.prototype.saveLocalPublicKey = function(pubkey, callback) {
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
    };

    KeychainDAO.prototype.saveLocalPrivateKey = function(privkey, callback) {
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
    };

    return KeychainDAO;
});