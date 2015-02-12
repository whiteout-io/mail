'use strict';

var ngModule = angular.module('woEmail');
ngModule.service('email', Email);
module.exports = Email;

var config = require('../app-config').config,
    str = require('../app-config').string,
    axe = require('axe-logger'),
    PgpMailer = require('pgpmailer'),
    ImapClient = require('imap-client');

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
function Email(keychain, pgp, accountStore, pgpbuilder, mailreader, dialog, appConfig, auth) {
    this._keychain = keychain;
    this._pgp = pgp;
    this._devicestorage = accountStore;
    this._pgpbuilder = pgpbuilder;
    this._mailreader = mailreader;
    this._dialog = dialog;
    this._appConfig = appConfig;
    this._auth = auth;
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
 * @return {Promise}
 * @resolve {Object} keypair
 */
Email.prototype.init = function(options) {
    this._account = options.account;
    this._account.busy = 0; // > 0 triggers the spinner
    this._account.online = false;
    this._account.loggingIn = false;

    // init folders from memory
    return this._initFoldersFromDisk();
};

/**
 * Unlocks the keychain by either decrypting an existing private key or generating a new keypair
 * @param {String} options.passphrase The passphrase to decrypt the private key
 */
Email.prototype.unlock = function(options) {
    var self = this,
        generatedKeypair;

    if (options.keypair) {
        // import existing key pair into crypto module
        return handleExistingKeypair(options.keypair);
    }

    // no keypair for is stored for the user... generate a new one
    return self._pgp.generateKeys({
        emailAddress: self._account.emailAddress,
        realname: options.realname,
        keySize: self._account.asymKeySize,
        passphrase: options.passphrase
    }).then(function(keypair) {
        generatedKeypair = keypair;
        // import the new key pair into crypto module
        return self._pgp.importKeys({
            passphrase: options.passphrase,
            privateKeyArmored: generatedKeypair.privateKeyArmored,
            publicKeyArmored: generatedKeypair.publicKeyArmored
        });

    }).then(function() {
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

        return self._keychain.putUserKeyPair(newKeypair);

    }).then(setPrivateKey);

    function handleExistingKeypair(keypair) {
        return new Promise(function(resolve) {
            var privKeyParams = self._pgp.getKeyParams(keypair.privateKey.encryptedKey);
            var pubKeyParams = self._pgp.getKeyParams(keypair.publicKey.publicKey);

            // check if key IDs match
            if (!keypair.privateKey._id || keypair.privateKey._id !== keypair.publicKey._id || keypair.privateKey._id !== privKeyParams._id || keypair.publicKey._id !== pubKeyParams._id) {
                throw new Error('Key IDs dont match!');
            }

            // check that key userIds contain email address of user account
            var matchingPrivUserId = _.findWhere(privKeyParams.userIds, {
                emailAddress: self._account.emailAddress
            });
            var matchingPubUserId = _.findWhere(pubKeyParams.userIds, {
                emailAddress: self._account.emailAddress
            });

            if (!matchingPrivUserId || !matchingPubUserId || keypair.privateKey.userId !== self._account.emailAddress || keypair.publicKey.userId !== self._account.emailAddress) {
                throw new Error('User IDs dont match!');
            }
            resolve();

        }).then(function() {
            // import existing key pair into crypto module
            return self._pgp.importKeys({
                passphrase: options.passphrase,
                privateKeyArmored: keypair.privateKey.encryptedKey,
                publicKeyArmored: keypair.publicKey.publicKey
            });

        }).then(setPrivateKey);
    }

    function setPrivateKey() {
        // set decrypted privateKey to pgpMailer
        self._pgpbuilder._privateKey = self._pgp._privateKey;
    }
};

/**
 * Opens a folder in IMAP so that we can receive updates for it.
 * Please note that this is a no-op if you try to open the outbox, since it is not an IMAP folder
 * but a virtual folder that only exists on disk.
 *
 * @param {Object} options.folder The folder to be opened
 */
Email.prototype.openFolder = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        self.checkOnline();
        resolve();

    }).then(function() {
        if (options.folder.path !== config.outboxMailboxPath) {
            return self._imapClient.selectMailbox({
                path: options.folder.path
            });
        }
    });
};
/**
 * Synchronizes a folder's contents from disk to memory, i.e. if
 * a message has disappeared from the disk, this method will remove it from folder.messages, and
 * it adds any messages from disk to memory the are not yet in folder.messages
 *
 * @param {Object} options.folder The folder to synchronize
 */
