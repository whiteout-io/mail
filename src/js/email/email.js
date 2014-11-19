'use strict';

var ngModule = angular.module('woServices');
ngModule.service('email', Email);
module.exports = Email;

var config = require('../app-config').config,
    str = require('../app-config').string;

//
//
// Constants
//
//

var FOLDER_DB_TYPE = 'folders';

var SYNC_TYPE_NEW = 'new';
var SYNC_TYPE_DELETED = 'deleted';
var SYNC_TYPE_MSGS = 'messages';

// well known folders
var FOLDER_TYPE_INBOX = 'Inbox';
var FOLDER_TYPE_SENT = 'Sent';
var FOLDER_TYPE_DRAFTS = 'Drafts';
var FOLDER_TYPE_TRASH = 'Trash';
var FOLDER_TYPE_FLAGGED = 'Flagged';

var MSG_ATTR_UID = 'uid';
var MSG_PART_ATTR_CONTENT = 'content';
var MSG_PART_TYPE_ATTACHMENT = 'attachment';
var MSG_PART_TYPE_ENCRYPTED = 'encrypted';
var MSG_PART_TYPE_SIGNED = 'signed';
var MSG_PART_TYPE_TEXT = 'text';
var MSG_PART_TYPE_HTML = 'html';

//
//
// Email Service
//
//

/**
 * High-level data access object that orchestrates everything around the handling of encrypted mails:
 * PGP de-/encryption, receiving via IMAP, sending via SMTP, MIME parsing, local db persistence
 *
 * @param {Object} keychain The keychain DAO handles keys transparently
 * @param {Object} pgp Orchestrates decryption
 * @param {Object} devicestorage Handles persistence to the local indexed db
 * @param {Object} pgpbuilder Generates and encrypts MIME and SMTP messages
 * @param {Object} mailreader Parses MIME messages received from IMAP
 */
function Email(keychain, pgp, devicestorage, pgpbuilder, mailreader) {
    this._keychain = keychain;
    this._pgp = pgp;
    this._devicestorage = devicestorage;
    this._pgpbuilder = pgpbuilder;
    this._mailreader = mailreader;
}


//
//
// Public API
//
//


/**
 * Initializes the email dao:
 * - assigns _account
 * - initializes _account.folders with the content from memory
 *
 * @param {String} options.account.emailAddress The user's id
 * @param {String} options.account.realname The user's id
 * @param {Function} callback(error, keypair) Invoked with the keypair or error information when the email dao is initialized
 */
Email.prototype.init = function(options, callback) {
    this._account = options.account;
    this._account.busy = 0; // > 0 triggers the spinner
    this._account.online = false;
    this._account.loggingIn = false;

    // init folders from memory
    this._initFoldersFromDisk(callback);
};

/**
 * Unlocks the keychain by either decrypting an existing private key or generating a new keypair
 * @param {String} options.passphrase The passphrase to decrypt the private key
 * @param {Function} callback(error) Invoked when the the keychain is unlocked or when an error occurred buring unlocking
 */
Email.prototype.unlock = function(options, callback) {
    var self = this;

    if (options.keypair) {
        // import existing key pair into crypto module
        handleExistingKeypair(options.keypair);
        return;
    }

    // no keypair for is stored for the user... generate a new one
    self._pgp.generateKeys({
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
        var privKeyParams, pubKeyParams;
        try {
            privKeyParams = self._pgp.getKeyParams(keypair.privateKey.encryptedKey);
            pubKeyParams = self._pgp.getKeyParams(keypair.publicKey.publicKey);
        } catch (e) {
            callback(new Error('Error reading key params!'));
            return;
        }

        // check if key IDs match
        if (!keypair.privateKey._id || keypair.privateKey._id !== keypair.publicKey._id || keypair.privateKey._id !== privKeyParams._id || keypair.publicKey._id !== pubKeyParams._id) {
            callback(new Error('Key IDs dont match!'));
            return;
        }

        // check that key userIds contain email address of user account
        var matchingPrivUserId = _.findWhere(privKeyParams.userIds, {
            emailAddress: self._account.emailAddress
        });
        var matchingPubUserId = _.findWhere(pubKeyParams.userIds, {
            emailAddress: self._account.emailAddress
        });

        if (!matchingPrivUserId || !matchingPubUserId || keypair.privateKey.userId !== self._account.emailAddress || keypair.publicKey.userId !== self._account.emailAddress) {
            callback(new Error('User IDs dont match!'));
            return;
        }

        // import existing key pair into crypto module
        self._pgp.importKeys({
            passphrase: options.passphrase,
            privateKeyArmored: keypair.privateKey.encryptedKey,
            publicKeyArmored: keypair.publicKey.publicKey
        }, function(err) {
            if (err) {
                callback(err);
                return;
            }

            // set decrypted privateKey to pgpMailer
            self._pgpbuilder._privateKey = self._pgp._privateKey;
            callback();
        });
    }

    function handleGenerated(generatedKeypair) {
        // import the new key pair into crypto module
        self._pgp.importKeys({
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
                self._pgpbuilder._privateKey = self._pgp._privateKey;
                callback();
            });
        });
    }
};

/**
 * Opens a folder in IMAP so that we can receive updates for it.
 * Please note that this is a no-op if you try to open the outbox, since it is not an IMAP folder
 * but a virtual folder that only exists on disk.
 *
 * @param {Object} options.folder The folder to be opened
 * @param {Function} callback(error) Invoked when the folder has been opened
 */
