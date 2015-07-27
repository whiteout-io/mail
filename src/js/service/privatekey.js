'use strict';

var ngModule = angular.module('woServices');
ngModule.service('privateKey', PrivateKey);
module.exports = PrivateKey;

var ImapClient = require('imap-client');
var util = require('crypto-lib').util;

var IMAP_KEYS_FOLDER = 'openpgp_keys';
var MIME_TYPE = 'application/x.encrypted-pgp-key';
var MSG_PART_TYPE_ATTACHMENT = 'attachment';

function PrivateKey(auth, mailbuild, mailreader, appConfig, pgp, crypto, axe) {
    this._auth = auth;
    this._Mailbuild = mailbuild;
    this._mailreader = mailreader;
    this._appConfig = appConfig;
    this._pgp = pgp;
    this._crypto = crypto;
    this._axe = axe;
}

/**
 * Configure the local imap client used for key-sync with credentials from the auth module.
 */
PrivateKey.prototype.init = function() {
    var self = this;

    return self._auth.getCredentials().then(function(credentials) {
        // tls socket worker path for multithreaded tls in non-native tls environments
        credentials.imap.tlsWorkerPath = self._appConfig.config.workerPath + '/tcp-socket-tls-worker.min.js';
        self._imap = new ImapClient(credentials.imap);
        self._imap.onError = self._axe.error;
        // login to the imap server
        return self._imap.login();
    });
};

/**
 * Cleanup by logging out of the imap client.
 */
PrivateKey.prototype.destroy = function() {
    this._imap.logout();
    // don't wait for logout to complete
    return new Promise(function(resolve) {
        resolve();
    });
};

/**
 * Encrypt and upload the private PGP key to the server.
 * @param  {String}   code     The randomly generated or self selected code used to derive the key for the encryption of the private PGP key
 */
PrivateKey.prototype.encrypt = function(code) {
    var self = this,
        config = self._appConfig.config,
        keySize = config.symKeySize,
        encryptionKey, salt, iv, privkeyId;

    if (!code) {
        return new Promise(function() {
            throw new Error('Incomplete arguments!');
        });
    }

    // generate random salt and iv
    salt = util.random(keySize);
    iv = util.random(config.symIvSize);

    // derive key from the code using PBKDF2
    return self._crypto.deriveKey(code, salt, keySize).then(function(key) {
        encryptionKey = key;

        // get private key from local storage
        return self._pgp.exportKeys();
    }).then(function(keypair) {
        privkeyId = keypair.keyId;

        // encrypt the private key with the derived key
        return self._crypto.encrypt(keypair.privateKeyArmored, encryptionKey, iv);

    }).then(function(ct) {
        return {
            _id: privkeyId,
            encryptedPrivateKey: ct,
            salt: salt,
            iv: iv
        };
    });
};

/**
 * Upload the encrypted private PGP key.
 * @param  {String}   options._id                   The hex encoded capital 16 char key id
 * @param  {String}   options.userId                The user's email address
 * @param  {String}   options.encryptedPrivateKey   The base64 encoded encrypted private PGP key
 */
