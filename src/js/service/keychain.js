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
 * @param {Function} callback(error) Callback with an optional error object when the verification is done. If the was an error, the error object contains the information for it.
 */
Keychain.prototype.verifyPublicKey = function(uuid, callback) {
    this._publicKeyDao.verify(uuid, callback);
};

/**
 * Get an array of public keys by looking in local storage and
 * fetching missing keys from the cloud service.
 * @param ids [Array] the key ids as [{_id, userId}]
 * @return [PublicKeyCollection] The requiested public keys
 */
Keychain.prototype.getPublicKeys = function(ids, callback) {
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
 * @param {String} options.userId The user id (email address) for which to check the key
 * @param {String} options.overridePermission (optional) Indicates if the update should happen automatically (true) or with the user being queried (false). Defaults to false
 * @param {Function} callback(error, key) Invoked when the key has been updated or an error occurred
 */
Keychain.prototype.refreshKeyForUserId = function(options, callback) {
    var self = this,
        userId = options.userId,
        overridePermission = options.overridePermission;

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
            if (overridePermission) {
                // don't query the user, update the public key right away
                onPermissionReceived(true);
            } else {
                // query the user if the public key should be updated
                self.requestPermissionForKeyUpdate({
                    userId: userId,
                    newKey: newKey
                }, onPermissionReceived);
            }

            function onPermissionReceived(granted) {
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
            }
        });
    }
};

/**
 * Look up a reveiver's public key by user id
 * @param userId [String] the receiver's email address
 */
