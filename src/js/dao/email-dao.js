define(function(require) {
    'use strict';

    var util = require('cryptoLib/util'),
        _ = require('underscore'),
        config = require('js/app-config').config,
        str = require('js/app-config').string;

    var EmailDAO = function(keychain, crypto, devicestorage, pgpbuilder, mailreader) {
        this._keychain = keychain;
        this._crypto = crypto;
        this._devicestorage = devicestorage;
        this._pgpbuilder = pgpbuilder;
        this._mailreader = mailreader;
    };


    //
    //
    // Public API
    //
    //


    EmailDAO.prototype.init = function(options, callback) {
        var self = this,
            keypair;

        self._account = options.account;
        self._account.busy = false; // triggers the spinner
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
                initFolders();
            });
        }

        function initFolders() {
            // try init folders from memory, since imap client not initiated yet
            self._initFolders(function(err) {
                // dont handle offline case this time
                if (err && err.code !== 42) {
                    callback(err);
                    return;
                }

                callback(null, keypair);
            });
        }
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

    EmailDAO.prototype.openFolder = function(options, callback) {
        var self = this;

        if (!self._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        if (options.folder.path === config.outboxMailboxPath) {
            return;
        }

        this._imapClient.selectMailbox({
            path: options.folder.path
        }, callback);
    };

    EmailDAO.prototype.refreshFolder = function(options, callback) {
        var self = this,
            folder = options.folder;

        folder.messages = folder.messages || [];
        self._localListMessages({
            folder: folder
        }, function(err, storedMessages) {
            if (err) {
                done(err);
                return;
            }

            var storedUids = _.pluck(storedMessages, 'uid'),
                memoryUids = _.pluck(folder.messages, 'uid'),
                newUids = _.difference(storedUids, memoryUids),
                removedUids = _.difference(memoryUids, storedUids);

            // which messages are new on the disk that are not yet in memory?
            _.filter(storedMessages, function(msg) {
                return _.contains(newUids, msg.uid);
            }).forEach(function(newMessage) {
                // remove the body parts to not load unnecessary data to memory
                // however, don't do that for the outbox. load the full message there.
                if (folder.path !== config.outboxMailboxPath) {
                    delete newMessage.bodyParts;
                }

                folder.messages.push(newMessage);
            });

            // which messages are no longer on disk, i.e. have been removed/sent/...
            _.filter(folder.messages, function(msg) {
                return _.contains(removedUids, msg.uid);
            }).forEach(function(removedMessage) {
                // remove the message
                var index = folder.messages.indexOf(removedMessage);
                folder.messages.splice(index, 1);
            });

            done();
        });

        function done(err) {
            self._account.busy = false; // stop the spinner
            updateUnreadCount(folder); // update the unread count
            callback(err);
        }
    };

    EmailDAO.prototype.fetchMessages = function(options, callback) {
        var self = this,
            folder = options.folder;

        self._account.busy = true;

        if (!self._account.online) {
            done({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        // list the messages starting from the lowest new uid to the highest new uid
        self._imapListMessages(options, function(err, messages) {
            if (err) {
                done(err);
                return;
            }

            // if there are verification messages in the synced messages, handle it
            var verificationMessages = _.filter(messages, function(message) {
                return message.subject === str.verificationSubject;
            });

            // if there are verification messages, continue after we've tried to verify
            if (verificationMessages.length > 0) {
                var after = _.after(verificationMessages.length, storeHeaders);

                verificationMessages.forEach(function(verificationMessage) {
                    handleVerification(verificationMessage, function(err, isValid) {
                        // if it was NOT a valid verification mail, do nothing
                        // if an error occurred and the mail was a valid verification mail,
                        // keep the mail in the list so the user can see it and verify manually
                        if (!isValid || err) {
                            after();
                            return;
                        }

                        // if verification worked, we remove the mail from the list.
                        messages.splice(messages.indexOf(verificationMessage), 1);
                        after();
                    });
                });
                return;
            }

            // no verification messages, just proceed as usual
            storeHeaders();

            function storeHeaders() {
                if (_.isEmpty(messages)) {
                    // nothing to do, we're done here
                    done();
                    return;
                }

                // persist the encrypted message to the local storage
                self._localStoreMessages({
                    folder: folder,
                    emails: messages
                }, function(err) {
                    if (err) {
                        done(err);
                        return;
                    }

                    // this enables us to already show the attachment clip in the message list ui
                    messages.forEach(function(message) {
                        message.attachments = message.bodyParts.filter(function(bodyPart) {
                            return bodyPart.type === 'attachment';
                        });
                    });

                    [].unshift.apply(folder.messages, messages); // add the new messages to the folder
                    updateUnreadCount(folder); // update the unread count
                    self.onIncomingMessage(messages); // notify about new messages
                    done();
                });
            }
        });

        function done(err) {
            self._account.busy = false; // stop the spinner
            callback(err);
        }

        function handleVerification(message, localCallback) {
            self._getBodyParts({
                folder: folder,
                uid: message.uid,
                bodyParts: message.bodyParts
            }, function(error, parsedBodyParts) {
                // we could not stream the text to determine if the verification was valid or not
                // so handle it as if it were valid
                if (error) {
                    localCallback(error, true);
                    return;
                }

                var body = _.pluck(filterBodyParts(parsedBodyParts, 'text'), 'content').join('\n'),
                    verificationUrlPrefix = config.cloudUrl + config.verificationUrl,
                    uuid = body.split(verificationUrlPrefix).pop().substr(0, config.verificationUuidLength),
                    uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

                // there's no valid uuid in the message, so forget about it
                if (!uuidRegex.test(uuid)) {
                    localCallback(null, false);
                    return;
                }

                // there's a valid uuid in the message, so try to verify it
                self._keychain.verifyPublicKey(uuid, function(err) {
                    if (err) {
                        localCallback({
                            errMsg: 'Verifying your public key failed: ' + err.errMsg
                        }, true);
                        return;
                    }

                    // public key has been verified, delete the message
                    self._imapDeleteMessage({
                        folder: folder,
                        uid: message.uid
                    }, function() {
                        // if we could successfully not delete the message or not doesn't matter.
                        // just don't show it in whiteout and keep quiet about it
                        localCallback(null, true);
                    });
                });
            });
        }
    };

    EmailDAO.prototype.deleteMessage = function(options, callback) {
        var self = this,
            folder = options.folder,
            message = options.message;

        self._account.busy = true;

        folder.messages.splice(folder.messages.indexOf(message), 1);

        if (options.localOnly || options.folder.path === config.outboxMailboxPath) {
            deleteLocal();
            return;
        }

        deleteImap();

        function deleteImap() {
            if (!self._account.online) {
                done({
                    errMsg: 'Client is currently offline!',
                    code: 42
                });
                return;
            }

            self._imapDeleteMessage({
                folder: folder,
                uid: message.uid
            }, function(err) {
                if (err) {
                    done(err);
                    return;
                }

                deleteLocal();
            });
        }

        function deleteLocal() {
            self._localDeleteMessage({
                folder: folder,
                uid: message.uid
            }, done);
        }

        function done(err) {
            self._account.busy = false; // stop the spinner
            if (err) {
                folder.messages.unshift(message); // re-add the message to the folder in case of an error
            }
            updateUnreadCount(folder); // update the unread count, if necessary
            callback(err);
        }
    };

    EmailDAO.prototype.setFlags = function(options, callback) {
        var self = this,
            folder = options.folder,
            message = options.message;

        self._account.busy = true;

        if (folder.messages.indexOf(message) < 0) {
            self._account.busy = false; // stop the spinner
            return;
        }

        if (options.localOnly || options.folder.path === config.outboxMailboxPath) {
            markStorage();
            return;
        }

        if (!self._account.online) {
            done({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        markImap();

        function markImap() {
            self._imapMark({
                folder: folder,
                uid: options.message.uid,
                unread: options.message.unread,
                answered: options.message.answered
            }, function(err) {
                if (err) {
                    done(err);
                    return;
                }

                markStorage();
            });
        }

        function markStorage() {
            self._localListMessages({
                folder: folder,
                uid: options.message.uid,
            }, function(err, storedMessages) {
                if (err) {
                    done(err);
                    return;
                }

                var storedMessage = storedMessages[0];
                storedMessage.unread = options.message.unread;
                storedMessage.answered = options.message.answered;

                self._localStoreMessages({
                    folder: folder,
                    emails: [storedMessage]
                }, done);
            });
        }

        function done(err) {
            self._account.busy = false; // stop the spinner // 
            updateUnreadCount(folder); // update the unread count
            callback(err);
        }
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
            self._localListMessages({
                folder: folder,
                uid: message.uid
            }, function(err, localMessages) {
                if (err || localMessages.length === 0) {
                    done(err);
                    return;
                }

                var localMessage = localMessages[0];

                // treat attachment and non-attachment body parts separately:
                // we need to fetch the content for non-attachment body parts (encrypted, signed, text, html)
                // but we spare the effort and fetch attachment content later upon explicit user request.
                var contentParts = localMessage.bodyParts.filter(function(bodyPart) {
                    return bodyPart.type !== "attachment";
                });
                var attachmentParts = localMessage.bodyParts.filter(function(bodyPart) {
                    return bodyPart.type === "attachment";
                });

                // do we need to fetch content from the imap server?
                var needsFetch = false;
                contentParts.forEach(function(part) {
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
                self._getBodyParts({
                    folder: folder,
                    uid: localMessage.uid,
                    bodyParts: contentParts
                }, function(err, parsedBodyParts) {
                    if (err) {
                        done(err);
                        return;
                    }

                    // piece together the parsed bodyparts and the empty attachments which have not been parsed
                    message.bodyParts = parsedBodyParts.concat(attachmentParts);
                    localMessage.bodyParts = parsedBodyParts.concat(attachmentParts);

                    // persist it to disk
                    self._localStoreMessages({
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
                message.body = filterBodyParts(message.bodyParts, 'encrypted')[0].content;
                done();
                return;
            }

            // for unencrypted messages, this is the array where the body parts are located
            var root = message.bodyParts;

            if (message.signed) {
                var signedPart = filterBodyParts(message.bodyParts, 'signed')[0];
                message.message = signedPart.message;
                message.signature = signedPart.signature;
                // TODO check integrity
                // in case of a signed message, you only want to show the signed content and ignore the rest
                root = signedPart.content;
            }

            // if the message is plain text and contains pgp/inline, we are only interested in the encrypted
            // content, the rest (corporate mail footer, attachments, etc.) is discarded.
            var body = _.pluck(filterBodyParts(root, 'text'), 'content').join('\n');

            /*
             * here's how the regex works:
             * - any content before the PGP block will be discarded
             * - "-----BEGIN PGP MESSAGE-----" must be at the beginning (and end) of a line
             * - "-----END PGP MESSAGE-----" must be at the beginning (and end) of a line
             * - the regex must not match a pgp block in a plain text reply or forward of a pgp/inline message.
             *   (the encryption will break for replies/forward, because "> " corrupts the PGP block with non-radix-64 characters)
             */
            var match = body.match(/^-{5}BEGIN PGP MESSAGE-{5}$[^>]*^-{5}END PGP MESSAGE-{5}$/im);
            if (match) {
                // show the plain text content
                message.body = match[0];

                // - replace the bodyParts info with an artificial bodyPart of type "encrypted"
                // - _isPgpInline is only used internally to avoid trying to parse non-MIME text with the mailreader
                // - set the encrypted flag so we can signal the ui that we're handling encrypted content
                message.encrypted = true;
                message.bodyParts = [{
                    type: 'encrypted',
                    content: match[0],
                    _isPgpInline: true
                }];
                done();
                return;
            }

            message.attachments = filterBodyParts(root, 'attachment');
            message.body = body;
            message.html = _.pluck(filterBodyParts(root, 'html'), 'content').join('\n');

            done();
        }

        function done(err) {
            message.loadingBody = false;
            callback(err, err ? undefined : message);
        }
    };

    EmailDAO.prototype.getAttachment = function(options, callback) {
        this._getBodyParts({
            folder: options.folder,
            uid: options.uid,
            bodyParts: [options.attachment]
        }, function(err, parsedBodyParts) {
            if (err) {
                callback(err);
                return;
            }

            options.attachment.content = parsedBodyParts[0].content;
            callback(err, err ? undefined : options.attachment);
        });
    };

    EmailDAO.prototype.decryptBody = function(options, callback) {
        var self = this,
            message = options.message;

        // the message is decrypting has no body, is not encrypted or has already been decrypted
        if (!message.bodyParts || message.decryptingBody || !message.body || !message.encrypted || message.decrypted) {
            return;
        }

        message.decryptingBody = true;

        // get the sender's public key for signature checking
        self._keychain.getReceiverPublicKey(message.from[0].address, function(err, senderPublicKey) {
            if (err) {
                done(err);
                return;
            }

            if (!senderPublicKey) {
                // this should only happen if a mail from another channel is in the inbox
                showError('Public key for sender not found!');
                return;
            }

            // get the receiver's public key to check the message signature
            var encryptedNode = filterBodyParts(message.bodyParts, 'encrypted')[0];
            self._crypto.decrypt(encryptedNode.content, senderPublicKey.publicKey, function(err, decrypted) {
                if (err || !decrypted) {
                    showError(err.errMsg || err.message || 'An error occurred during the decryption.');
                    return;
                }

                // if the encrypted node contains pgp/inline, we must not parse it
                // with the mailreader as it is not well-formed MIME
                if (encryptedNode._isPgpInline) {
                    message.body = decrypted;
                    message.decrypted = true;
                    done();
                    return;
                }

                // the mailparser works on the .raw property
                encryptedNode.raw = decrypted;

                // parse the decrypted raw content in the mailparser
                self._mailreader.parse({
                    bodyParts: [encryptedNode]
                }, function(err, parsedBodyParts) {
                    if (err) {
                        showError(err.errMsg || err.message);
                        return;
                    }

                    // we have successfully interpreted the descrypted message,
                    // so let's update the views on the message parts

                    message.body = _.pluck(filterBodyParts(parsedBodyParts, 'text'), 'content').join('\n');
                    message.html = _.pluck(filterBodyParts(parsedBodyParts, 'html'), 'content').join('\n');
                    message.attachments = _.reject(filterBodyParts(parsedBodyParts, 'attachment'), function(attmt) {
                        // remove the pgp-signature from the attachments
                        return attmt.mimeType === "application/pgp-signature";
                    });

                    message.decrypted = true;

                    // we're done here!
                    done();
                });
            });
        });

        function showError(msg) {
            message.body = msg;
            message.decrypted = true; // display error msh in body
            done();
        }

        function done(err) {
            message.decryptingBody = false;
            callback(err, err ? undefined : message);
        }
    };

    EmailDAO.prototype.sendEncrypted = function(options, callback) {
        var self = this;

        if (!self._account.online) {
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
    //
    // Event Handlers
    //
    //


    EmailDAO.prototype.onConnect = function(options, callback) {
        var self = this;

        self._account.loggingIn = true;

        self._imapClient = options.imapClient;
        self._pgpMailer = options.pgpMailer;

        this._imapClient.login(function(err) {
            self._account.loggingIn = false;

            if (err) {
                callback(err);
                return;
            }

            // set status to online
            self._account.online = true;

            // init folders
            self._initFolders(function(err) {
                if (err) {
                    callback(err);
                    return;
                }

                // attach sync update handler
                self._imapClient.onSyncUpdate = self._onSyncUpdate.bind(self);

                // fill the imap mailboxCache
                var mailboxCache = {};
                self._account.folders.forEach(function(folder) {
                    if (folder.messages.length === 0) {
                        return;
                    }

                    var uids, highestModseq, lastUid;

                    uids = _.pluck(folder.messages, 'uid').sort(function(a, b) {
                        return a - b;
                    });
                    lastUid = uids[uids.length - 1];

                    highestModseq = _.pluck(folder.messages, 'modseq').sort(function(a, b) {
                        return a - b;
                    }).pop();

                    mailboxCache[folder.path] = {
                        exists: lastUid,
                        uidNext: lastUid + 1,
                        uidlist: uids,
                        highestModseq: highestModseq
                    };
                });
                self._imapClient.mailboxCache = mailboxCache;

                var inbox = _.findWhere(self._account.folders, {
                    type: 'Inbox'
                });

                if (!inbox) {
                    callback();
                    return;
                }

                self._imapClient.listenForChanges({
                    path: inbox.path
                }, callback);
            });
        });
    };

    EmailDAO.prototype.onDisconnect = function() {
        this._account.online = false;
        this._imapClient = undefined;
        this._pgpMailer = undefined;
    };

    EmailDAO.prototype._onSyncUpdate = function(options) {
        var self = this;

        var folder = _.findWhere(self._account.folders, {
            path: options.path
        });

        if (!folder) {
            // ignore updates for an unknown folder
            return;
        }

        if (options.type === 'new') {
            // new messages available on imap, fetch from imap and store to disk and memory
            self.fetchMessages({
                folder: folder,
                firstUid: Math.min.apply(null, options.list),
                lastUid: Math.max.apply(null, options.list)
            }, self.onError.bind(self));
        } else if (options.type === 'deleted') {
            // messages have been deleted, remove from local storage and memory
            options.list.forEach(function(uid) {
                var message = _.findWhere(folder.messages, {
                    uid: uid
                });

                if (!message) {
                    return;
                }

                self.deleteMessage({
                    folder: folder,
                    message: message,
                    localOnly: true
                }, self.onError.bind(self));
            });
        } else if (options.type === 'messages') {
            // NB! several possible reasons why this could be called.
            // if a message in the array has uid value and flag array, it had a possible flag update
            options.list.forEach(function(changedMsg) {
                if (!changedMsg.uid || !changedMsg.flags) {
                    return;
                }

                var message = _.findWhere(folder.messages, {
                    uid: changedMsg.uid
                });

                if (!message) {
                    return;
                }

                message.answered = changedMsg.flags.indexOf('\\Answered') > -1;
                message.unread = changedMsg.flags.indexOf('\\Seen') === -1;

                if (!message) {
                    return;
                }

                self.setFlags({
                    folder: folder,
                    message: message
                }, self.onError.bind(self));
            });
        }
    };


    //
    //
    // Internal API
    //
    //


    /**
     * List the folders in the user's IMAP mailbox.
     */
    EmailDAO.prototype._initFolders = function(callback) {
        var self = this,
            folderDbType = 'folders',
            folders;

        self._account.busy = true;

        if (!self._account.online) {
            // fetch list from local cache
            self._devicestorage.listItems(folderDbType, 0, null, function(err, stored) {
                if (err) {
                    done(err);
                    return;
                }

                self._account.folders = stored[0] || [];
                readCache();
            });
            return;
        } else {
            // fetch list from imap server
            self._imapClient.listWellKnownFolders(function(err, wellKnownFolders) {
                var foldersChanged = false;

                if (err) {
                    done(err);
                    return;
                }

                // this array is dropped directly into the ui to create the folder list
                folders = [
                    wellKnownFolders.inbox,
                    wellKnownFolders.sent, {
                        type: 'Outbox',
                        path: config.outboxMailboxPath
                    },
                    wellKnownFolders.drafts,
                    wellKnownFolders.trash
                ];

                // are there any new folders?
                folders.forEach(function(folder) {
                    if (!_.findWhere(self._account.folders, {
                        path: folder.path
                    })) {
                        // add the missing folder
                        self._account.folders.push(folder);
                        foldersChanged = true;
                    }
                });

                // have any folders been deleted?
                self._account.folders.forEach(function(folder) {
                    if (!_.findWhere(folders, {
                        path: folder.path
                    })) {
                        // remove the obsolete folder
                        self._account.folders.splice(self._account.folder.indexOf(folder), 1);
                        foldersChanged = true;
                    }
                });

                if (!foldersChanged) {
                    readCache();
                    return;
                }

                // persist encrypted list in device storage
                self._devicestorage.storeList([folders], folderDbType, function(err) {
                    if (err) {
                        done(err);
                        return;
                    }

                    readCache();
                });
            });
            return;
        }

        function readCache() {
            if (!self._account.folders || self._account.folders.length === 0) {
                done();
                return;
            }

            var after = _.after(self._account.folders.length, done);

            self._account.folders.forEach(function(folder) {
                if (folder.messages) {
                    // the folder is already initialized
                    after();
                    return;
                }

                self.refreshFolder({
                    folder: folder
                }, function(err) {
                    if (err) {
                        done(err);
                        return;
                    }

                    after();
                });
            });
        }

        function done(err) {
            self._account.busy = false; // stop the spinner
            callback(err);
        }
    };


    //
    // 
    // IMAP API
    //   
    //   

    /**
     * Mark imap messages as un-/read or un-/answered
     */
    EmailDAO.prototype._imapMark = function(options, callback) {
        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        options.path = options.folder.path;
        this._imapClient.updateFlags(options, callback);
    };

    EmailDAO.prototype._imapDeleteMessage = function(options, callback) {
        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        var trash = _.findWhere(this._account.folders, {
            type: 'Trash'
        });

        // there's no known trash folder to move the mail to or we're in the trash folder, so we can purge the message
        if (!trash || options.folder === trash) {
            this._imapClient.deleteMessage({
                path: options.folder.path,
                uid: options.uid
            }, callback);

            return;
        }

        this._imapClient.moveMessage({
            path: options.folder.path,
            destination: trash.path,
            uid: options.uid
        }, callback);
    };

    /**
     * Get an email messsage without the body
     * @param {String} options.folder The folder
     * @param {Number} options.firstUid The lower bound of the uid (inclusive)
     * @param {Number} options.lastUid The upper bound of the uid range (inclusive)
     * @param {Function} callback (error, messages) The callback when the imap client is done fetching message metadata
     */
    EmailDAO.prototype._imapListMessages = function(options, callback) {
        var self = this;

        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        options.path = options.folder.path;
        self._imapClient.listMessages(options, callback);
    };

    /**
     * Stream an email messsage's body
     * @param {String} options.folder The folder
     * @param {String} options.uid the message's uid
     * @param {Object} options.bodyParts The message, as retrieved by _imapListMessages
     * @param {Function} callback (error, message) The callback when the imap client is done streaming message text content
     */
    EmailDAO.prototype._getBodyParts = function(options, callback) {
        var self = this;

        if (!self._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        options.path = options.folder.path;
        self._imapClient.getBodyParts(options, function(err) {
            if (err) {
                callback(err);
                return;
            }
            // interpret the raw content of the email
            self._mailreader.parse(options, callback);
        });
    };


    // 
    // 
    // Local Storage API
    // 
    // 


    EmailDAO.prototype._localListMessages = function(options, callback) {
        var dbType = 'email_' + options.folder.path + (options.uid ? '_' + options.uid : '');
        this._devicestorage.listItems(dbType, 0, null, callback);
    };

    EmailDAO.prototype._localStoreMessages = function(options, callback) {
        var dbType = 'email_' + options.folder.path;
        this._devicestorage.storeList(options.emails, dbType, callback);
    };

    EmailDAO.prototype._localDeleteMessage = function(options, callback) {
        var path = options.folder.path,
            uid = options.uid,
            id = options.id;

        if (!path || !(uid || id)) {
            callback({
                errMsg: 'Invalid options!'
            });
            return;
        }

        var dbType = 'email_' + path + '_' + (uid || id);
        this._devicestorage.removeList(dbType, callback);
    };


    //
    //
    // Helper Functions
    //
    //

    function updateUnreadCount(folder) {
        var allMsgs = folder.messages.length,
            unreadMsgs = _.filter(folder.messages, function(msg) {
                return msg.unread;
            }).length;

        // for the outbox, the unread count is determined by ALL the messages
        // whereas for normal folders, only the unread messages matter
        folder.count = folder.path === config.outboxMailboxPath ? allMsgs : unreadMsgs;
    }

    /**
     * Helper function that recursively traverses the body parts tree. Looks for bodyParts that match the provided type and aggregates them
     * @param {[type]} bodyParts The bodyParts array
     * @param {[type]} type The type to look up
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

    return EmailDAO;
});