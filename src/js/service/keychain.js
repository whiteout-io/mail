'use strict';

var ngModule = angular.module('woServices');
ngModule.service('keychain', Keychain);
module.exports = Keychain;

var DB_PUBLICKEY = 'publickey',
    DB_PRIVATEKEY = 'privatekey';

/**
 * A high-level Data-Access Api for handling Keypair synchronization
 * between the cloud service and the device's local storage
 */
function Keychain(accountLawnchair, publicKey, privateKey, crypto, pgp, dialog, appConfig) {
    this._lawnchairDAO = accountLawnchair;
    this._publicKeyDao = publicKey;
    this._privateKeyDao = privateKey;
    this._crypto = crypto;
    this._pgp = pgp;
    this._dialog = dialog;
    this._appConfig = appConfig;
}

//
// Public key functions
//

/**
 * Display confirmation dialog to request a public key update
 * @param  {Object}   params.newKey   The user's updated public key object
 * @param  {String}   params.userId   The user's email address
 */
Keychain.prototype.requestPermissionForKeyUpdate = function(params, callback) {
    var str = this._appConfig.string;
    var message = params.newKey ? str.updatePublicKeyMsgNewKey : str.updatePublicKeyMsgRemovedKey;
    message = message.replace('{0}', params.userId);

    this._dialog.confirm({
        title: str.updatePublicKeyTitle,
        message: message,
        positiveBtnStr: str.updatePublicKeyPosBtn,
        negativeBtnStr: str.updatePublicKeyNegBtn,
        showNegativeBtn: true,
        callback: callback
    });
};

/**
 * Verifies the public key of a user o nthe public key store
 * @param {String} uuid The uuid to verify the key
 */
Keychain.prototype.verifyPublicKey = function(uuid) {
    return this._publicKeyDao.verify(uuid);
};

/**
 * Checks for public key updates of a given user id
 * @param {String} options.userId The user id (email address) for which to check the key
 * @param {String} options.overridePermission (optional) Indicates if the update should happen automatically (true) or with the user being queried (false). Defaults to false
 */
Keychain.prototype.refreshKeyForUserId = function(options) {
    var self = this,
        userId = options.userId,
        overridePermission = options.overridePermission;

    // get the public key corresponding to the userId
    return self.getReceiverPublicKey(userId).then(function(localKey) {
        if (!localKey || !localKey._id) {
            // there is no key available, no need to refresh
            return;
        }
        // no need to refresh manually imported public keys
        if (localKey.imported) {
            return localKey;
        }
        // check if the key id still exists on the key server
        return checkKeyExists(localKey);
    });

    // checks if the user's key has been revoked by looking up the key id
    function checkKeyExists(localKey) {
        return self._publicKeyDao.getByUserId(userId).then(function(cloudKey) {
            if (cloudKey && cloudKey._id === localKey._id) {
                // the key is present on the server, all is well
                return localKey;
            }
            // the key has changed, update the key
            return updateKey(localKey, cloudKey);

        }).catch(function(err) {
            if (err && err.code === 42) {
                // we're offline, we're done checking the key
                return localKey;
            }
            throw err;
        });
    }

    function updateKey(localKey, newKey) {
        // the public key has changed, we need to ask for permission to update the key
        if (overridePermission) {
            // don't query the user, update the public key right away
            return permissionGranted(localKey, newKey);
        } else {
            return requestPermission(localKey, newKey);
        }
    }

    function requestPermission(localKey, newKey) {
        return new Promise(function(resolve, reject) {
            // query the user if the public key should be updated
            self.requestPermissionForKeyUpdate({
                userId: userId,
                newKey: newKey
            }, function(granted) {
                if (!granted) {
                    // permission was not given to update the key, so don't overwrite the old one!
                    resolve(localKey);
                    return;
                }
                // permission was granted by the user
                permissionGranted(localKey, newKey).then(resolve).catch(reject);
            });
        });
    }

    function permissionGranted(localKey, newKey) {
        // permission to update the key was given, so delete the old one and persist the new one
        return self.removeLocalPublicKey(localKey._id).then(function() {
            if (!newKey) {
                // error or no new key to save
                return;
            }
            // persist the new key and return it
            return self.saveLocalPublicKey(newKey).then(function() {
                return newKey;
            });
        });
    }
};

/**
 * Look up a reveiver's public key by user id
 * @param userId [String] the receiver's email address
 */
