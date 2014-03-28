define(function(require) {
    'use strict';

    var util = require('cryptoLib/util'),
        _ = require('underscore'),
        str = require('js/app-config').string;

    var EmailDAO = function(keychain, crypto, devicestorage, pgpbuilder, mailreader, emailSync) {
        this._keychain = keychain;
        this._crypto = crypto;
        this._devicestorage = devicestorage;
        this._pgpbuilder = pgpbuilder;
        this._mailreader = mailreader;
        this._emailSync = emailSync;
    };

    //
    // External API
    //

    EmailDAO.prototype.init = function(options, callback) {
        var self = this,
            keypair;

        self._account = options.account;
        self._account.busy = false;
        self._account.online = false;

        // validate email address
        var emailAddress = self._account.emailAddress;
        if (!util.validateEmailAddress(emailAddress)) {
            callback({
                errMsg: 'The user email address must be specified!'
            });
            return;
        }

        // init keychain and then crypto module
        initKeychain();

        function initKeychain() {
            // call getUserKeyPair to read/sync keypair with devicestorage/cloud
            self._keychain.getUserKeyPair(emailAddress, function(err, storedKeypair) {
                if (err) {
                    callback(err);
                    return;
                }

                keypair = storedKeypair;
                initEmailSync();
            });
        }

        function initEmailSync() {
            self._emailSync.init({
                account: self._account
            }, function(err) {
                if (err) {
                    callback(err);
                    return;
                }

                initFolders();
            });
        }

        function initFolders() {
            // try init folders from memory, since imap client not initiated yet
            self._imapListFolders(function(err, folders) {
                // dont handle offline case this time
                if (err && err.code !== 42) {
                    callback(err);
                    return;
                }

                // if empty (first time login) use dummy folders ... overwritten in onConnect
                self._account.folders = (folders) ? folders : [{
                    type: 'Inbox',
                    path: 'INBOX'
                }, {
                    type: 'Sent',
                    path: 'SENT'
                }, {
                    type: 'Outbox',
                    path: 'OUTBOX'
                }, {
                    type: 'Drafts',
                    path: 'DRAFTS'
                }, {
                    type: 'Trash',
                    path: 'TRASH'
                }];

                callback(null, keypair);
            });
        }
    };

    EmailDAO.prototype.onConnect = function(options, callback) {
        var self = this;

        self._imapClient = options.imapClient;
        self._pgpMailer = options.pgpMailer;

        // delegation-esque pattern to mitigate between node-style events and plain js
        self._imapClient.onIncomingMessage = function(message) {
            if (typeof self.onIncomingMessage === 'function') {
                self.onIncomingMessage(message);
            }
        };

        // notify emailSync
        self._emailSync.onConnect({
            imapClient: self._imapClient
        }, function(err) {
            if (err) {
                callback(err);
                return;
            }

            // connect to newly created imap client
            self._imapLogin(onLogin);
        });

        function onLogin(err) {
            if (err) {
                callback(err);
                return;
            }

            // set status to online
            self._account.online = true;

            // init folders
            self._imapListFolders(function(err, folders) {
                if (err) {
                    callback(err);
                    return;
                }

                self._account.folders = folders;

                callback();
            });
        }
    };

    EmailDAO.prototype.onDisconnect = function(options, callback) {
        // set status to online
        this._account.online = false;
        this._imapClient = undefined;
        this._pgpMailer = undefined;

        // notify emailSync
        this._emailSync.onDisconnect(null, callback);
    };

    EmailDAO.prototype.unlock = function(options, callback) {
        var self = this;

        if (options.keypair) {
            // import existing key pair into crypto module
            handleExistingKeypair(options.keypair);
            return;
        }

        // no keypair for is stored for the user... generate a new one
        self._crypto.generateKeys({
            emailAddress: self._account.emailAddress,
            keySize: self._account.asymKeySize,
            passphrase: options.passphrase
        }, function(err, generatedKeypair) {
            if (err) {
                callback(err);
                return;
            }

            handleGenerated(generatedKeypair);
        });

        function handleExistingKeypair(keypair) {
            var pubUserID, privUserID;

            // check if key IDs match
            if (!keypair.privateKey._id || keypair.privateKey._id !== keypair.publicKey._id) {
                callback({
                    errMsg: 'Key IDs dont match!'
                });
                return;
            }

            // check if the key's user ID matches the current account
            pubUserID = self._crypto.getKeyParams(keypair.publicKey.publicKey).userId;
            privUserID = self._crypto.getKeyParams(keypair.privateKey.encryptedKey).userId;
            if (pubUserID.indexOf(self._account.emailAddress) === -1 || privUserID.indexOf(self._account.emailAddress) === -1) {
                callback({
                    errMsg: 'User IDs dont match!'
                });
                return;
            }

            // import existing key pair into crypto module
            self._crypto.importKeys({
                passphrase: options.passphrase,
                privateKeyArmored: keypair.privateKey.encryptedKey,
                publicKeyArmored: keypair.publicKey.publicKey
            }, function(err) {
                if (err) {
                    callback(err);
                    return;
                }

                // set decrypted privateKey to pgpMailer
                self._pgpbuilder._privateKey = self._crypto._privateKey;
                callback();
            });
        }

        function handleGenerated(generatedKeypair) {
            // import the new key pair into crypto module
            self._crypto.importKeys({
                passphrase: options.passphrase,
                privateKeyArmored: generatedKeypair.privateKeyArmored,
                publicKeyArmored: generatedKeypair.publicKeyArmored
            }, function(err) {
                if (err) {
                    callback(err);
                    return;
                }

                // persist newly generated keypair
                var newKeypair = {
                    publicKey: {
                        _id: generatedKeypair.keyId,
                        userId: self._account.emailAddress,
                        publicKey: generatedKeypair.publicKeyArmored
                    },
                    privateKey: {
                        _id: generatedKeypair.keyId,
                        userId: self._account.emailAddress,
                        encryptedKey: generatedKeypair.privateKeyArmored
                    }
                };
                self._keychain.putUserKeyPair(newKeypair, function(err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    // set decrypted privateKey to pgpMailer
                    self._pgpbuilder._privateKey = self._crypto._privateKey;
                    callback();
                });
            });
        }
    };

    EmailDAO.prototype.syncOutbox = function(options, callback) {
        this._emailSync.syncOutbox(options, callback);
    };

    EmailDAO.prototype.sync = function(options, callback) {
        this._emailSync.sync(options, callback);
    };

    /**
     * Streams message content
     * @param {Object} options.message The message for which to retrieve the body
     * @param {Object} options.folder The IMAP folder
     * @param {Function} callback(error, message) Invoked when the message is streamed, or provides information if an error occurred
     */
    EmailDAO.prototype.getBody = function(options, callback) {
        var self = this,
            message = options.message,
            folder = options.folder;

        if (message.loadingBody) {
            return;
        }

        // the message already has a body, so no need to become active here
        if (message.body) {
            return;
        }

        message.loadingBody = true;

        // the mail does not have its content in memory
        readFromDevice();

        // if possible, read the message body from the device
        function readFromDevice() {
            self._emailSync._localListMessages({
                folder: folder,
                uid: message.uid
            }, function(err, localMessages) {
                var localMessage;

                if (err) {
                    message.loadingBody = false;
                    callback(err);
                    return;
                }

                localMessage = localMessages[0];

                if (!localMessage.body) {
                    streamFromImap();
                    return;
                }

                // attach the body to the mail object 
                message.body = localMessage.body;
                handleEncryptedContent();
            });
        }

        // if reading the message body from the device was unsuccessful,
        // stream the message from the imap server
        function streamFromImap() {
            self._emailSync._imapStreamText({
                folder: folder,
                message: message
            }, function(error) {
                if (error) {
                    message.loadingBody = false;
                    callback(error);
                    return;
                }

                message.loadingBody = false;

                // do not write the object from the object used by angular to the disk, instead
                // do a short round trip and write back the unpolluted object
                self._emailSync._localListMessages({
                    folder: folder,
                    uid: message.uid
                }, function(error, storedMessages) {
                    if (error) {
                        callback(error);
                        return;
                    }

                    storedMessages[0].body = message.body;

                    self._emailSync._localStoreMessages({
                        folder: folder,
                        emails: storedMessages
                    }, function(error) {
                        if (error) {
                            callback(error);
                            return;
                        }

                        handleEncryptedContent();
                    });
                });
            });
        }

        function handleEncryptedContent() {
            // normally, the imap-client should already have set the message.encrypted flag. problem: if we have pgp/inline,
            // we can't reliably determine if the message is encrypted before we have inspected the payload...
            message.encrypted = containsArmoredCiphertext(message);

            // cleans the message body from everything but the ciphertext
            if (message.encrypted) {
                message.decrypted = false;
                extractCiphertext();
            }
            message.loadingBody = false;
            callback(null, message);
        }

        function containsArmoredCiphertext() {
            return message.body.indexOf(str.cryptPrefix) !== -1 && message.body.indexOf(str.cryptSuffix) !== -1;
        }

        function extractCiphertext() {
            var start = message.body.indexOf(str.cryptPrefix),
                end = message.body.indexOf(str.cryptSuffix) + str.cryptSuffix.length;

            // parse message body for encrypted message block
            message.body = message.body.substring(start, end);
        }

    };

    EmailDAO.prototype.decryptBody = function(options, callback) {
        var self = this,
            message = options.message;

        // the message has no body, is not encrypted or has already been decrypted
        if (message.decryptingBody || !message.body || !message.encrypted || message.decrypted) {
            return;
        }

        message.decryptingBody = true;

        // get the sender's public key for signature checking
        self._keychain.getReceiverPublicKey(message.from[0].address, function(err, senderPublicKey) {
            if (err) {
                message.decryptingBody = false;
                callback(err);
                return;
            }

            if (!senderPublicKey) {
                // this should only happen if a mail from another channel is in the inbox
                message.body = 'Public key for sender not found!';
                message.decryptingBody = false;
                callback(null, message);
                return;
            }

            // get the receiver's public key to check the message signature
            self._crypto.decrypt(message.body, senderPublicKey.publicKey, function(err, decrypted) {
                // if an error occurs during decryption, display the error message as the message content
                decrypted = decrypted || err.errMsg || 'Error occurred during decryption';

                // this is a very primitive detection if we have PGP/MIME or PGP/INLINE
                if (!self._mailreader.isRfc(decrypted)) {
                    message.body = decrypted;
                    message.decrypted = true;
                    message.decryptingBody = false;
                    callback(null, message);
                    return;
                }

                // parse the decrypted MIME message
                self._imapParseMessageBlock({
                    message: message,
                    raw: decrypted
                }, function(error) {
                    if (error) {
                        message.decryptingBody = false;
                        callback(error);
                        return;
                    }

                    message.decrypted = true;

                    // remove the pgp-signature from the attachments
                    message.attachments = _.reject(message.attachments, function(attmt) {
                        return attmt.mimeType === "application/pgp-signature";
                    });

                    // we're done here!
                    message.decryptingBody = false;
                    callback(null, message);
                });
            });
        });
    };

    EmailDAO.prototype.getAttachment = function(options, callback) {
        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        this._imapClient.getAttachment(options, callback);
    };

    EmailDAO.prototype.sendEncrypted = function(options, callback) {
        var self = this;

        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        // mime encode, sign, encrypt and send email via smtp
        self._pgpMailer.send({
            encrypt: true,
            cleartextMessage: str.message + str.signature,
            mail: options.email,
            publicKeysArmored: options.email.publicKeysArmored
        }, callback);
    };

    EmailDAO.prototype.sendPlaintext = function(options, callback) {
        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        // mime encode, sign and send email via smtp
        this._pgpMailer.send({
            mail: options.email
        }, callback);
    };

    EmailDAO.prototype.encrypt = function(options, callback) {
        this._pgpbuilder.encrypt(options, callback);
    };

    //
    // Internal API
    //

    // IMAP API

    /**
     * Login the imap client
     */
    EmailDAO.prototype._imapLogin = function(callback) {
        if (!this._imapClient) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        // login IMAP client if existent
        this._imapClient.login(callback);
    };

    /**
     * Cleanup by logging the user off.
     */
    EmailDAO.prototype._imapLogout = function(callback) {
        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        this._imapClient.logout(callback);
    };

    EmailDAO.prototype._imapParseMessageBlock = function(options, callback) {
        this._mailreader.parseRfc(options, callback);
    };

    /**
     * List the folders in the user's IMAP mailbox.
     */
    EmailDAO.prototype._imapListFolders = function(callback) {
        var self = this,
            dbType = 'folders';

        // check local cache
        self._devicestorage.listItems(dbType, 0, null, function(err, stored) {
            if (err) {
                callback(err);
                return;
            }

            if (!stored || stored.length < 1) {
                // no folders cached... fetch from server
                fetchFromServer();
                return;
            }

            callback(null, stored[0]);
        });

        function fetchFromServer() {
            var folders;

            if (!self._account.online) {
                callback({
                    errMsg: 'Client is currently offline!',
                    code: 42
                });
                return;
            }

            // fetch list from imap server
            self._imapClient.listWellKnownFolders(function(err, wellKnownFolders) {
                if (err) {
                    callback(err);
                    return;
                }

                folders = [
                    wellKnownFolders.inbox,
                    wellKnownFolders.sent, {
                        type: 'Outbox',
                        path: 'OUTBOX'
                    },
                    wellKnownFolders.drafts,
                    wellKnownFolders.trash
                ];

                // cache locally
                // persist encrypted list in device storage
                self._devicestorage.storeList([folders], dbType, function(err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    callback(null, folders);
                });
            });
        }
    };

    return EmailDAO;
});