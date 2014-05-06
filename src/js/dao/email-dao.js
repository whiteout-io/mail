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
        self._account.loggingIn = false;

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

                self._account.folders = folders;

                callback(null, keypair);
            });
        }
    };

    EmailDAO.prototype.onConnect = function(options, callback) {
        var self = this;

        self._account.loggingIn = true;

        self._imapClient = options.imapClient;
        self._pgpMailer = options.pgpMailer;

        // notify emailSync
        self._emailSync.onConnect({
            imapClient: self._imapClient
        }, function(err) {
            if (err) {
                self._account.loggingIn = false;
                callback(err);
                return;
            }

            // connect to newly created imap client
            self._imapLogin(onLogin);
        });

        function onLogin(err) {
            if (err) {
                self._account.loggingIn = false;
                callback(err);
                return;
            }

            // set status to online
            self._account.loggingIn = false;
            self._account.online = true;

            // init folders
            self._imapListFolders(function(err, folders) {
                if (err) {
                    callback(err);
                    return;
                }

                // only overwrite folders if they are not yet set
                if (!self._account.folders) {
                    self._account.folders = folders;
                }

                var inbox = _.findWhere(self._account.folders, {
                    type: 'Inbox'
                });

                if (inbox) {
                    self._imapClient.listenForChanges({
                        path: inbox.path
                    }, function(error, path) {
                        if (typeof self.onNeedsSync === 'function') {
                            self.onNeedsSync(error, path);
                        }
                    });
                }

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

        // the message either already has a body or is fetching it right now, so no need to become active here
        if (message.loadingBody || typeof message.body !== 'undefined') {
            return;
        }

        message.loadingBody = true;

        /*
         * read this before inspecting the method!
         *
         * you will wonder about the round trip to the disk where we load the persisted object. there are two reasons for this behavior:
         * 1) if you work with a message that was loaded from the disk, we strip the message.bodyParts array,
         *    because it is not really necessary to keep everything in memory
         * 2) the message in memory is polluted by angular. angular tracks ordering of a list by adding a property
         *    to the model. this property is auto generated and must not be persisted.
         */

        retrieveContent();

        function retrieveContent() {
            // load the local message from memory
            self._emailSync._localListMessages({
                folder: folder,
                uid: message.uid
            }, function(err, localMessages) {
                if (err || localMessages.length === 0) {
                    done(err);
                    return;
                }

                var localMessage = localMessages[0];

                // do we need to fetch content from the imap server?
                var needsFetch = false;
                localMessage.bodyParts.forEach(function(part) {
                    needsFetch = (typeof part.content === 'undefined');
                });

                if (!needsFetch) {
                    // if we have all the content we need,
                    // we can extract the content
                    message.bodyParts = localMessage.bodyParts;
                    extractContent();
                    return;
                }

                // get the raw content from the imap server
                self._emailSync._getBodyParts({
                    folder: folder,
                    uid: localMessage.uid,
                    bodyParts: localMessage.bodyParts
                }, function(err, parsedBodyParts) {
                    if (err) {
                        done(err);
                        return;
                    }

                    message.bodyParts = parsedBodyParts;
                    localMessage.bodyParts = parsedBodyParts;

                    // persist it to disk
                    self._emailSync._localStoreMessages({
                        folder: folder,
                        emails: [localMessage]
                    }, function(error) {
                        if (error) {
                            done(error);
                            return;
                        }

                        // extract the content
                        extractContent();
                    });
                });
            });
        }

        function extractContent() {
            if (message.encrypted) {
                // show the encrypted message
                message.body = self._emailSync.filterBodyParts(message.bodyParts, 'encrypted')[0].content;
                done();
                return;
            }

            // for unencrypted messages, this is the array where the body parts are located
            var root = message.bodyParts;

            if (message.signed) {
                var signedPart = self._emailSync.filterBodyParts(message.bodyParts, 'signed')[0];
                message.message = signedPart.message;
                message.signature = signedPart.signature;
                // TODO check integrity
                // in case of a signed message, you only want to show the signed content and ignore the rest
                root = signedPart.content;
            }

            message.attachments = self._emailSync.filterBodyParts(root, 'attachment');
            message.body = _.pluck(self._emailSync.filterBodyParts(root, 'text'), 'content').join('\n');
            message.html = _.pluck(self._emailSync.filterBodyParts(root, 'html'), 'content').join('\n');

            done();
        }

        function done(err) {
            message.loadingBody = false;
            callback(err, err ? undefined : message);
        }
    };

    EmailDAO.prototype.decryptBody = function(options, callback) {
        var self = this,
            message = options.message;

        // the message is decrypting has no body, is not encrypted or has already been decrypted
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
                done();
                return;
            }

            // get the receiver's public key to check the message signature
            var encryptedNode = self._emailSync.filterBodyParts(message.bodyParts, 'encrypted')[0];
            self._crypto.decrypt(encryptedNode.content, senderPublicKey.publicKey, function(err, decrypted) {
                if (err || !decrypted) {
                    err = err || {
                        errMsg: 'Error occurred during decryption'
                    };
                    done(err);
                    return;
                }

                // the mailparser works on the .raw property
                encryptedNode.raw = decrypted;

                // parse the decrpyted raw content in the mailparser
                self._mailreader.parse({
                    bodyParts: [encryptedNode]
                }, function(error, parsedBodyParts) {
                    if (error) {
                        done(error);
                        return;
                    }

                    // we have successfully interpreted the descrypted message,
                    // so let's update the views on the message parts

                    message.body = _.pluck(self._emailSync.filterBodyParts(parsedBodyParts, 'text'), 'content').join('\n');
                    message.html = _.pluck(self._emailSync.filterBodyParts(parsedBodyParts, 'html'), 'content').join('\n');
                    message.attachments = _.reject(self._emailSync.filterBodyParts(parsedBodyParts, 'attachment'), function(attmt) {
                        // remove the pgp-signature from the attachments
                        return attmt.mimeType === "application/pgp-signature";
                    });

                    message.decrypted = true;


                    // we're done here!
                    done();
                });
            });
        });

        function done(err) {
            message.decryptingBody = false;
            callback(err, err ? undefined : message);
        }
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