PrivateKey.prototype.upload = function(options) {
    var self = this,
        path;

    return new Promise(function(resolve) {
        if (!options._id || !options.userId || !options.encryptedPrivateKey || !options.salt || !options.iv) {
            throw new Error('Incomplete arguments for key upload!');
        }
        resolve();

    }).then(function() {

        // Some servers (Exchange, Cyrus) error when creating an existing IMAP mailbox instead of
        // responding with ALREADYEXISTS. Hence we search for the folder before uploading.

        self._axe.debug('Searching imap folder for key upload...');

        return self._getFolder().then(function(fullPath) {
            path = fullPath;
        }).catch(function() {

            // create imap folder
            self._axe.debug('Folder not found, creating imap folder.');
            return self._imap.createFolder({
                path: IMAP_KEYS_FOLDER
            }).then(function(fullPath) {
                path = fullPath;
                self._axe.debug('Successfully created imap folder ' + path);
            }).catch(function(err) {
                var prettyErr = new Error('Creating imap folder ' + IMAP_KEYS_FOLDER + ' failed: ' + err.message);
                self._axe.error(prettyErr);
                throw prettyErr;
            });
        });

    }).then(createMessage).then(function(message) {

        // upload to imap folder
        self._axe.debug('Uploading key...');
        return self._imap.uploadMessage({
            path: path,
            message: message
        });
    });

    function createMessage() {
        var encryptedKeyBuf = util.binStr2Uint8Arr(util.base642Str(options.encryptedPrivateKey));
        var saltBuf = util.binStr2Uint8Arr(util.base642Str(options.salt));
        var ivBuf = util.binStr2Uint8Arr(util.base642Str(options.iv));

        // allocate payload buffer for sync
        var payloadBuf = new Uint8Array(1 + saltBuf.length + ivBuf.length + encryptedKeyBuf.length);
        var offset = 0;
        // set version byte
        payloadBuf[offset] = 0x01; // version 1 of the key-sync protocol
        offset++;
        // copy salt bytes
        payloadBuf.set(saltBuf, offset);
        offset += saltBuf.length;
        // copy iv bytes
        payloadBuf.set(ivBuf, offset);
        offset += ivBuf.length;
        // copy encrypted key bytes
        payloadBuf.set(encryptedKeyBuf, offset);

        // create MIME tree
        var rootNode = options.rootNode || new self._Mailbuild();
        rootNode.setHeader({
            subject: options._id,
            from: options.userId,
            to: options.userId,
            'content-type': MIME_TYPE + '; charset=us-ascii',
            'content-transfer-encoding': 'base64'
        });
        rootNode.setContent(payloadBuf);

        return rootNode.build();
    }
};

/**
 * Check if matching private key is stored in IMAP.
 */
PrivateKey.prototype.isSynced = function() {
    var self = this;

    return self._getFolder().then(function(path) {
        return self._fetchMessage({
            keyId: self._pgp.getKeyId(),
            path: path
        });
    }).then(function(msg) {
        return !!msg;
    }).catch(function() {
        return false;
    });
};

/**
 * Verify the download request for the private PGP key.
 * @param  {String}   options.userId The user's email address
 * @param  {String}   options.keyId The private key id
 * @return {Object} {_id:[hex encoded capital 16 char key id], encryptedPrivateKey:[base64 encoded], encryptedUserId: [base64 encoded]}
 */