Email.prototype.openFolder = function(options, callback) {
    var self = this,
        err;

    if (!self._account.online) {
        err = new Error('Client is currently offline!');
        err.code = 42;
        callback(err);
        return;
    }

    if (options.folder.path === config.outboxMailboxPath) {
        return;
    }

    this._imapClient.selectMailbox({
        path: options.folder.path
    }, callback);
};
/**
 * Synchronizes a folder's contents from disk to memory, i.e. if
 * a message has disappeared from the disk, this method will remove it from folder.messages, and
 * it adds any messages from disk to memory the are not yet in folder.messages
 *
 * @param {Object} options.folder The folder to synchronize
 * @param {Function} callback [description]
 */
Email.prototype.refreshFolder = function(options, callback) {
    var self = this,
        folder = options.folder;

    self.busy();
    folder.messages = folder.messages || [];
    self._localListMessages({
        folder: folder
    }, function(err, storedMessages) {
        if (err) {
            done(err);
            return;
        }

        var storedUids = _.pluck(storedMessages, MSG_ATTR_UID),
            memoryUids = _.pluck(folder.messages, MSG_ATTR_UID),
            newUids = _.difference(storedUids, memoryUids), // uids of messages that are not yet in memory
            removedUids = _.difference(memoryUids, storedUids); // uids of messages that are no longer stored on the disk

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
        self.done(); // stop the spinner
        updateUnreadCount(folder); // update the unread count
        callback(err);
    }
};

/**
 * Fetches a message's headers from IMAP.
 *
 * NB! If we fetch a message whose subject line correspond's to that of a verification message,
 * we try to verify that, and if that worked, we delete the verified message from IMAP.
 *
 * @param {Object} options.folder The folder for which to fetch the message
 * @param {Function} callback(error) Invoked when the message is persisted and added to folder.messages
 */
Email.prototype.fetchMessages = function(options, callback) {
    var self = this,
        folder = options.folder;

    self.busy();

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
                        return bodyPart.type === MSG_PART_TYPE_ATTACHMENT;
                    });
                });

                [].unshift.apply(folder.messages, messages); // add the new messages to the folder
                updateUnreadCount(folder); // update the unread count

                // notify about new messages only for the inbox
                if (folder.type === FOLDER_TYPE_INBOX) {
                    self.onIncomingMessage(messages);
                }
                done();
            });
        }
    });

    function done(err) {
        self.done(); // stop the spinner
        callback(err);
    }

    // Handles verification of public keys, deletion of messages with verified keys
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

            var body = _.pluck(filterBodyParts(parsedBodyParts, MSG_PART_TYPE_TEXT), MSG_PART_ATTR_CONTENT).join('\n'),
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

/**
 * Delete a message from IMAP, disk and folder.messages.
 *
 * Please note that this deletes from disk only if you delete from the outbox,
 * since it is not an IMAP folder but a virtual folder that only exists on disk.
 *
 * @param {Object} options.folder The folder from which to delete the messages
 * @param {Object} options.message The message that should be deleted
 * @param {Boolean} options.localOnly Indicated if the message should not be removed from IMAP
 * @param {Function} callback(error) Invoked when the message was delete, or an error occurred
 */