Keychain.prototype.getReceiverPublicKey = function(userId, callback) {
    var self = this;

    // search local keyring for public key
    self._lawnchairDAO.list(DB_PUBLICKEY, 0, null, function(err, allPubkeys) {
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
Keychain.prototype.setDeviceName = function(deviceName, callback) {
    if (!deviceName) {
        callback(new Error('Please set a device name!'));
        return;
    }

    this._lawnchairDAO.persist(DB_DEVICENAME, deviceName, callback);
};

/**
 * Get the device' memorable name from local storage. Throws an error if not set
 * @param  {Function} callback(error, deviceName)
 * @return {String} The device name
 */
Keychain.prototype.getDeviceName = function(callback) {
    // check if deviceName is already persisted in storage
    this._lawnchairDAO.read(DB_DEVICENAME, function(err, deviceName) {
        if (err) {
            callback(err);
            return;
        }

        if (!deviceName) {
            callback(new Error('Device name not set!'));
            return;
        }

        callback(null, deviceName);
    });
};

/**
 * Geneate a device specific key and secret to authenticate to the private key service.
 * @param {Function} callback(error, deviceSecret:[base64 encoded string])
 */
Keychain.prototype.getDeviceSecret = function(callback) {
    var self = this,
        config = self._appConfig.config;

    // generate random deviceSecret or get from storage
    self._lawnchairDAO.read(DB_DEVICE_SECRET, function(err, storedDevSecret) {
        if (err) {
            callback(err);
            return;
        }

        if (storedDevSecret) {
            // a device key is already available locally
            callback(null, storedDevSecret);
            return;
        }

        // generate random deviceSecret
        var deviceSecret = util.random(config.symKeySize);
        // persist deviceSecret to local storage (in plaintext)
        self._lawnchairDAO.persist(DB_DEVICE_SECRET, deviceSecret, function(err) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, deviceSecret);
        });
    });
};

/**
 * Register the device on the private key server. This will give the device access to upload an encrypted private key.
 * @param  {String}   options.userId The user's email address
 * @param  {Function} callback(error)
 */
Keychain.prototype.registerDevice = function(options, callback) {
    var self = this,
        devName,
        config = self._appConfig.config;

    // check if deviceName is already persisted in storage
    self.getDeviceName(function(err, deviceName) {
        if (err) {
            callback(err);
            return;
        }

        requestDeviceRegistration(deviceName);
    });

    function requestDeviceRegistration(deviceName) {
        devName = deviceName;

        // request device registration session key
        self._privateKeyDao.requestDeviceRegistration({
            userId: options.userId,
            deviceName: deviceName
        }, function(err, regSessionKey) {
            if (err) {
                callback(err);
                return;
            }

            if (!regSessionKey.encryptedRegSessionKey) {
                callback(new Error('Invalid format for session key!'));
                return;
            }

            decryptSessionKey(regSessionKey);
        });
    }

    function decryptSessionKey(regSessionKey) {
        self.lookupPublicKey(config.serverPrivateKeyId, function(err, serverPubkey) {
            if (err) {
                callback(err);
                return;
            }

            if (!serverPubkey || !serverPubkey.publicKey) {
                callback(new Error('Server public key for device registration not found!'));
                return;
            }

            // decrypt the session key
            var ct = regSessionKey.encryptedRegSessionKey;
            self._pgp.decrypt(ct, serverPubkey.publicKey, function(err, decrypedSessionKey, signaturesValid) {
                if (err || !signaturesValid) {
                    return callback(err || new Error('Verifying PGP signature failed!'));
                }

                uploadDeviceSecret(decrypedSessionKey);
            });
        });
    }

    function uploadDeviceSecret(regSessionKey) {
        // read device secret from local storage
        self.getDeviceSecret(function(err, deviceSecret) {
            if (err) {
                callback(err);
                return;
            }

            // generate iv
            var iv = util.random(config.symIvSize);
            // encrypt deviceSecret
            self._crypto.encrypt(deviceSecret, regSessionKey, iv, function(err, encryptedDeviceSecret) {
                if (err) {
                    callback(err);
                    return;
                }

                // upload encryptedDeviceSecret
                self._privateKeyDao.uploadDeviceSecret({
                    userId: options.userId,
                    deviceName: devName,
                    encryptedDeviceSecret: encryptedDeviceSecret,
                    iv: iv
                }, callback);
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
 * @param  {Function} callback(error, authSessionKey)
 * @return {Object} {sessionId:String, sessionKey:[base64 encoded]}
 */
Keychain.prototype._authenticateToPrivateKeyServer = function(userId, callback) {
    var self = this,
        sessionId,
        config = self._appConfig.config;

    // request auth session key required for upload
    self._privateKeyDao.requestAuthSessionKey({
        userId: userId
    }, function(err, authSessionKey) {
        if (err) {
            callback(err);
            return;
        }

        if (!authSessionKey.encryptedAuthSessionKey || !authSessionKey.encryptedChallenge || !authSessionKey.sessionId) {
            callback(new Error('Invalid format for session key!'));
            return;
        }

        // remember session id for verification
        sessionId = authSessionKey.sessionId;

        decryptSessionKey(authSessionKey);
    });

    function decryptSessionKey(authSessionKey) {
        self.lookupPublicKey(config.serverPrivateKeyId, function(err, serverPubkey) {
            if (err) {
                callback(err);
                return;
            }

            if (!serverPubkey || !serverPubkey.publicKey) {
                callback(new Error('Server public key for authentication not found!'));
                return;
            }

            // decrypt the session key
            var ct1 = authSessionKey.encryptedAuthSessionKey;
            self._pgp.decrypt(ct1, serverPubkey.publicKey, function(err, decryptedSessionKey, signaturesValid) {
                if (err || !signaturesValid) {
                    return callback(err || new Error('Verifying PGP signature failed!'));
                }

                // decrypt the challenge
                var ct2 = authSessionKey.encryptedChallenge;
                self._pgp.decrypt(ct2, serverPubkey.publicKey, function(err, decryptedChallenge, signaturesValid) {
                    if (err || !signaturesValid) {
                        return callback(err || new Error('Verifying PGP signature failed!'));
                    }

                    encryptChallenge(decryptedSessionKey, decryptedChallenge);
                });
            });
        });
    }

    function encryptChallenge(sessionKey, challenge) {
        // get device secret
        self.getDeviceSecret(function(err, deviceSecret) {
            if (err) {
                callback(err);
                return;
            }

            var iv = util.random(config.symIvSize);
            // encrypt the challenge
            self._crypto.encrypt(challenge, sessionKey, iv, function(err, encryptedChallenge) {
                if (err) {
                    callback(err);
                    return;
                }

                // encrypt the device secret
                self._crypto.encrypt(deviceSecret, sessionKey, iv, function(err, encryptedDeviceSecret) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    replyChallenge({
                        encryptedChallenge: encryptedChallenge,
                        encryptedDeviceSecret: encryptedDeviceSecret,
                        iv: iv
                    }, sessionKey);
                });
            });
        });
    }

    function replyChallenge(response, sessionKey) {
        // respond to challenge by uploading the with the session key encrypted challenge
        self._privateKeyDao.verifyAuthentication({
            userId: userId,
            sessionId: sessionId,
            encryptedChallenge: response.encryptedChallenge,
            encryptedDeviceSecret: response.encryptedDeviceSecret,
            iv: response.iv
        }, function(err) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, {
                sessionId: sessionId,
                sessionKey: sessionKey
            });
        });
    }
};

/**
 * Encrypt and upload the private PGP key to the server.
 * @param  {String}   options.userId   The user's email address
 * @param  {String}   options.code     The randomly generated or self selected code used to derive the key for the encryption of the private PGP key
 * @param  {Function} callback(error)
 */
Keychain.prototype.uploadPrivateKey = function(options, callback) {
    var self = this,
        config = self._appConfig.config,
        keySize = config.symKeySize,
        salt;

    if (!options.userId || !options.code) {
        callback(new Error('Incomplete arguments!'));
        return;
    }

    deriveKey(options.code);

    function deriveKey(code) {
        // generate random salt
        salt = util.random(keySize);
        // derive key from the code using PBKDF2
        self._crypto.deriveKey(code, salt, keySize, function(err, key) {
            if (err) {
                callback(err);
                return;
            }

            encryptPrivateKey(key);
        });
    }

    function encryptPrivateKey(encryptionKey) {
        // get private key from local storage
        self.getUserKeyPair(options.userId, function(err, keypair) {
            if (err) {
                callback(err);
                return;
            }

            var privkeyId = keypair.privateKey._id,
                pgpBlock = keypair.privateKey.encryptedKey;

            // encrypt the private key with the derived key
            var iv = util.random(config.symIvSize);
            self._crypto.encrypt(pgpBlock, encryptionKey, iv, function(err, ct) {
                if (err) {
                    callback(err);
                    return;
                }

                var payload = {
                    _id: privkeyId,
                    userId: options.userId,
                    encryptedPrivateKey: ct,
                    salt: salt,
                    iv: iv
                };

                uploadPrivateKey(payload);
            });
        });
    }

    function uploadPrivateKey(payload) {
        // authenticate to server for upload
        self._authenticateToPrivateKeyServer(options.userId, function(err, authSessionKey) {
            if (err) {
                callback(err);
                return;
            }

            // encrypt encryptedPrivateKey again using authSessionKey
            var pt = payload.encryptedPrivateKey,
                iv = payload.iv,
                key = authSessionKey.sessionKey;
            self._crypto.encrypt(pt, key, iv, function(err, ct) {
                if (err) {
                    callback(err);
                    return;
                }

                // replace the encryptedPrivateKey with the double wrapped ciphertext
                payload.encryptedPrivateKey = ct;
                // set sessionId
                payload.sessionId = authSessionKey.sessionId;

                // upload the encrypted priavet key
                self._privateKeyDao.upload(payload, callback);
            });
        });
    }
};

/**
 * Request downloading the user's encrypted private key. This will initiate the server to send the recovery token via email/sms to the user.
 * @param  {String}   options.userId    The user's email address
 * @param  {String}   options.keyId     The private PGP key id
 * @param  {Function} callback(error)
 */
Keychain.prototype.requestPrivateKeyDownload = function(options, callback) {
    this._privateKeyDao.requestDownload(options, callback);
};

/**
 * Query if an encrypted private PGP key exists on the server without initializing the recovery procedure
 * @param  {String}   options.userId    The user's email address
 * @param  {String}   options.keyId     The private PGP key id
 * @param  {Function} callback(error)
 */
Keychain.prototype.hasPrivateKey = function(options, callback) {
    this._privateKeyDao.hasPrivateKey(options, callback);
};

/**
 * Download the encrypted private PGP key from the server using the recovery token.
 * @param  {String}   options.userId The user's email address
 * @param  {String}   options.keyId The user's email address
 * @param  {String}   options.recoveryToken The recovery token acquired via email/sms from the key server
 * @param  {Function} callback(error, encryptedPrivateKey)
 */
Keychain.prototype.downloadPrivateKey = function(options, callback) {
    this._privateKeyDao.download(options, callback);
};

/**
 * This is called after the encrypted private key has successfully been downloaded and it's ready to be decrypted and stored in localstorage.
 * @param  {String}   options._id The private PGP key id
 * @param  {String}   options.userId The user's email address
 * @param  {String}   options.code The randomly generated or self selected code used to derive the key for the decryption of the private PGP key
 * @param  {String}   options.encryptedPrivateKey The encrypted private PGP key
 * @param  {String}   options.salt The salt required to derive the code derived key
 * @param  {String}   options.iv The iv used to encrypt the private PGP key
 * @param  {Function} callback(error, keyObject)
 */
Keychain.prototype.decryptAndStorePrivateKeyLocally = function(options, callback) {
    var self = this,
        code = options.code,
        salt = options.salt,
        config = self._appConfig.config,
        keySize = config.symKeySize;

    if (!options._id || !options.userId || !options.code || !options.salt || !options.encryptedPrivateKey || !options.iv) {
        callback(new Error('Incomplete arguments!'));
        return;
    }

    // derive key from the code and the salt using PBKDF2
    self._crypto.deriveKey(code, salt, keySize, function(err, key) {
        if (err) {
            callback(err);
            return;
        }

        decryptAndStore(key);
    });

    function decryptAndStore(derivedKey) {
        // decrypt the private key with the derived key
        var ct = options.encryptedPrivateKey,
            iv = options.iv;

        self._crypto.decrypt(ct, derivedKey, iv, function(err, privateKeyArmored) {
            if (err) {
                callback(new Error('Invalid keychain code!'));
                return;
            }

            // validate pgp key
            var keyParams;
            try {
                keyParams = self._pgp.getKeyParams(privateKeyArmored);
            } catch (e) {
                callback(new Error('Error parsing private PGP key!'));
                return;
            }

            if (keyParams._id !== options._id || keyParams.userId !== options.userId) {
                callback(new Error('Private key parameters don\'t match with public key\'s!'));
                return;
            }

            var keyObject = {
                _id: options._id,
                userId: options.userId,
                encryptedKey: privateKeyArmored
            };

            // store private key locally
            self.saveLocalPrivateKey(keyObject, function(err) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, keyObject);
            });
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
Keychain.prototype.getUserKeyPair = function(userId, callback) {
    var self = this;

    // search for user's public key locally
    self._lawnchairDAO.list(DB_PUBLICKEY, 0, null, function(err, allPubkeys) {
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
Keychain.prototype.putUserKeyPair = function(keypair, callback) {
    var self = this;

    // validate input
    if (!keypair || !keypair.publicKey || !keypair.privateKey || !keypair.publicKey.userId || keypair.publicKey.userId !== keypair.privateKey.userId) {
        callback({
            errMsg: 'Incorrect input!'
        });
        return;
    }

    // don't check the user's own public key for deletion in refreshKeyForUserId
    keypair.publicKey.imported = true;

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

Keychain.prototype.lookupPublicKey = function(id, callback) {
    var self = this;

    if (!id) {
        callback({
            errMsg: 'ID must be set for public key query!'
        });
        return;
    }

    // lookup in local storage
    self._lawnchairDAO.read(DB_PUBLICKEY + '_' + id, function(err, pubkey) {
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
Keychain.prototype.listLocalPublicKeys = function(callback) {
    // search local keyring for public key
    this._lawnchairDAO.list(DB_PUBLICKEY, 0, null, callback);
};

Keychain.prototype.removeLocalPublicKey = function(id, callback) {
    this._lawnchairDAO.remove(DB_PUBLICKEY + '_' + id, callback);
};

Keychain.prototype.lookupPrivateKey = function(id, callback) {
    // lookup in local storage
    this._lawnchairDAO.read(DB_PRIVATEKEY + '_' + id, callback);
};

Keychain.prototype.saveLocalPublicKey = function(pubkey, callback) {
    // persist public key (email, _id)
    var pkLookupKey = DB_PUBLICKEY + '_' + pubkey._id;
    this._lawnchairDAO.persist(pkLookupKey, pubkey, callback);
};

Keychain.prototype.saveLocalPrivateKey = function(privkey, callback) {
    // persist private key (email, _id)
    var prkLookupKey = DB_PRIVATEKEY + '_' + privkey._id;
    this._lawnchairDAO.persist(prkLookupKey, privkey, callback);
};