PrivateKey.prototype.download = function(options) {
    var self = this,
        path, message;

    return self._getFolder().then(function(fullPath) {
        path = fullPath;
        return self._fetchMessage({
            keyId: options.keyId,
            path: path
        }).then(function(msg) {
            if (!msg) {
                throw new Error('Private key not synced!');
            }

            message = msg;
        });
    }).then(function() {
        // get the body for the message
        return self._imap.getBodyParts({
            path: path,
            uid: message.uid,
            bodyParts: message.bodyParts
        });

    }).then(function() {
        // parse the message
        return self._parse(message);

    }).then(function(root) {
        var payloadBuf = filterBodyParts(root, MSG_PART_TYPE_ATTACHMENT)[0].content;
        var offset = 0;
        var SALT_LEN = 32;
        var IV_LEN = 12;

        // check version
        var version = payloadBuf[offset];
        offset++;
        if (version !== 1) {
            throw new Error('Unsupported key sync protocol version!');
        }
        // salt
        var saltBuf = payloadBuf.subarray(offset, offset + SALT_LEN);
        offset += SALT_LEN;
        // iv
        var ivBuf = payloadBuf.subarray(offset, offset + IV_LEN);
        offset += IV_LEN;
        // encrypted private key
        var encryptedKeyBuf = payloadBuf.subarray(offset, payloadBuf.length);

        return {
            _id: options.keyId,
            userId: options.userId,
            encryptedPrivateKey: util.str2Base64(util.uint8Arr2BinStr(encryptedKeyBuf)),
            salt: util.str2Base64(util.uint8Arr2BinStr(saltBuf)),
            iv: util.str2Base64(util.uint8Arr2BinStr(ivBuf))
        };
    });
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
PrivateKey.prototype.decrypt = function(options) {
    var self = this,
        config = self._appConfig.config,
        keySize = config.symKeySize;

    if (!options._id || !options.userId || !options.code || !options.salt || !options.encryptedPrivateKey || !options.iv) {
        return new Promise(function() {
            throw new Error('Incomplete arguments!');
        });
    }

    // derive key from the code and the salt using PBKDF2
    return self._crypto.deriveKey(options.code, options.salt, keySize).then(function(derivedKey) {
        // decrypt the private key with the derived key
        return self._crypto.decrypt(options.encryptedPrivateKey, derivedKey, options.iv).catch(function() {
            throw new Error('Invalid backup code!');
        });

    }).then(function(privateKeyArmored) {
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

        return {
            _id: options._id,
            userId: options.userId,
            encryptedKey: privateKeyArmored
        };
    });
};

PrivateKey.prototype._getFolder = function() {
    var self = this;

    return self._imap.listWellKnownFolders().then(function(wellKnownFolders) {
        var paths = []; // gathers paths

        // extract the paths from the folder arrays
        for (var folderType in wellKnownFolders) {
            if (wellKnownFolders.hasOwnProperty(folderType) && Array.isArray(wellKnownFolders[folderType])) {
                paths = paths.concat(_.pluck(wellKnownFolders[folderType], 'path'));
            }
        }

        paths = paths.filter(function(path) {
            // find a folder that ends with IMAP_KEYS_FOLDER
            var lastIndex = path.lastIndexOf(IMAP_KEYS_FOLDER);
            return (lastIndex !== -1) && (lastIndex + IMAP_KEYS_FOLDER.length === path.length);
        });

        if (paths.length > 1) {
            self._axe.warn('Multiple folders matching path ' + IMAP_KEYS_FOLDER + ' found, PGP key target folder unclear. Picking first one: ' + paths.join(', '));
        }

        if (paths.length === 0) {
            throw new Error('Imap folder ' + IMAP_KEYS_FOLDER + ' does not exist for key sync!');
        }

        return paths[0];
    });
};

PrivateKey.prototype._fetchMessage = function(options) {
    var self = this;

    if (!options.keyId) {
        return new Promise(function() {
            throw new Error('Incomplete arguments!');
        });
    }

    // get the metadata for the message
    return self._imap.listMessages({
        path: options.path
    }).then(function(messages) {
        if (!messages.length) {
            // message has been deleted in the meantime
            return;
        }

        // get matching private key if multiple keys uloaded
        return _.findWhere(messages, {
            subject: options.keyId
        });
    }).catch(function(e) {
        throw new Error('Failed to retrieve PGP key message from IMAP! Reason: ' + e.message);
    });
};

PrivateKey.prototype._parse = function(options) {
    var self = this;
    return new Promise(function(resolve, reject) {
        self._mailreader.parse(options, function(err, root) {
            if (err) {
                reject(err);
            } else {
                resolve(root);
            }
        });
    });
};

/**
 * Helper function that recursively traverses the body parts tree. Looks for bodyParts that match the provided type and aggregates them
 *
 * @param {Array} bodyParts The bodyParts array
 * @param {String} type The type to look up
 * @param {undefined} result Leave undefined, only used for recursion
 */
function filterBodyParts(bodyParts, type, result) {
    result = result || [];
    bodyParts.forEach(function(part) {
        if (part.type === type) {
            result.push(part);
        } else if (Array.isArray(part.content)) {
            filterBodyParts(part.content, type, result);
        }
    });
    return result;
}