Email.prototype.refreshFolder = function(options) {
    var self = this,
        folder = options.folder;

    self.busy();
    folder.messages = folder.messages || [];

    return self._localListMessages({
        folder: folder
    }).then(function(storedMessages) {
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

    }).then(done).catch(done);

    function done(err) {
        self.done(); // stop the spinner
        updateUnreadCount(folder); // update the unread count

        if (err) {
            throw err;
        }
    }
};

/**
 * Fetches a message's headers from IMAP.
 *
 * NB! If we fetch a message whose subject line correspond's to that of a verification message,
 * we try to verify that, and if that worked, we delete the verified message from IMAP.
 *
 * @param {Object} options.folder The folder for which to fetch the message
 */
Email.prototype.fetchMessages = function(options) {
    var self = this,
        folder = options.folder,
        messages;

    self.busy();

    return new Promise(function(resolve) {
        self.checkOnline();
        resolve();

    }).then(function() {
        // list the messages starting from the lowest new uid to the highest new uid
        return self._imapListMessages(options);

    }).then(function(msgs) {
        messages = msgs;
        // if there are verification messages in the synced messages, handle it
        var verificationMessages = _.filter(messages, function(message) {
            return message.subject === str.verificationSubject;
        });

        // if there are verification messages, continue after we've tried to verify
        if (verificationMessages.length > 0) {
            var jobs = [];
            verificationMessages.forEach(function(verificationMessage) {
                var promise = handleVerification(verificationMessage).then(function() {
                    // if verification worked, we remove the mail from the list.
                    messages.splice(messages.indexOf(verificationMessage), 1);
                }).catch(function() {
                    // if it was NOT a valid verification mail, do nothing
                    // if an error occurred and the mail was a valid verification mail,
                    // keep the mail in the list so the user can see it and verify manually
                });
                jobs.push(promise);
            });
            return Promise.all(jobs);
        }

    }).then(function() {
        if (_.isEmpty(messages)) {
            // nothing to do, we're done here
            return;
        }

        // persist the encrypted message to the local storage
        return self._localStoreMessages({
            folder: folder,
            emails: messages
        }).then(function() {
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
        });

    }).then(done).catch(done);

    function done(err) {
        self.done(); // stop the spinner
        if (err) {
            throw err;
        }
    }

    // Handles verification of public keys, deletion of messages with verified keys
    function handleVerification(message) {
        return self._getBodyParts({
            folder: folder,
            uid: message.uid,
            bodyParts: message.bodyParts
        }).then(function(parsedBodyParts) {
            var body = _.pluck(filterBodyParts(parsedBodyParts, MSG_PART_TYPE_TEXT), MSG_PART_ATTR_CONTENT).join('\n'),
                verificationUrlPrefix = config.cloudUrl + config.verificationUrl,
                uuid = body.split(verificationUrlPrefix).pop().substr(0, config.verificationUuidLength),
                uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

            // there's no valid uuid in the message, so forget about it
            if (!uuidRegex.test(uuid)) {
                throw new Error('No public key verifier found!');
            }

            // there's a valid uuid in the message, so try to verify it
            return self._keychain.verifyPublicKey(uuid).catch(function(err) {
                throw new Error('Verifying your public key failed: ' + err.message);
            });

        }).then(function() {
            // public key has been verified, delete the message
            return self._imapDeleteMessage({
                folder: folder,
                uid: message.uid
            }).catch(function() {
                // if we could successfully not delete the message or not doesn't matter.
                // just don't show it in whiteout and keep quiet about it
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
 * @return {Promise}
 */
Email.prototype.deleteMessage = function(options) {
    var self = this,
        folder = options.folder,
        message = options.message;

    self.busy();

    folder.messages.splice(folder.messages.indexOf(message), 1);

    // delete only locally
    if (options.localOnly || options.folder.path === config.outboxMailboxPath) {
        return deleteLocal().then(done).catch(done);
    }

    return new Promise(function(resolve) {
        self.checkOnline();
        resolve();

    }).then(function() {
        // delete from IMAP
        return self._imapDeleteMessage({
            folder: folder,
            uid: message.uid
        });

    }).then(function() {
        return deleteLocal();
    }).then(done).catch(done);

    function deleteLocal() {
        // delete from indexed db
        return self._localDeleteMessage({
            folder: folder,
            uid: message.uid
        });
    }

    function done(err) {
        self.done(); // stop the spinner
        updateUnreadCount(folder); // update the unread count, if necessary

        if (err) {
            folder.messages.unshift(message); // re-add the message to the folder in case of an error
            throw err;
        }
    }
};

/**
 * Updates a message's 'unread' and 'answered' flags
 *
 * Please note if you set flags on disk only if you delete from the outbox,
 * since it is not an IMAP folder but a virtual folder that only exists on disk.
 *
 * @param {Object} options.folder The origin folder
 * @param {Object} options.message The message that should change flags
 * @return {Promise}
 */
Email.prototype.setFlags = function(options) {
    var self = this,
        folder = options.folder,
        message = options.message;

    // no-op if the message if not present anymore (for whatever reason)
    if (folder.messages.indexOf(message) < 0) {
        return new Promise(function(resolve) {
            resolve();
        });
    }

    self.busy(); // start the spinner

    // don't do a roundtrip to IMAP,
    // especially if you want to mark outbox messages
    if (options.localOnly || options.folder.path === config.outboxMailboxPath) {
        return markStorage().then(done).catch(done);
    }

    return new Promise(function(resolve) {
        self.checkOnline();
        resolve();

    }).then(function() {
        // mark a message unread/answered on IMAP
        return self._imapMark({
            folder: folder,
            uid: options.message.uid,
            unread: options.message.unread,
            answered: options.message.answered,
            flagged: options.message.flagged
        });

    }).then(function() {
        return markStorage();

    }).then(done).catch(done);

    function markStorage() {
        // angular pollutes that data transfer objects with helper properties (e.g. $$hashKey),
        // which we do not want to persist to disk. in order to avoid that, we load the pristine
        // message from disk, change the flags and re-persist it to disk
        return self._localListMessages({
            folder: folder,
            uid: options.message.uid,
        }).then(function(storedMessages) {
            // set the flags
            var storedMessage = storedMessages[0];

            if (!storedMessage) {
                // the message has been deleted in the meantime
                return;
            }

            storedMessage.unread = options.message.unread;
            storedMessage.flagged = options.message.flagged;
            storedMessage.answered = options.message.answered;
            storedMessage.modseq = options.message.modseq || storedMessage.modseq;

            // store
            return self._localStoreMessages({
                folder: folder,
                emails: [storedMessage]
            });
        });
    }

    function done(err) {
        self.done(); // stop the spinner
        updateUnreadCount(folder); // update the unread count
        if (err) {
            throw err;
        }
    }
};

/**
 * Moves a message to another folder
 *
 * @param {Object} options.folder The origin folder
 * @param {Object} options.destination The destination folder
 * @param {Object} options.message The message that should be moved
 * @return {Promise}
 */
Email.prototype.moveMessage = function(options) {
    var self = this,
        folder = options.folder,
        destination = options.destination,
        message = options.message;

    self.busy();
    return new Promise(function(resolve) {
        self.checkOnline();
        resolve();

    }).then(function() {
        folder.messages.splice(folder.messages.indexOf(message), 1);

        // delete from IMAP
        return self._imapMoveMessage({
            folder: folder,
            destination: destination,
            uid: message.uid
        }).catch(function(err) {
            // re-add the message to the folder in case of an error, only makes sense if IMAP errors
            folder.messages.unshift(message);
            done(err);
        });

    }).then(function() {
        // delete from local indexed db, will be synced when new folder is opened
        return self._localDeleteMessage({
            folder: folder,
            uid: message.uid
        });

    }).then(done).catch(done);

    function done(err) {
        self.done(); // stop the spinner
        updateUnreadCount(folder); // update the unread count, if necessary
        if (err) {
            throw err;
        }
    }
};

/**
 * Streams message content
 * @param {Object} options.message The message for which to retrieve the body
 * @param {Object} options.folder The IMAP folder
 * @return {Promise}
 * @resolve {Object}    The message object that was streamed
 */
Email.prototype.getBody = function(options) {
    var self = this,
        message = options.message,
        folder = options.folder,
        localMessage, attachmentParts;

    // the message either already has a body or is fetching it right now, so no need to become active here
    if (message.loadingBody || typeof message.body !== 'undefined') {
        return new Promise(function(resolve) {
            resolve();
        });
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

    // load the local message from memory
    return self._localListMessages({
        folder: folder,
        uid: message.uid
    }).then(function(localMessages) {
        if (localMessages.length === 0) {
            return;
        }

        localMessage = localMessages[0];

        // treat attachment and non-attachment body parts separately:
        // we need to fetch the content for non-attachment body parts (encrypted, signed, text, html, resources referenced from the html)
        // but we spare the effort and fetch attachment content later upon explicit user request.
        var contentParts = localMessage.bodyParts.filter(function(bodyPart) {
            return bodyPart.type !== MSG_PART_TYPE_ATTACHMENT || (bodyPart.type === MSG_PART_TYPE_ATTACHMENT && bodyPart.id);
        });
        attachmentParts = localMessage.bodyParts.filter(function(bodyPart) {
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
            return;
        }

        // get the raw content from the imap server
        return self._getBodyParts({
            folder: folder,
            uid: localMessage.uid,
            bodyParts: contentParts
        }).then(function(parsedBodyParts) {
            // piece together the parsed bodyparts and the empty attachments which have not been parsed
            message.bodyParts = parsedBodyParts.concat(attachmentParts);
            localMessage.bodyParts = parsedBodyParts.concat(attachmentParts);

            // persist it to disk
            return self._localStoreMessages({
                folder: folder,
                emails: [localMessage]
            });
        });

    }).then(function() {
        // extract the content
        if (message.encrypted) {
            // show the encrypted message
            message.body = filterBodyParts(message.bodyParts, MSG_PART_TYPE_ENCRYPTED)[0].content;
            return;
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
            return;
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
            return setBody(body, root);
        }

        // check the signatures for signed messages
        return self._checkSignatures(message).then(function(signaturesValid) {
            message.signaturesValid = signaturesValid;
            setBody(body, root);
        });

    }).then(function() {
        self.done();
        message.loadingBody = false;
        return message;

    }).catch(function(err) {
        self.done();
        message.loadingBody = false;
        throw err;
    });

    function setBody(body, root) {
        message.body = body;
        if (!message.clearSignedMessage) {
            message.attachments = filterBodyParts(root, MSG_PART_TYPE_ATTACHMENT);
            message.html = _.pluck(filterBodyParts(root, MSG_PART_TYPE_HTML), MSG_PART_ATTR_CONTENT).join('\n');
            inlineExternalImages(message);
        }
    }
};

Email.prototype._checkSignatures = function(message) {
    var self = this;
    return self._keychain.getReceiverPublicKey(message.from[0].address).then(function(senderPublicKey) {
        // get the receiver's public key to check the message signature
        var senderKey = senderPublicKey ? senderPublicKey.publicKey : undefined;
        if (message.clearSignedMessage) {
            return self._pgp.verifyClearSignedMessage(message.clearSignedMessage, senderKey);
        } else if (message.signedMessage && message.signature) {
            return self._pgp.verifySignedMessage(message.signedMessage, message.signature, senderKey);
        }
    });
};

/**
 * Retrieves an attachment matching a body part for a given uid and a folder
 *
 * @param {Object} options.folder The folder where to find the attachment
 * @param {Number} options.uid The uid for the message the attachment body part belongs to
 * @param {Object} options.attachment The attachment body part to fetch and parse from IMAP
 * @return {Promise}
 * @resolve {Object} attachment    The attachment body part that was retrieved and parsed
 */
Email.prototype.getAttachment = function(options) {
    var self = this,
        attachment = options.attachment;

    attachment.busy = true;
    return self._getBodyParts({
        folder: options.folder,
        uid: options.uid,
        bodyParts: [attachment]
    }).then(function(parsedBodyParts) {
        attachment.busy = false;
        // add the content to the original object
        attachment.content = parsedBodyParts[0].content;
        return attachment;

    }).catch(function(err) {
        attachment.busy = false;
        throw err;
    });
};

/**
 * Decrypts a message and replaces sets the decrypted plaintext as the message's body, html, or attachment, respectively.
 * The first encrypted body part's ciphertext (in the content property) will be decrypted.
 *
 * @param {Object} options.message The message
 * @return {Promise}
 * @resolve {Object} message    The decrypted message object
 */
Email.prototype.decryptBody = function(options) {
    var self = this,
        message = options.message,
        encryptedNode;

    // the message is decrypting has no body, is not encrypted or has already been decrypted
    if (!message.bodyParts || message.decryptingBody || !message.body || !message.encrypted || message.decrypted) {
        return new Promise(function(resolve) {
            resolve(message);
        });
    }

    message.decryptingBody = true;
    self.busy();

    // get the sender's public key for signature checking
    return self._keychain.getReceiverPublicKey(message.from[0].address).then(function(senderPublicKey) {
        // get the receiver's public key to check the message signature
        encryptedNode = filterBodyParts(message.bodyParts, MSG_PART_TYPE_ENCRYPTED)[0];
        var senderKey = senderPublicKey ? senderPublicKey.publicKey : undefined;
        return self._pgp.decrypt(encryptedNode.content, senderKey);

    }).then(function(pt) {
        if (!pt.decrypted) {
            throw new Error('Error decrypting message.');
        }

        // if the decryption worked and signatures are present, everything's fine.
        // no error is thrown if signatures are not present
        message.signed = typeof pt.signaturesValid !== 'undefined';
        message.signaturesValid = pt.signaturesValid;

        // if the encrypted node contains pgp/inline, we must not parse it
        // with the mailreader as it is not well-formed MIME
        if (encryptedNode._isPgpInline) {
            message.body = pt.decrypted;
            message.decrypted = true;
            return;
        }

        // the mailparser works on the .raw property
        encryptedNode.raw = pt.decrypted;
        // parse the decrypted raw content in the mailparser
        return self._parse({
            bodyParts: [encryptedNode]
        }).then(handleRaw);

    }).then(function() {
        self.done(); // stop the spinner
        message.decryptingBody = false;
        return message;

    }).catch(function(err) {
        self.done(); // stop the spinner
        message.decryptingBody = false;
        message.body = err.message; // display error msg in body
        message.decrypted = true;
        return message;
    });

    function handleRaw(root) {
        if (message.signed) {
            // message had a signature in the ciphertext, so we're done here
            return setBody(root);
        }

        // message had no signature in the ciphertext, so there's a little extra effort to be done here
        // is there a signed MIME node?
        var signedRoot = filterBodyParts(root, MSG_PART_TYPE_SIGNED)[0];
        if (!signedRoot) {
            // no signed MIME node, obviously an unsigned PGP/MIME message
            return setBody(root);
        }

        // if there is something signed in here, we're only interested in the signed content
        message.signedMessage = signedRoot.signedMessage;
        message.signature = signedRoot.signature;
        root = signedRoot.content;

        // check the signatures for encrypted messages
        return self._checkSignatures(message).then(function(signaturesValid) {
            message.signed = typeof signaturesValid !== 'undefined';
            message.signaturesValid = signaturesValid;
            return setBody(root);
        });
    }

    function setBody(root) {
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
        return message;
    }
};

/**
 * Encrypted (if necessary) and sends a message with a predefined clear text greeting.
 *
 * @param {Object} options.email The message to be sent
 * @param {Object} mailer an instance of the pgpmailer to be used for testing purposes only
 */
Email.prototype.sendEncrypted = function(options, mailer) {
    // mime encode, sign, encrypt and send email via smtp
    return this._sendGeneric({
        encrypt: true,
        smtpclient: options.smtpclient, // filled solely in the integration test, undefined in normal usage
        mail: options.email,
        publicKeysArmored: options.email.publicKeysArmored
    }, mailer);
};

/**
 * Sends a signed message in the plain
 *
 * @param {Object} options.email The message to be sent
 * @param {Object} mailer an instance of the pgpmailer to be used for testing purposes only
 */
Email.prototype.sendPlaintext = function(options, mailer) {
    // add suffix to plaintext mail
    options.email.body += str.signature + config.cloudUrl + '/' + this._account.emailAddress;
    // mime encode, sign and send email via smtp
    return this._sendGeneric({
        smtpclient: options.smtpclient, // filled solely in the integration test, undefined in normal usage
        mail: options.email
    }, mailer);
};

/**
 * This funtion wraps error handling for sending via pgpMailer and uploading to imap.
 * @param {Object} options.email The message to be sent
 * @param {Object} mailer an instance of the pgpmailer to be used for testing purposes only
 */
Email.prototype._sendGeneric = function(options, mailer) {
    var self = this;
    self.busy();
    return new Promise(function(resolve) {
        self.checkOnline();
        resolve();

    }).then(function() {
        // get the smtp credentials
        return self._auth.getCredentials();

    }).then(function(credentials) {
        // gmail does not require you to upload to the sent items folder after successful sending, whereas most other providers do
        self.ignoreUploadOnSent = self.checkIgnoreUploadOnSent(credentials.smtp.host);

        // tls socket worker path for multithreaded tls in non-native tls environments
        credentials.smtp.tlsWorkerPath = config.workerPath + '/tcp-socket-tls-worker.min.js';

        // create a new pgpmailer
        self._pgpMailer = (mailer || new PgpMailer(credentials.smtp, self._pgpbuilder));

        // certificate update retriggers sending after cert update is persisted
        self._pgpMailer.onCert = self._auth.handleCertificateUpdate.bind(self._auth, 'smtp', self._sendGeneric.bind(self, options), self._dialog.error);
    }).then(function() {

        // send the email
        return self._pgpMailer.send(options);
    }).then(function(rfcText) {
        // try to upload to sent, but we don't actually care if the upload failed or not
        // this should not negatively impact the process of sending
        return self._uploadToSent({
            message: rfcText
        }).catch(function() {});

    }).then(done).catch(done);

    function done(err) {
        self.done(); // stop the spinner
        if (err) {
            throw err;
        }
    }
};

/**
 * Signs and encrypts a message
 *
 * @param {Object} options.email The message to be encrypted
 * @param {Function} callback(message) Invoked when the message was encrypted, or an error occurred
 */
Email.prototype.encrypt = function(options) {
    var self = this;
    self.busy();
    return self._pgpbuilder.encrypt(options).then(function(message) {
        self.done();
        return message;
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
 * @param {Object} imap an instance of the imap-client to be used for testing purposes only
 */
Email.prototype.onConnect = function(imap) {
    var self = this;

    self._account.loggingIn = true;

    // init imap/smtp clients
    return self._auth.getCredentials().then(function(credentials) {
        // add the maximum update batch size for imap folders to the imap configuration
        credentials.imap.maxUpdateSize = config.imapUpdateBatchSize;

        // tls socket worker path for multithreaded tls in non-native tls environments
        credentials.imap.tlsWorkerPath = config.workerPath + '/tcp-socket-tls-worker.min.js';

        self._imapClient = (imap || new ImapClient(credentials.imap));

        self._imapClient.onError = onConnectionError; // connection error handling
        self._imapClient.onCert = self._auth.handleCertificateUpdate.bind(self._auth, 'imap', self.onConnect.bind(self), self._dialog.error); // certificate update handling
        self._imapClient.onSyncUpdate = self._onSyncUpdate.bind(self); // attach sync update handler

    }).then(function() {
        // imap login
        return self._imapClient.login();

    }).then(function() {
        self._account.loggingIn = false;
        // init folders
        return self._initFoldersFromImap();

    }).then(function() {
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

    }).then(function() {
        // by default, select the inbox (if there is one) after connecting the imap client.
        // this avoids race conditions between the listening imap connection and the one where the work is done
        var inbox = _.findWhere(self._account.folders, {
            type: FOLDER_TYPE_INBOX
        });

        if (!inbox) {
            // if there is no inbox, that's ok, too
            return;
        }

        return self.openFolder({
            folder: inbox
        }).then(function() {
            // set up the imap client to listen for changes in the inbox
            self._imapClient.listenForChanges({
                path: inbox.path
            }, function() {});
        });
    });

    function onConnectionError(error) {
        axe.debug('IMAP connection error, disconnected. Reason: ' + error.message + (error.stack ? ('\n' + error.stack) : ''));

        if (!self.isOnline()) {
            return;
        }

        axe.debug('Attempting reconnect in ' + config.reconnectInterval / 1000 + ' seconds.');

        setTimeout(function() {
            axe.debug('Reconnecting the IMAP stack');
            // re-init client modules on error
            self.onConnect().catch(self._dialog.error);
        }, config.reconnectInterval);
    }
};

/**
 * This handler should be invoked when navigator.onLine === false.
 * It will discard the imap client and pgp mailer
 */
Email.prototype.onDisconnect = function() {
    // logout of imap-client
    // ignore error, because it's not problem if logout fails
    this._imapClient.stopListeningForChanges(function() {});
    this._imapClient.logout(function() {});

    // discard clients
    this._account.online = false;
    this._imapClient = undefined;
    this._pgpMailer = undefined;

    return new Promise(function(resolve) {
        resolve(); // ASYNC ALL THE THINGS!!!
    });
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
        }).then(self._dialog.error).catch(self._dialog.error);
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
            }).then(self._dialog.error).catch(self._dialog.error);
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
            }).then(self._dialog.error).catch(self._dialog.error);
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
 */
Email.prototype._initFoldersFromDisk = function() {
    var self = this;

    self.busy(); // start the spinner

    // fetch list from local cache
    return self._devicestorage.listItems(FOLDER_DB_TYPE, 0, null).then(function(stored) {
        self._account.folders = stored[0] || [];
        return self._initMessagesFromDisk();

    }).then(done).catch(done);

    function done(err) {
        self.done(); // stop the spinner
        if (err) {
            throw err;
        }
    }
};

/**
 * Updates the folder information from imap (if we're online). Adds/removes folders in account.folders,
 * if we added/removed folder in IMAP. If we have an uninitialized folder that lacks folder.messages,
 * all the locally available messages are loaded from memory.
 */
Email.prototype._initFoldersFromImap = function() {
    var self = this;

    self.busy(); // start the spinner

    // fetch list from imap server
    return self._imapClient.listWellKnownFolders().then(function(wellKnownFolders) {
        var foldersChanged = false, // indicates if we need to persist anything to disk
            imapFolders = []; // aggregate all the imap folders

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
            return;
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

        return self._devicestorage.storeList([folders], FOLDER_DB_TYPE);

    }).then(function() {
        return self._initMessagesFromDisk();

    }).then(function() {
        self.done();

    }).catch(function(err) {
        self.done(); // stop the spinner
        throw err;
    });
};

/**
 * Fill uninitialized folders with the locally available messages.
 */
Email.prototype._initMessagesFromDisk = function() {
    var self = this;

    var jobs = [];
    self._account.folders.forEach(function(folder) {
        if (folder.messages) {
            // the folder is already initialized
            return;
        }

        // sync messages from disk to the folder model
        jobs.push(self.refreshFolder({
            folder: folder
        }));
    });

    return Promise.all(jobs).then(function() {
        return; // don't return promise array
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
Email.prototype._imapMark = function(options) {
    var self = this;

    return new Promise(function(resolve) {
        self.checkOnline();
        resolve();
    }).then(function() {
        options.path = options.folder.path;
        return self._imapClient.updateFlags(options);
    });
};

/**
 * If we're in the trash folder or no trash folder is available, this deletes a message from IMAP.
 * Otherwise, it moves a message to the trash folder.
 *
 * @param {Object} options.folder The folder where to find the message
 * @param {Number} options.uid The uid of the message
 * @return {Promise}
 */
Email.prototype._imapDeleteMessage = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        self.checkOnline();
        resolve();

    }).then(function() {
        var trash = _.findWhere(self._account.folders, {
            type: FOLDER_TYPE_TRASH
        });

        // there's no known trash folder to move the mail to or we're in the trash folder, so we can purge the message
        if (!trash || options.folder === trash) {
            return self._imapClient.deleteMessage({
                path: options.folder.path,
                uid: options.uid
            });
        }

        return self._imapMoveMessage({
            folder: options.folder,
            destination: trash,
            uid: options.uid
        });
    });
};

/**
 * Move stuff around on the server
 *
 * @param {String} options.folder The folder
 * @param {Number} options.destination The destination folder
 * @param {String} options.uid the message's uid
 * @return {Promise}
 */
Email.prototype._imapMoveMessage = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        self.checkOnline();
        resolve();
    }).then(function() {
        return self._imapClient.moveMessage({
            path: options.folder.path,
            destination: options.destination.path,
            uid: options.uid
        });
    });
};


/**
 * Get list messsage headers without the body
 *
 * @param {String} options.folder The folder
 * @param {Number} options.firstUid The lower bound of the uid (inclusive)
 * @param {Number} options.lastUid The upper bound of the uid range (inclusive)
 * @return {Promise}
 * @resolve {Array} messages    The message meta data
 */
Email.prototype._imapListMessages = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        self.checkOnline();
        resolve();
    }).then(function() {
        options.path = options.folder.path;
        return self._imapClient.listMessages(options);
    });
};