Keychain.prototype.getReceiverPublicKey = function(userId) {
    var self = this;

    // search local keyring for public key
    return self._lawnchairDAO.list(DB_PUBLICKEY).then(function(allPubkeys) {
        var userIds;
        // query primary email address
        var pubkey = _.findWhere(allPubkeys, {
            userId: userId
        });
        // query mutliple userIds
        if (!pubkey) {
            for (var i = 0, match; i < allPubkeys.length; i++) {
                userIds = self._pgp.getKeyParams(allPubkeys[i].publicKey).userIds;
                match = _.findWhere(userIds, {
                    emailAddress: userId
                });
                if (match) {
                    pubkey = allPubkeys[i];
                    break;
                }
            }
        }
        // that user's public key is already in local storage
        if (pubkey && pubkey._id) {
            return pubkey;
        }
        // no public key by that user id in storage
        // find from cloud by email address
        return self._publicKeyDao.getByUserId(userId).then(onKeyReceived).catch(onError);
    });

    function onKeyReceived(cloudPubkey) {
        if (!cloudPubkey) {
            // public key has been deleted without replacement
            return;
        }
        // persist and return cloud key
        return self.saveLocalPublicKey(cloudPubkey).then(function() {
            return cloudPubkey;
        });
    }

    function onError(err) {
        if (err && err.code === 42) {
            // offline
            return;
        }
        throw err;
    }
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
Keychain.prototype.getUserKeyPair = function(userId) {
    var self = this;

    // search for user's public key locally
    return self._lawnchairDAO.list(DB_PUBLICKEY).then(function(allPubkeys) {
        var pubkey = _.findWhere(allPubkeys, {
            userId: userId
        });

        if (pubkey && pubkey._id && !pubkey.source) {
            // that user's public key is already in local storage...
            // sync keypair to the cloud
            return syncKeypair(pubkey._id);
        }

        // no public key by that user id in storage
        // find from cloud by email address
        return self._publicKeyDao.getByUserId(userId).then(function(cloudPubkey) {
            if (cloudPubkey && cloudPubkey._id && !cloudPubkey.source) {
                // there is a public key for that user already in the cloud...
                // sync keypair to local storage
                return syncKeypair(cloudPubkey._id);
            }

            // continue without keypair... generate or import new keypair
        });
    });

    function syncKeypair(keypairId) {
        var savedPubkey, savedPrivkey;
        // persist key pair in local storage
        return self.lookupPublicKey(keypairId).then(function(pub) {
            savedPubkey = pub;

            // persist private key in local storage
            return self.lookupPrivateKey(keypairId);

        }).then(function(priv) {
            savedPrivkey = priv;

        }).then(function() {
            var keys = {};

            if (savedPubkey && savedPubkey.publicKey) {
                keys.publicKey = savedPubkey;
            }
            if (savedPrivkey && savedPrivkey.encryptedKey) {
                keys.privateKey = savedPrivkey;
            }

            return keys;
        });
    }
};

/**
 * Checks to see if the user's key pair is stored both
 * locally and in the cloud and persist arccordingly
 * @param [Object] The user's key pair {publicKey, privateKey}
 */
Keychain.prototype.putUserKeyPair = function(keypair) {
    var self = this;

    // validate input
    if (!keypair || !keypair.publicKey || !keypair.privateKey || !keypair.publicKey.userId || keypair.publicKey.userId !== keypair.privateKey.userId) {
        return new Promise(function() {
            throw new Error('Cannot put user key pair: Incorrect input!');
        });
    }

    // don't check the user's own public key for deletion in refreshKeyForUserId
    keypair.publicKey.imported = true;

    // store public key locally
    return self.saveLocalPublicKey(keypair.publicKey).then(function() {
        // persist public key in cloud storage
        return self._publicKeyDao.put(keypair.publicKey);
    }).then(function() {
        // store private key locally
        return self.saveLocalPrivateKey(keypair.privateKey);
    });
};

/**
 * Uploads the public key
 * @param {Object} publicKey The user's public key
 * @return {Promise}
 */
Keychain.prototype.uploadPublicKey = function(publicKey) {
    var self = this;

    // validate input
    if (!publicKey || !publicKey.userId || !publicKey.publicKey) {
        return new Promise(function() {
            throw new Error('Cannot upload user key pair: Incorrect input!');
        });
    }

    return self._publicKeyDao.put(publicKey);
};

//
// Helper functions
//

Keychain.prototype.lookupPublicKey = function(id) {
    var self = this,
        cloudPubkey;

    if (!id) {
        return new Promise(function() {
            throw new Error('ID must be set for public key query!');
        });
    }

    // lookup in local storage
    return self._lawnchairDAO.read(DB_PUBLICKEY + '_' + id).then(function(pubkey) {
        if (pubkey) {
            return pubkey;
        }

        // fetch from cloud storage
        return self._publicKeyDao.get(id).then(function(pub) {
            cloudPubkey = pub;
            // cache public key in cache
            return self.saveLocalPublicKey(cloudPubkey);
        }).then(function() {
            return cloudPubkey;
        });
    });
};

/**
 * List all the locally stored public keys
 */
Keychain.prototype.listLocalPublicKeys = function() {
    // search local keyring for public key
    return this._lawnchairDAO.list(DB_PUBLICKEY);
};

Keychain.prototype.removeLocalPublicKey = function(id) {
    return this._lawnchairDAO.remove(DB_PUBLICKEY + '_' + id);
};

Keychain.prototype.lookupPrivateKey = function(id) {
    // lookup in local storage
    return this._lawnchairDAO.read(DB_PRIVATEKEY + '_' + id);
};

Keychain.prototype.saveLocalPublicKey = function(pubkey) {
    // persist public key (email, _id)
    var pkLookupKey = DB_PUBLICKEY + '_' + pubkey._id;
    return this._lawnchairDAO.persist(pkLookupKey, pubkey);
};

Keychain.prototype.saveLocalPrivateKey = function(privkey) {
    // persist private key (email, _id)
    var prkLookupKey = DB_PRIVATEKEY + '_' + privkey._id;
    return this._lawnchairDAO.persist(prkLookupKey, privkey);
};