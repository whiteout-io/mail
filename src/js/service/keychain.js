'use strict';

var ngModule = angular.module('woServices');
ngModule.service('keychain', Keychain);
module.exports = Keychain;

var util = require('crypto-lib').util;

var DB_PUBLICKEY = 'publickey',
    DB_PRIVATEKEY = 'privatekey',
    DB_DEVICENAME = 'devicename',
    DB_DEVICE_SECRET = 'devicesecret';

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
 * Get an array of public keys by looking in local storage and
 * fetching missing keys from the cloud service.
 * @param ids [Array] the key ids as [{_id, userId}]
 * @return [PublicKeyCollection] The requiested public keys
 */
Keychain.prototype.getPublicKeys = function(ids) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var after, already, pubkeys = [];

        // return empty array if key ids are emtpy
        if (ids.length < 1) {
            resolve(pubkeys);
            return;
        }

        after = _.after(ids.length, function() {
            resolve(pubkeys);
        });

        _.each(ids, function(i) {
            // lookup locally and in storage
            self.lookupPublicKey(i._id).then(function(pubkey) {
                if (!pubkey) {
                    reject(new Error('Error looking up public key!'));
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
            }).catch(reject);
        });
    });
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
        return self._publicKeyDao.get(localKey._id).then(function(cloudKey) {
            if (cloudKey && cloudKey._id === localKey._id) {
                // the key is present on the server, all is well
                return localKey;
            }
            // the key has changed, update the key
            return updateKey(localKey);

        }).catch(function(err) {
            if (err && err.code === 42) {
                // we're offline, we're done checking the key
                return localKey;
            }
            throw err;
        });
    }

    function updateKey(localKey) {
        // look for an updated key for the user id
        return self._publicKeyDao.getByUserId(userId).then(function(newKey) {
            // the public key has changed, we need to ask for permission to update the key
            if (overridePermission) {
                // don't query the user, update the public key right away
                return permissionGranted(localKey, newKey);
            } else {
                return requestPermission(localKey, newKey);
            }

        }).catch(function(err) {
            // offline?
            if (err && err.code === 42) {
                return localKey;
            }
            throw err;
        });
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
    return self._lawnchairDAO.list(DB_PUBLICKEY, 0, null).then(function(allPubkeys) {
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
// Device registration functions
//

/**
 * Set the device's memorable name e.g 'iPhone Work'
 * @param {String}   deviceName The device name
 */
Keychain.prototype.setDeviceName = function(deviceName) {
    if (!deviceName) {
        return new Promise(function() {
            throw new Error('Please set a device name!');
        });
    }
    return this._lawnchairDAO.persist(DB_DEVICENAME, deviceName);
};

/**
 * Get the device' memorable name from local storage. Throws an error if not set
 * @return {String} The device name
 */
Keychain.prototype.getDeviceName = function() {
    // check if deviceName is already persisted in storage
    return this._lawnchairDAO.read(DB_DEVICENAME).then(function(deviceName) {
        if (!deviceName) {
            throw new Error('Device name not set!');
        }
        return deviceName;
    });
};

/**
 * Geneate a device specific key and secret to authenticate to the private key service.
 */
Keychain.prototype.getDeviceSecret = function() {
    var self = this,
        config = self._appConfig.config;

    // generate random deviceSecret or get from storage
    return self._lawnchairDAO.read(DB_DEVICE_SECRET).then(function(storedDevSecret) {
        if (storedDevSecret) {
            // a device key is already available locally
            return storedDevSecret;
        }

        // generate random deviceSecret
        var deviceSecret = util.random(config.symKeySize);
        // persist deviceSecret to local storage (in plaintext)
        return self._lawnchairDAO.persist(DB_DEVICE_SECRET, deviceSecret).then(function() {
            return deviceSecret;
        });
    });
};

/**
 * Register the device on the private key server. This will give the device access to upload an encrypted private key.
 * @param  {String}   options.userId The user's email address
 */
Keychain.prototype.registerDevice = function(options) {
    var self = this,
        devName,
        config = self._appConfig.config;

    // check if deviceName is already persisted in storage
    return self.getDeviceName().then(function(deviceName) {
        return requestDeviceRegistration(deviceName);
    });

    function requestDeviceRegistration(deviceName) {
        devName = deviceName;

        // request device registration session key
        return self._privateKeyDao.requestDeviceRegistration({
            userId: options.userId,
            deviceName: deviceName
        }).then(function(regSessionKey) {
            if (!regSessionKey.encryptedRegSessionKey) {
                throw new Error('Invalid format for session key!');
            }

            return decryptSessionKey(regSessionKey);
        });
    }

    function decryptSessionKey(regSessionKey) {
        return self.lookupPublicKey(config.serverPrivateKeyId).then(function(serverPubkey) {
            if (!serverPubkey || !serverPubkey.publicKey) {
                throw new Error('Server public key for device registration not found!');
            }

            // decrypt the session key
            var ct = regSessionKey.encryptedRegSessionKey;
            return self._pgp.decrypt(ct, serverPubkey.publicKey).then(function(pt) {
                if (!pt.signaturesValid) {
                    throw new Error('Verifying PGP signature failed!');
                }

                return uploadDeviceSecret(pt.decrypted);
            });
        });
    }

    function uploadDeviceSecret(regSessionKey) {
        // generate iv
        var iv = util.random(config.symIvSize);
        // read device secret from local storage
        return self.getDeviceSecret().then(function(deviceSecret) {
            // encrypt deviceSecret
            return self._crypto.encrypt(deviceSecret, regSessionKey, iv);

        }).then(function(encryptedDeviceSecret) {
            // upload encryptedDeviceSecret
            return self._privateKeyDao.uploadDeviceSecret({
                userId: options.userId,
                deviceName: devName,
                encryptedDeviceSecret: encryptedDeviceSecret,
                iv: iv
            });
        });
    }
};

//
// Private key functions
//

/**
 * Authenticate to the private key server (required before private PGP key upload).
 * @param  {String}   userId The user's email address
 * @return {Object} {sessionId:String, sessionKey:[base64 encoded]}
 */
Keychain.prototype._authenticateToPrivateKeyServer = function(userId) {
    var self = this,
        sessionId,
        config = self._appConfig.config;

    // request auth session key required for upload
    return self._privateKeyDao.requestAuthSessionKey({
        userId: userId
    }).then(function(authSessionKey) {
        if (!authSessionKey.encryptedAuthSessionKey || !authSessionKey.encryptedChallenge || !authSessionKey.sessionId) {
            throw new Error('Invalid format for session key!');
        }

        // remember session id for verification
        sessionId = authSessionKey.sessionId;

        return decryptSessionKey(authSessionKey);
    });

    function decryptSessionKey(authSessionKey) {
        var ptSessionKey, ptChallenge, serverPubkey;
        return self.lookupPublicKey(config.serverPrivateKeyId).then(function(pubkey) {
            if (!pubkey || !pubkey.publicKey) {
                throw new Error('Server public key for authentication not found!');
            }

            serverPubkey = pubkey;
            // decrypt the session key
            var ct1 = authSessionKey.encryptedAuthSessionKey;
            return self._pgp.decrypt(ct1, serverPubkey.publicKey);

        }).then(function(pt) {
            if (!pt.signaturesValid) {
                throw new Error('Verifying PGP signature failed!');
            }

            ptSessionKey = pt.decrypted;
            // decrypt the challenge
            var ct2 = authSessionKey.encryptedChallenge;
            return self._pgp.decrypt(ct2, serverPubkey.publicKey);

        }).then(function(pt) {
            if (!pt.signaturesValid) {
                throw new Error('Verifying PGP signature failed!');
            }

            ptChallenge = pt.decrypted;
            return encryptChallenge(ptSessionKey, ptChallenge);
        });
    }

    function encryptChallenge(sessionKey, challenge) {
        var deviceSecret, encryptedChallenge;
        var iv = util.random(config.symIvSize);
        // get device secret
        return self.getDeviceSecret().then(function(secret) {
            deviceSecret = secret;
            // encrypt the challenge
            return self._crypto.encrypt(challenge, sessionKey, iv);

        }).then(function(ct) {
            encryptedChallenge = ct;
            // encrypt the device secret
            return self._crypto.encrypt(deviceSecret, sessionKey, iv);

        }).then(function(encryptedDeviceSecret) {
            return replyChallenge({
                encryptedChallenge: encryptedChallenge,
                encryptedDeviceSecret: encryptedDeviceSecret,
                iv: iv
            }, sessionKey);
        });
    }

    function replyChallenge(response, sessionKey) {
        // respond to challenge by uploading the with the session key encrypted challenge
        return self._privateKeyDao.verifyAuthentication({
            userId: userId,
            sessionId: sessionId,
            encryptedChallenge: response.encryptedChallenge,
            encryptedDeviceSecret: response.encryptedDeviceSecret,
            iv: response.iv
        }).then(function() {
            return {
                sessionId: sessionId,
                sessionKey: sessionKey
            };
        });
    }
};

/**
 * Encrypt and upload the private PGP key to the server.
 * @param  {String}   options.userId   The user's email address
 * @param  {String}   options.code     The randomly generated or self selected code used to derive the key for the encryption of the private PGP key
 */
Keychain.prototype.uploadPrivateKey = function(options) {
    var self = this,
        config = self._appConfig.config,
        keySize = config.symKeySize,
        salt;

    if (!options.userId || !options.code) {
        return new Promise(function() {
            throw new Error('Incomplete arguments!');
        });
    }

    return deriveKey(options.code);

    function deriveKey(code) {
        // generate random salt
        salt = util.random(keySize);
        // derive key from the code using PBKDF2
        return self._crypto.deriveKey(code, salt, keySize).then(function(key) {
            return encryptPrivateKey(key);
        });
    }

    function encryptPrivateKey(encryptionKey) {
        var privkeyId, pgpBlock,
            iv = util.random(config.symIvSize);

        // get private key from local storage
        return self.getUserKeyPair(options.userId).then(function(keypair) {
            privkeyId = keypair.privateKey._id;
            pgpBlock = keypair.privateKey.encryptedKey;

            // encrypt the private key with the derived key
            return self._crypto.encrypt(pgpBlock, encryptionKey, iv);

        }).then(function(ct) {
            return uploadPrivateKey({
                _id: privkeyId,
                userId: options.userId,
                encryptedPrivateKey: ct,
                salt: salt,
                iv: iv
            });
        });
    }

    function uploadPrivateKey(payload) {
        var pt = payload.encryptedPrivateKey,
            iv = payload.iv;

        // authenticate to server for upload
        return self._authenticateToPrivateKeyServer(options.userId).then(function(authSessionKey) {
            // set sessionId
            payload.sessionId = authSessionKey.sessionId;
            // encrypt encryptedPrivateKey again using authSessionKey
            var key = authSessionKey.sessionKey;
            return self._crypto.encrypt(pt, key, iv);

        }).then(function(ct) {
            // replace the encryptedPrivateKey with the double wrapped ciphertext
            payload.encryptedPrivateKey = ct;
            // upload the encrypted priavet key
            return self._privateKeyDao.upload(payload);
        });
    }
};

/**
 * Request downloading the user's encrypted private key. This will initiate the server to send the recovery token via email/sms to the user.
 * @param  {String}   options.userId    The user's email address
 * @param  {String}   options.keyId     The private PGP key id
 */
Keychain.prototype.requestPrivateKeyDownload = function(options) {
    return this._privateKeyDao.requestDownload(options);
};

/**
 * Query if an encrypted private PGP key exists on the server without initializing the recovery procedure
 * @param  {String}   options.userId    The user's email address
 * @param  {String}   options.keyId     The private PGP key id
 */
Keychain.prototype.hasPrivateKey = function(options) {
    return this._privateKeyDao.hasPrivateKey(options);
};

/**
 * Download the encrypted private PGP key from the server using the recovery token.
 * @param  {String}   options.userId The user's email address
 * @param  {String}   options.keyId The user's email address
 * @param  {String}   options.recoveryToken The recovery token acquired via email/sms from the key server
 */
Keychain.prototype.downloadPrivateKey = function(options) {
    return this._privateKeyDao.download(options);
};

/**
 * This is called after the encrypted private key has successfully been downloaded and it's ready to be decrypted and stored in localstorage.
 * @param  {String}   options._id The private PGP key id
 * @param  {String}   options.userId The user's email address
 * @param  {String}   options.code The randomly generated or self selected code used to derive the key for the decryption of the private PGP key
 * @param  {String}   options.encryptedPrivateKey The encrypted private PGP key
 * @param  {String}   options.salt The salt required to derive the code derived key
 * @param  {String}   options.iv The iv used to encrypt the private PGP key
 */
Keychain.prototype.decryptAndStorePrivateKeyLocally = function(options) {
    var self = this,
        code = options.code,
        salt = options.salt,
        config = self._appConfig.config,
        keySize = config.symKeySize;

    if (!options._id || !options.userId || !options.code || !options.salt || !options.encryptedPrivateKey || !options.iv) {
        return new Promise(function() {
            throw new Error('Incomplete arguments!');
        });
    }

    // derive key from the code and the salt using PBKDF2
    return self._crypto.deriveKey(code, salt, keySize).then(function(key) {
        return decryptAndStore(key);
    });

    function decryptAndStore(derivedKey) {
        // decrypt the private key with the derived key
        var ct = options.encryptedPrivateKey,
            iv = options.iv;

        return self._crypto.decrypt(ct, derivedKey, iv).then(function(privateKeyArmored) {
            // validate pgp key
            var keyParams;
            try {
                keyParams = self._pgp.getKeyParams(privateKeyArmored);
            } catch (e) {
                throw new Error('Error parsing private PGP key!');
            }

            if (keyParams._id !== options._id || keyParams.userId !== options.userId) {
                throw new Error('Private key parameters don\'t match with public key\'s!');
            }

            var keyObject = {
                _id: options._id,
                userId: options.userId,
                encryptedKey: privateKeyArmored
            };

            // store private key locally
            return self.saveLocalPrivateKey(keyObject).then(function() {
                return keyObject;
            });

        }).catch(function() {
            throw new Error('Invalid keychain code!');
        });
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
    return self._lawnchairDAO.list(DB_PUBLICKEY, 0, null).then(function(allPubkeys) {
        var pubkey = _.findWhere(allPubkeys, {
            userId: userId
        });

        if (pubkey && pubkey._id) {
            // that user's public key is already in local storage...
            // sync keypair to the cloud
            return syncKeypair(pubkey._id);
        }

        // no public key by that user id in storage
        // find from cloud by email address
        return self._publicKeyDao.getByUserId(userId).then(function(cloudPubkey) {
            if (cloudPubkey && cloudPubkey._id) {
                // there is a public key for that user already in the cloud...
                // sync keypair to local storage
                return syncKeypair(cloudPubkey._id);
            }

            // continue without keypair... generate in crypto.js
        });
    });

    function syncKeypair(keypairId) {
        var savedPubkey, savedPrivkey;
        // persist key pair in local storage
        return self.lookupPublicKey(keypairId).then(function(pub) {
            savedPubkey = pub;
            // persist private key in local storage
            return self.lookupPrivateKey(keypairId).then(function(priv) {
                savedPrivkey = priv;
            });

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
            throw new Error('Incorrect input!');
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
    return this._lawnchairDAO.list(DB_PUBLICKEY, 0, null);
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