/**
 * Uploads a built message to a folder
 *
 * @param {Object} options.folder The folder where to find the message
 * @param {String} options.message The rfc2822 compatible raw ASCII e-mail source
 */
Email.prototype._imapUploadMessage = function(options) {
    var self = this;

    return self._imapClient.uploadMessage({
        path: options.folder.path,
        message: options.message
    });
};

/**
 * Stream an email messsage's body
 * @param {String} options.folder The folder
 * @param {String} options.uid the message's uid
 * @param {Object} options.bodyParts The message, as retrieved by _imapListMessages
 */
Email.prototype._getBodyParts = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        self.checkOnline();
        resolve();
    }).then(function() {
        options.path = options.folder.path;
        return self._imapClient.getBodyParts(options);
    }).then(function() {
        return self._parse(options);
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
 */
Email.prototype._localListMessages = function(options) {
    var dbType = 'email_' + options.folder.path + (options.uid ? '_' + options.uid : '');
    return this._devicestorage.listItems(dbType, 0, null);
};

/**
 * Stores a bunch of messages to the indexed db. The messages are stored under "email_[FOLDER PATH]_[MESSAGE UID]"
 *
 * @param {Object} options.folder The folder for which to list the content
 * @param {Array} options.messages The messages to store
 */
Email.prototype._localStoreMessages = function(options) {
    var dbType = 'email_' + options.folder.path;
    return this._devicestorage.storeList(options.emails, dbType);
};

/**
 * Stores a bunch of messages to the indexed db. The messages are stored under "email_[FOLDER PATH]_[MESSAGE UID]"
 *
 * @param {Object} options.folder The folder for which to list the content
 * @param {Array} options.messages The messages to store
 */
Email.prototype._localDeleteMessage = function(options) {
    var path = options.folder.path,
        uid = options.uid,
        id = options.id;

    if (!path || !(uid || id)) {
        return new Promise(function() {
            throw new Error('Invalid options!');
        });
    }

    var dbType = 'email_' + path + '_' + (uid || id);
    return this._devicestorage.removeList(dbType);
};


//
//
// Internal Helper Methods
//
//


/**
 * Parse an email using the mail reader
 * @param  {Object} options The option to be passed to the mailreader
 * @return {Promise}
 */
Email.prototype._parse = function(options) {
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
 * Uploads a message to the sent folder, if necessary.
 * Calls back immediately if ignoreUploadOnSent == true or not sent folder was found.
 *
 * @param {String} options.message The rfc2822 compatible raw ASCII e-mail source
 */
Email.prototype._uploadToSent = function(options) {
    var self = this;
    self.busy();
    return new Promise(function(resolve) {
        resolve();

    }).then(function() {
        // upload the sent message to the sent folder if necessary
        var sentFolder = _.findWhere(self._account.folders, {
            type: FOLDER_TYPE_SENT
        });

        // return for wrong usage
        if (self.ignoreUploadOnSent || !sentFolder || !options.message) {
            return;
        }

        // upload
        return self._imapUploadMessage({
            folder: sentFolder,
            message: options.message
        });

    }).then(function() {
        self.done();
    }).catch(function(err) {
        self.done();
        throw err;
    });
};

/**
 * Check if the client is online and throw an error if this is not the case.
 */
Email.prototype.checkOnline = function() {
    if (!this._account.online) {
        var err = new Error('Client is currently offline!');
        err.code = 42;
        throw err;
    }
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


/**
 * Check if the user agent is online.
 */
Email.prototype.isOnline = function() {
    return navigator.onLine;
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