Email.prototype.deleteMessage = function(options, callback) {
    var self = this,
        folder = options.folder,
        message = options.message;

    self.busy();

    folder.messages.splice(folder.messages.indexOf(message), 1);

    // delete only locally
    if (options.localOnly || options.folder.path === config.outboxMailboxPath) {
        deleteLocal();
        return;
    }

    deleteImap();

    function deleteImap() {
        if (!self._account.online) {
            // no action if we're not online
            done({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        // delete from IMAP
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
        // delete from indexed db
        self._localDeleteMessage({
            folder: folder,
            uid: message.uid
        }, done);
    }

    function done(err) {
        self.done(); // stop the spinner
        if (err) {
            folder.messages.unshift(message); // re-add the message to the folder in case of an error
        }
        updateUnreadCount(folder); // update the unread count, if necessary
        callback(err);
    }
};

/**
 * Updates a message's 'unread' and 'answered' flags
 *
 * Please note if you set flags on disk only if you delete from the outbox,
 * since it is not an IMAP folder but a virtual folder that only exists on disk.
 *
 * @param {[type]} options [description]
 * @param {Function} callback [description]
 */
Email.prototype.setFlags = function(options, callback) {
    var self = this,
        folder = options.folder,
        message = options.message;

    self.busy(); // start the spinner

    // no-op if the message if not present anymore (for whatever reason)
    if (folder.messages.indexOf(message) < 0) {
        self.done(); // stop the spinner
        return;
    }

    // don't do a roundtrip to IMAP,
    // especially if you want to mark outbox messages
    if (options.localOnly || options.folder.path === config.outboxMailboxPath) {
        markStorage();
        return;
    }

    if (!self._account.online) {
        // no action if we're not online
        done({
            errMsg: 'Client is currently offline!',
            code: 42
        });
        return;
    }

    markImap();

    function markImap() {
        // mark a message unread/answered on IMAP
        self._imapMark({
            folder: folder,
            uid: options.message.uid,
            unread: options.message.unread,
            answered: options.message.answered,
            flagged: options.message.flagged
        }, function(err) {
            if (err) {
                done(err);
                return;
            }

            markStorage();
        });
    }

    function markStorage() {
        // angular pollutes that data transfer objects with helper properties (e.g. $$hashKey),
        // which we do not want to persist to disk. in order to avoid that, we load the pristine
        // message from disk, change the flags and re-persist it to disk
        self._localListMessages({
            folder: folder,
            uid: options.message.uid,
        }, function(err, storedMessages) {
            if (err) {
                done(err);
                return;
            }

            // set the flags
            var storedMessage = storedMessages[0];
            storedMessage.unread = options.message.unread;
            storedMessage.flagged = options.message.flagged;
            storedMessage.answered = options.message.answered;
            storedMessage.modseq = options.message.modseq || storedMessage.modseq;

            // store
            self._localStoreMessages({
                folder: folder,
                emails: [storedMessage]
            }, done);
        });
    }

    function done(err) {
        self.done(); // stop the spinner
        updateUnreadCount(folder); // update the unread count
        callback(err);
    }
};

/**
 * Moves a message to another folder
 *
 * @param {Object} options.folder The origin folder
 * @param {Object} options.destination The destination folder
 * @param {Object} options.message The message that should be moved
 * @param {Function} callback(error) Invoked when the message was moved, or an error occurred
 */
Email.prototype.moveMessage = function(options, callback) {
    var self = this,
        folder = options.folder,
        destination = options.destination,
        message = options.message;

    self.busy();

    if (!self._account.online) {
        // no action if we're not online
        done({
            errMsg: 'Client is currently offline!',
            code: 42
        });
        return;
    }

    folder.messages.splice(folder.messages.indexOf(message), 1);

    // delete from IMAP
    self._imapMoveMessage({
        folder: folder,
        destination: destination,
        uid: message.uid
    }, function(err) {
        if (err) {
            // re-add the message to the folder in case of an error, only makes sense if IMAP errors
            folder.messages.unshift(message);
            done(err);
            return;
        }

        // delete from local indexed db, will be synced when new folder is opened
        self._localDeleteMessage({
            folder: folder,
            uid: message.uid
        }, done);
    });

    function done(err) {
        self.done(); // stop the spinner
        updateUnreadCount(folder); // update the unread count, if necessary
        callback(err);
    }
};

/**
 * Streams message content
 * @param {Object} options.message The message for which to retrieve the body
 * @param {Object} options.folder The IMAP folder
 * @param {Function} callback(error, message) Invoked when the message is streamed, or provides information if an error occurred
 */
Email.prototype.getBody = function(options, callback) {
    var self = this,
        message = options.message,
        folder = options.folder;

    // the message either already has a body or is fetching it right now, so no need to become active here
    if (message.loadingBody || typeof message.body !== 'undefined') {
        return;
    }

    message.loadingBody = true;

    self.busy();

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
            // we need to fetch the content for non-attachment body parts (encrypted, signed, text, html, resources referenced from the html)
            // but we spare the effort and fetch attachment content later upon explicit user request.
            var contentParts = localMessage.bodyParts.filter(function(bodyPart) {
                return bodyPart.type !== MSG_PART_TYPE_ATTACHMENT || (bodyPart.type === MSG_PART_TYPE_ATTACHMENT && bodyPart.id);
            });
            var attachmentParts = localMessage.bodyParts.filter(function(bodyPart) {
                return bodyPart.type === MSG_PART_TYPE_ATTACHMENT && !bodyPart.id;
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
            message.body = filterBodyParts(message.bodyParts, MSG_PART_TYPE_ENCRYPTED)[0].content;
            return done();
        }

        var root = message.bodyParts;

        if (message.signed) {
            // PGP/MIME signed
            var signedRoot = filterBodyParts(message.bodyParts, MSG_PART_TYPE_SIGNED)[0]; // in case of a signed message, you only want to show the signed content and ignore the rest
            message.signedMessage = signedRoot.signedMessage;
            message.signature = signedRoot.signature;
            root = signedRoot.content;
        }

        var body = _.pluck(filterBodyParts(root, MSG_PART_TYPE_TEXT), MSG_PART_ATTR_CONTENT).join('\n');

        /*
         * if the message is plain text and contains pgp/inline, we are only interested in the encrypted
         * content, the rest (corporate mail footer, attachments, etc.) is discarded.
         * "-----BEGIN/END (...)-----" must be at the start/end of a line,
         * the regex must not match a pgp block in a plain text reply or forward of a pgp/inline message,
         * the encryption will break for replies/forward, because "> " corrupts the PGP block with non-radix-64 characters,
         */
        var pgpInlineMatch = /^-{5}BEGIN PGP MESSAGE-{5}[\s\S]*-{5}END PGP MESSAGE-{5}$/im.exec(body);
        if (pgpInlineMatch) {
            message.body = pgpInlineMatch[0]; // show the plain text content
            message.encrypted = true; // signal the ui that we're handling encrypted content

            // replace the bodyParts info with an artificial bodyPart of type "encrypted"
            message.bodyParts = [{
                type: MSG_PART_TYPE_ENCRYPTED,
                content: pgpInlineMatch[0],
                _isPgpInline: true // used internally to avoid trying to parse non-MIME text with the mailreader
            }];
            return done();
        }

        /*
         * any content before/after the PGP block will be discarded,
         * "-----BEGIN/END (...)-----" must be at the start/end of a line,
         * after the hash (and possibly other) arbitrary headers, the signed payload begins,
         * the text is followed by a final \n and then the pgp signature begins
         * untrusted attachments and html is ignored
         */
        var clearSignedMatch = /^-{5}BEGIN PGP SIGNED MESSAGE-{5}\nHash:[ ][^\n]+\n(?:[A-Za-z]+:[ ][^\n]+\n)*\n([\s\S]*)\n-{5}BEGIN PGP SIGNATURE-{5}[\S\s]*-{5}END PGP SIGNATURE-{5}$/im.exec(body);
        if (clearSignedMatch) {
            // PGP/INLINE signed
            message.signed = true;
            message.clearSignedMessage = clearSignedMatch[0];
            body = clearSignedMatch[1];
        }

        if (!message.signed) {
            // message is not signed, so we're done here
            return setBody();
        }

        // check the signatures for signed messages
        self._checkSignatures(message, function(err, signaturesValid) {
            if (err) {
                return done(err);
            }

            message.signaturesValid = signaturesValid;
            setBody();
        });

        function setBody() {
            message.body = body;
            if (!message.clearSignedMessage) {
                message.attachments = filterBodyParts(root, MSG_PART_TYPE_ATTACHMENT);
                message.html = _.pluck(filterBodyParts(root, MSG_PART_TYPE_HTML), MSG_PART_ATTR_CONTENT).join('\n');
                inlineExternalImages(message);
            }

            done();
        }
    }


    function done(err) {
        self.done();
        message.loadingBody = false;
        callback(err, err ? undefined : message);
    }
};

Email.prototype._checkSignatures = function(message, callback) {
    var self = this;

    self._keychain.getReceiverPublicKey(message.from[0].address, function(err, senderPublicKey) {
        if (err) {
            return callback(err);
        }

        // get the receiver's public key to check the message signature
        var senderKey = senderPublicKey ? senderPublicKey.publicKey : undefined;

        if (message.clearSignedMessage) {
            self._pgp.verifyClearSignedMessage(message.clearSignedMessage, senderKey, callback);
        } else if (message.signedMessage && message.signature) {
            self._pgp.verifySignedMessage(message.signedMessage, message.signature, senderKey, callback);
        } else {
            callback(null, undefined);
        }
    });
};

/**
 * Retrieves an attachment matching a body part for a given uid and a folder
 *
 * @param {Object} options.folder The folder where to find the attachment
 * @param {Number} options.uid The uid for the message the attachment body part belongs to
 * @param {Object} options.attachment The attachment body part to fetch and parse from IMAP
 * @param {Function} callback(error, attachment) Invoked when the attachment body part was retrieved and parsed, or an error occurred
 */
Email.prototype.getAttachment = function(options, callback) {
    var self = this,
        attachment = options.attachment;

    self.busy();
    attachment.busy = true;
    self._getBodyParts({
        folder: options.folder,
        uid: options.uid,
        bodyParts: [attachment]
    }, function(err, parsedBodyParts) {
        attachment.busy = false;
        if (err) {
            callback(err);
            return;
        }
        self.done();
        // add the content to the original object
        attachment.content = parsedBodyParts[0].content;
        callback(err, err ? undefined : attachment);
    });
};

/**
 * Decrypts a message and replaces sets the decrypted plaintext as the message's body, html, or attachment, respectively.
 * The first encrypted body part's ciphertext (in the content property) will be decrypted.
 *
 * @param {Object} options.message The message
 * @param {Function} callback(error, message)
 */
Email.prototype.decryptBody = function(options, callback) {
    var self = this,
        message = options.message;

    // the message is decrypting has no body, is not encrypted or has already been decrypted
    if (!message.bodyParts || message.decryptingBody || !message.body || !message.encrypted || message.decrypted) {
        callback(null, message);
        return;
    }

    message.decryptingBody = true;

    self.busy();
    // get the sender's public key for signature checking
    self._keychain.getReceiverPublicKey(message.from[0].address, function(err, senderPublicKey) {
        if (err) {
            return done(err);
        }

        // get the receiver's public key to check the message signature
        var encryptedNode = filterBodyParts(message.bodyParts, MSG_PART_TYPE_ENCRYPTED)[0];
        var senderKey = senderPublicKey ? senderPublicKey.publicKey : undefined;
        self._pgp.decrypt(encryptedNode.content, senderKey, function(err, decrypted, signaturesValid) {
            if (err || !decrypted) {
                return showError(err.message || 'An error occurred during the decryption.');
            }

            // if the decryption worked and signatures are present, everything's fine.
            // no error is thrown if signatures are not present
            message.signed = typeof signaturesValid !== 'undefined';
            message.signaturesValid = signaturesValid;

            // if the encrypted node contains pgp/inline, we must not parse it
            // with the mailreader as it is not well-formed MIME
            if (encryptedNode._isPgpInline) {
                message.body = decrypted;
                message.decrypted = true;
                return done();
            }

            // the mailparser works on the .raw property
            encryptedNode.raw = decrypted;

            // parse the decrypted raw content in the mailparser
            self._mailreader.parse({
                bodyParts: [encryptedNode]
            }, function(err, root) {
                if (err) {
                    return showError(err.errMsg || err.message);
                }

                if (!message.signed) {
                    // message had no signature in the ciphertext, so there's a little extra effort to be done here
                    // is there a signed MIME node?
                    var signedRoot = filterBodyParts(root, MSG_PART_TYPE_SIGNED)[0];
                    if (!signedRoot) {
                        // no signed MIME node, obviously an unsigned PGP/MIME message
                        return setBody();
                    }

                    // if there is something signed in here, we're only interested in the signed content
                    message.signedMessage = signedRoot.signedMessage;
                    message.signature = signedRoot.signature;
                    root = signedRoot.content;

                    // check the signatures for encrypted messages
                    self._checkSignatures(message, function(err, signaturesValid) {
                        if (err) {
                            return done(err);
                        }

                        message.signed = typeof signaturesValid !== 'undefined';
                        message.signaturesValid = signaturesValid;
                        setBody();
                    });
                    return;
                }

                // message had a signature in the ciphertext, so we're done here
                setBody();

                function setBody() {
                    // we have successfully interpreted the descrypted message,
                    // so let's update the views on the message parts
                    message.body = _.pluck(filterBodyParts(root, MSG_PART_TYPE_TEXT), MSG_PART_ATTR_CONTENT).join('\n');
                    message.html = _.pluck(filterBodyParts(root, MSG_PART_TYPE_HTML), MSG_PART_ATTR_CONTENT).join('\n');
                    message.attachments = _.reject(filterBodyParts(root, MSG_PART_TYPE_ATTACHMENT), function(attmt) {
                        // remove the pgp-signature from the attachments
                        return attmt.mimeType === "application/pgp-signature";
                    });
                    inlineExternalImages(message);

                    message.decrypted = true;

                    // we're done here!
                    done();
                }
            });
        });
    });

    function showError(msg) {
        message.body = msg;
        message.decrypted = true; // display error msg in body
        done();
    }

    function done(err) {
        self.done();
        message.decryptingBody = false;
        callback(err, err ? undefined : message);
    }
};

/**
 * Encrypted (if necessary) and sends a message with a predefined clear text greeting.
 *
 * @param {Object} options.email The message to be sent
 * @param {Function} callback(error) Invoked when the message was sent, or an error occurred
 */
Email.prototype.sendEncrypted = function(options, callback) {
    var self = this;

    if (!self._account.online) {
        callback({
            errMsg: 'Client is currently offline!',
            code: 42
        });
        return;
    }

    self.busy();
    // mime encode, sign, encrypt and send email via smtp
    self._pgpMailer.send({
        encrypt: true,
        smtpclient: options.smtpclient, // filled solely in the integration test, undefined in normal usage
        mail: options.email,
        publicKeysArmored: options.email.publicKeysArmored
    }, function(err, rfcText) {
        if (err) {
            return callback(err);
        }

        // try to upload to sent, but we don't actually care if the upload failed or not
        // this should not negatively impact the process of sending
        self._uploadToSent({
            message: rfcText
        }, function() {
            self.done();
            callback();
        });
    });
};

/**
 * Sends a signed message in the plain
 *
 * @param {Object} options.email The message to be sent
 * @param {Function} callback(error) Invoked when the message was sent, or an error occurred
 */
Email.prototype.sendPlaintext = function(options, callback) {
    var self = this;

    if (!self._account.online) {
        callback({
            errMsg: 'Client is currently offline!',
            code: 42
        });
        return;
    }
    self.busy();

    // add suffix to plaintext mail
    options.email.body += str.signature + config.cloudUrl + '/' + self._account.emailAddress;

    // mime encode, sign and send email via smtp
    self._pgpMailer.send({
        smtpclient: options.smtpclient, // filled solely in the integration test, undefined in normal usage
        mail: options.email
    }, function(err, rfcText) {
        if (err) {
            return callback(err);
        }

        // try to upload to sent, but we don't actually care if the upload failed or not
        // this should not negatively impact the process of sending
        self._uploadToSent({
            message: rfcText
        }, function() {
            self.done();
            callback();
        });
    });
};

/**
 * Signs and encrypts a message
 *
 * @param {Object} options.email The message to be encrypted
 * @param {Function} callback(error, message) Invoked when the message was encrypted, or an error occurred
 */
Email.prototype.encrypt = function(options, callback) {
    var self = this;

    self.busy();
    self._pgpbuilder.encrypt(options, function(err) {
        self.done();
        callback(err);
    });
};


//
//
// Event Handlers
//
//


/**
 * This handler should be invoked when navigator.onLine === true. It will try to connect a
 * given instance of the imap client. If the connection attempt was successful, it will
 * update the locally available folders with the newly received IMAP folder listing.
 *
 * @param {Object} options.imapClient The IMAP client used to receive messages
 * @param {Object} options.pgpMailer The SMTP client used to send messages
 * @param {Function} callback [description]
 */
Email.prototype.onConnect = function(options, callback) {
    var self = this;

    self._account.loggingIn = true;

    self._imapClient = options.imapClient;
    self._pgpMailer = options.pgpMailer;

    // gmail does not require you to upload to the sent items folder after successful sending, whereas most other providers do
    self.ignoreUploadOnSent = !!options.ignoreUploadOnSent;

    self._imapClient.login(function(err) {
        self._account.loggingIn = false;

        if (err) {
            callback(err);
            return;
        }

        // init folders
        self._initFoldersFromImap(function(err) {
            if (err) {
                callback(err);
                return;
            }

            // attach sync update handler
            self._imapClient.onSyncUpdate = self._onSyncUpdate.bind(self);

            // fill the imap mailboxCache with information we have locally available:
            // - highest locally available moseq (NB! JavaScript can't handle 64 bit uints, so modseq values are strings)
            // - list of locally available uids
            // - highest locally available uid
            // - next expected uid
            var mailboxCache = {};
            self._account.folders.forEach(function(folder) {
                if (folder.messages.length === 0) {
                    return;
                }

                var uids, highestModseq, lastUid;

                uids = _.pluck(folder.messages, MSG_ATTR_UID).sort(function(a, b) {
                    return a - b;
                });
                lastUid = uids[uids.length - 1];

                highestModseq = (_.pluck(folder.messages, 'modseq').sort(function(a, b) {
                    // We treat modseq values as numbers here as an exception, should
                    // be strings everywhere else.
                    // If it turns out that someone actually uses 64 bit uint numbers
                    // that do not fit to the JavaScript number type then we should
                    // use a helper for handling big integers.
                    return (Number(a) || 0) - (Number(b) || 0);
                }).pop() || 0).toString();

                mailboxCache[folder.path] = {
                    exists: lastUid,
                    uidNext: lastUid + 1,
                    uidlist: uids,
                    highestModseq: highestModseq
                };
            });
            self._imapClient.mailboxCache = mailboxCache;

            // set status to online after setting cache to prevent race condition
            self._account.online = true;

            // set up the imap client to listen for changes in the inbox
            var inbox = _.findWhere(self._account.folders, {
                type: FOLDER_TYPE_INBOX
            });

            if (!inbox) {
                return callback();
            }

            self._imapClient.listenForChanges({
                path: inbox.path
            }, callback);
        });
    });
};

/**
 * This handler should be invoked when navigator.onLine === false.
 * It will discard the imap client and pgp mailer
 */
Email.prototype.onDisconnect = function(callback) {
    var self = this;

    // logout of imap-client
    self._imapClient.logout(function() {
        // ignore error, because it's not problem if logout fails
        if (callback) {
            callback();
        }
    });

    // discard clients
    self._account.online = false;
    self._imapClient = undefined;
    self._pgpMailer = undefined;
};

/**
 * The are updates in the IMAP folder of the following type
 * - 'new': a list of uids that are newly available
 * - 'deleted': a list of uids that were deleted from IMAP available
 * - 'messages': a list of messages (uid + flags) that where changes are available
 *
 * @param {String} options.type The type of the update
 * @param {String} options.path The mailbox for which updates are available
 * @param {Array} options.list Array containing update information. Number (uid) or mail with Object (uid and flags), respectively
 */
Email.prototype._onSyncUpdate = function(options) {
    var self = this;

    var folder = _.findWhere(self._account.folders, {
        path: options.path
    });

    if (!folder) {
        // ignore updates for an unknown folder
        return;
    }

    if (options.type === SYNC_TYPE_NEW) {
        // new messages available on imap, fetch from imap and store to disk and memory
        self.fetchMessages({
            folder: folder,
            firstUid: Math.min.apply(null, options.list),
            lastUid: Math.max.apply(null, options.list)
        }, self.onError.bind(self));
    } else if (options.type === SYNC_TYPE_DELETED) {
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
    } else if (options.type === SYNC_TYPE_MSGS) {
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

            // update unread, answered, modseq to the latest info
            message.answered = changedMsg.flags.indexOf('\\Answered') > -1;
            message.unread = changedMsg.flags.indexOf('\\Seen') === -1;
            message.modseq = changedMsg.modseq;

            self.setFlags({
                folder: folder,
                message: message,
                localOnly: true
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
 * Updates the folder information from memory, and adds/removes folders in account.folders.
 * The locally available messages are loaded from memory
 *
 * @param {Function} callback Invoked when the folders are up to date
 */
Email.prototype._initFoldersFromDisk = function(callback) {
    var self = this;

    self.busy(); // start the spinner

    // fetch list from local cache
    self._devicestorage.listItems(FOLDER_DB_TYPE, 0, null, function(err, stored) {
        if (err) {
            return done(err);
        }

        self._account.folders = stored[0] || [];
        self._initMessagesFromDisk(done);
    });

    function done(err) {
        self.done(); // stop the spinner
        callback(err);
    }
};

/**
 * Updates the folder information from imap (if we're online). Adds/removes folders in account.folders,
 * if we added/removed folder in IMAP. If we have an uninitialized folder that lacks folder.messages,
 * all the locally available messages are loaded from memory.
 *
 * @param {Function} callback Invoked when the folders are up to date
 */
Email.prototype._initFoldersFromImap = function(callback) {
    var self = this;

    self.busy(); // start the spinner

    // fetch list from imap server
    self._imapClient.listWellKnownFolders(function(err, wellKnownFolders) {
        var foldersChanged = false, // indicates if we need to persist anything to disk
            imapFolders = []; // aggregate all the imap folders

        if (err) {
            return done(err);
        }

        // initialize the folders to something meaningful if that hasn't already happened
        self._account.folders = self._account.folders || [];

        // smuggle the outbox into the well known folders, which is obv not present on imap
        wellKnownFolders[config.outboxMailboxType] = [{
            name: config.outboxMailboxName,
            type: config.outboxMailboxType,
            path: config.outboxMailboxPath
        }];

        // aggregate all of the imap folders in one place
        for (var folderType in wellKnownFolders) {
            if (wellKnownFolders.hasOwnProperty(folderType) && Array.isArray(wellKnownFolders[folderType])) {
                imapFolders = imapFolders.concat(wellKnownFolders[folderType]);
            }
        }

        // find out all the imap paths that are new/removed
        var imapFolderPaths = _.pluck(imapFolders, 'path'),
            localFolderPaths = _.pluck(self._account.folders, 'path'),
            newFolderPaths = _.difference(imapFolderPaths, localFolderPaths),
            removedFolderPaths = _.difference(localFolderPaths, imapFolderPaths);

        // folders need updating if there are new/removed folders
        foldersChanged = !!newFolderPaths.length || !!removedFolderPaths.length;

        // remove all the remotely deleted folders
        removedFolderPaths.forEach(function(removedPath) {
            self._account.folders.splice(self._account.folders.indexOf(_.findWhere(self._account.folders, {
                path: removedPath
            })), 1);
        });

        // add all the new imap folders
        newFolderPaths.forEach(function(newPath) {
            self._account.folders.push(_.findWhere(imapFolders, {
                path: newPath
            }));
        });

        //
        // by now, all the folders are up to date. now we need to find all the well known folders
        //

        // check for the well known folders to be displayed in the uppermost ui part
        // in that order
        var wellknownTypes = [
            FOLDER_TYPE_INBOX,
            FOLDER_TYPE_SENT,
            config.outboxMailboxType,
            FOLDER_TYPE_DRAFTS,
            FOLDER_TYPE_TRASH,
            FOLDER_TYPE_FLAGGED
        ];

        // make sure the well known folders are detected
        wellknownTypes.forEach(function(mbxType) {
            // check if there is a well known folder of this type
            var wellknownFolder = _.findWhere(self._account.folders, {
                type: mbxType,
                wellknown: true
            });

            if (wellknownFolder) {
                // well known folder found, no need to find a replacement
                return;
            }

            // we have no folder of the respective type marked as wellknown, so find the
            // next best folder of the respective type and flag it as wellknown so that
            // we can display it properly
            wellknownFolder = _.findWhere(self._account.folders, {
                type: mbxType
            });

            if (!wellknownFolder) {
                // no folder of that type, to mark as well known, nothing to do here
                return;
            }

            wellknownFolder.wellknown = true;
            foldersChanged = true;
        });

        // order folders
        self._account.folders.sort(function(a, b) {
            if (a.wellknown && b.wellknown) {
                // well known folders should be ordered like the types in the wellknownTypes array
                return wellknownTypes.indexOf(a.type) - wellknownTypes.indexOf(b.type);
            } else if (a.wellknown && !b.wellknown) {
                // wellknown folders should always appear BEFORE the other folders
                return -1;
            } else if (!a.wellknown && b.wellknown) {
                // non-wellknown folders should always appear AFTER wellknown folders
                return 1;
            } else {
                // non-wellknown folders should be sorted case-insensitive
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            }
        });

        // if folders have not changed, can fill them with messages directly
        if (!foldersChanged) {
            return self._initMessagesFromDisk(done);
        }

        // persist encrypted list in device storage
        // note: the folders in the ui also include the messages array, so let's create a clean array here
        var folders = self._account.folders.map(function(folder) {
            return {
                name: folder.name,
                path: folder.path,
                type: folder.type,
                wellknown: !!folder.wellknown
            };
        });

        self._devicestorage.storeList([folders], FOLDER_DB_TYPE, function(err) {
            if (err) {
                return done(err);
            }

            self._initMessagesFromDisk(done);
        });
    });

    function done(err) {
        self.done(); // stop the spinner
        callback(err);
    }
};

/**
 * Fill uninitialized folders with the locally available messages.
 *
 * @param {Function} callback Invoked when the folders are filled with messages
 */
Email.prototype._initMessagesFromDisk = function(callback) {
    var self = this;

    if (!self._account.folders || self._account.folders.length === 0) {
        return callback();
    }

    var after = _.after(self._account.folders.length, callback);

    self._account.folders.forEach(function(folder) {
        if (folder.messages) {
            // the folder is already initialized
            return after();
        }

        // sync messages from disk to the folder model
        self.refreshFolder({
            folder: folder
        }, function(err) {
            if (err) {
                return callback(err);
            }

            after();
        });
    });
};

Email.prototype.busy = function() {
    this._account.busy++;
};

Email.prototype.done = function() {
    if (this._account.busy > 0) {
        this._account.busy--;
    }
};



//
//
// IMAP API
//
//

/**
 * Mark messages as un-/read or un-/answered on IMAP
 *
 * @param {Object} options.folder The folder where to find the message
 * @param {Number} options.uid The uid for which to change the flags
 * @param {Number} options.unread Un-/Read flag
 * @param {Number} options.answered Un-/Answered flag
 */
Email.prototype._imapMark = function(options, callback) {
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

/**
 * If we're in the trash folder or no trash folder is available, this deletes a message from IMAP.
 * Otherwise, it moves a message to the trash folder.
 *
 * @param {Object} options.folder The folder where to find the message
 * @param {Number} options.uid The uid of the message
 * @param {Function} callback(error) Callback with an error object in case something went wrong.
 */
Email.prototype._imapDeleteMessage = function(options, callback) {
    if (!this._account.online) {
        callback({
            errMsg: 'Client is currently offline!',
            code: 42
        });
        return;
    }

    var trash = _.findWhere(this._account.folders, {
        type: FOLDER_TYPE_TRASH
    });

    // there's no known trash folder to move the mail to or we're in the trash folder, so we can purge the message
    if (!trash || options.folder === trash) {
        this._imapClient.deleteMessage({
            path: options.folder.path,
            uid: options.uid
        }, callback);

        return;
    }

    this._imapMoveMessage({
        folder: options.folder,
        destination: trash,
        uid: options.uid
    }, callback);
};

/**
 * Move stuff around on the server
 *
 * @param {String} options.folder The folder
 * @param {Number} options.destination The destination folder
 * @param {String} options.uid the message's uid
 * @param {Function} callback (error) The callback when the message is moved
 */
Email.prototype._imapMoveMessage = function(options, callback) {
    this._imapClient.moveMessage({
        path: options.folder.path,
        destination: options.destination.path,
        uid: options.uid
    }, callback);
};


/**
 * Get list messsage headers without the body
 *
 * @param {String} options.folder The folder
 * @param {Number} options.firstUid The lower bound of the uid (inclusive)
 * @param {Number} options.lastUid The upper bound of the uid range (inclusive)
 * @param {Function} callback (error, messages) The callback when the imap client is done fetching message metadata
 */
Email.prototype._imapListMessages = function(options, callback) {
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
 * Uploads a built message to a folder
 *
 * @param {Object} options.folder The folder where to find the message
 * @param {String} options.message The rfc2822 compatible raw ASCII e-mail source
 * @param {Function} callback (error) The callback when the imap client is done uploading
 */
Email.prototype._imapUploadMessage = function(options, callback) {
    this._imapClient.uploadMessage({
        path: options.folder.path,
        message: options.message
    }, callback);
};

/**
 * Stream an email messsage's body
 * @param {String} options.folder The folder
 * @param {String} options.uid the message's uid
 * @param {Object} options.bodyParts The message, as retrieved by _imapListMessages
 * @param {Function} callback (error, message) The callback when the imap client is done streaming message text content
 */
Email.prototype._getBodyParts = function(options, callback) {
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


/**
 * List the locally available items form the indexed db stored under "email_[FOLDER PATH]_[MESSAGE UID]" (if a message was provided),
 * or "email_[FOLDER PATH]", respectively
 *
 * @param {Object} options.folder The folder for which to list the content
 * @param {Object} options.uid A specific uid to look up locally in the folder
 * @param {Function} callback(error, list) Invoked with the results of the query, or further information, if an error occurred
 */
Email.prototype._localListMessages = function(options, callback) {
    var dbType = 'email_' + options.folder.path + (options.uid ? '_' + options.uid : '');
    this._devicestorage.listItems(dbType, 0, null, callback);
};

/**
 * Stores a bunch of messages to the indexed db. The messages are stored under "email_[FOLDER PATH]_[MESSAGE UID]"
 *
 * @param {Object} options.folder The folder for which to list the content
 * @param {Array} options.messages The messages to store
 * @param {Function} callback(error, list) Invoked with the results of the query, or further information, if an error occurred
 */
Email.prototype._localStoreMessages = function(options, callback) {
    var dbType = 'email_' + options.folder.path;
    this._devicestorage.storeList(options.emails, dbType, callback);
};

/**
 * Stores a bunch of messages to the indexed db. The messages are stored under "email_[FOLDER PATH]_[MESSAGE UID]"
 *
 * @param {Object} options.folder The folder for which to list the content
 * @param {Array} options.messages The messages to store
 * @param {Function} callback(error, list) Invoked with the results of the query, or further information, if an error occurred
 */
Email.prototype._localDeleteMessage = function(options, callback) {
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
// Internal Helper Methods
//
//

/**
 * Uploads a message to the sent folder, if necessary.
 * Calls back immediately if ignoreUploadOnSent == true or not sent folder was found.
 *
 * @param {String} options.message The rfc2822 compatible raw ASCII e-mail source
 * @param {Function} callback (error) The callback when the imap client is done uploading
 */
Email.prototype._uploadToSent = function(options, callback) {
    var self = this;

    self.busy();

    // upload the sent message to the sent folder if necessary
    var sentFolder = _.findWhere(self._account.folders, {
        type: FOLDER_TYPE_SENT
    });

    // return for wrong usage
    if (self.ignoreUploadOnSent || !sentFolder || !options.message) {
        self.done();
        return callback();
    }

    // upload
    self._imapUploadMessage({
        folder: sentFolder,
        message: options.message
    }, function(err) {
        self.done();
        callback(err);
    });
};



//
//
// External Heler Methods
//
//

/**
 * Checks whether we need to upload to the sent folder after sending an email.
 *
 * @param {String} hostname The hostname to check
 * @return {Boolean} true if upload can be ignored, otherwise false
 */
Email.prototype.checkIgnoreUploadOnSent = function(hostname) {
    for (var i = 0; i < config.ignoreUploadOnSentDomains.length; i++) {
        if (config.ignoreUploadOnSentDomains[i].test(hostname)) {
            return true;
        }
    }

    return false;
};


//
//
// Helper Functions
//
//


/**
 * Updates a folder's unread count:
 * - For the outbox, that's the total number of messages,
 * - For every other folder, it's the number of unread messages
 */
function updateUnreadCount(folder) {
    var allMsgs = folder.messages.length,
        unreadMsgs = _.filter(folder.messages, function(msg) {
            return msg.unread;
        }).length;

    folder.count = folder.path === config.outboxMailboxPath ? allMsgs : unreadMsgs;
}

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

/**
 * Helper function that looks through the HTML content for <img src="cid:..."> and
 * inlines the images linked internally. Manipulates message.html as a side-effect.
 * If no attachment matching the internal reference is found, or constructing a data
 * uri fails, just remove the source.
 *
 * @param {Object} message DTO
 */
function inlineExternalImages(message) {
    message.html = message.html.replace(/(<img[^>]+\bsrc=['"])cid:([^'">]+)(['"])/ig, function(match, prefix, src, suffix) {
        var localSource = '',
            payload = '';

        var internalReference = _.findWhere(message.attachments, {
            id: src
        });

        if (internalReference) {
            for (var i = 0; i < internalReference.content.byteLength; i++) {
                payload += String.fromCharCode(internalReference.content[i]);
            }

            try {
                localSource = 'data:application/octet-stream;base64,' + btoa(payload); // try to replace the source
            } catch (e) {}
        }

        return prefix + localSource + suffix;
    });
}