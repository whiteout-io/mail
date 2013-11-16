define(function(require) {
    'use strict';

    var _ = require('underscore'),
        util = require('cryptoLib/util'),
        str = require('js/app-config').string,
        consts = require('js/app-config').constants;

    /**
     * A high-level Data-Access Api for handling Email synchronization
     * between the cloud service and the device's local storage
     */
    var EmailDAO = function(keychain, imapClient, smtpClient, crypto, devicestorage) {
        var self = this;

        self._keychain = keychain;
        self._imapClient = imapClient;
        self._smtpClient = smtpClient;
        self._crypto = crypto;
        self._devicestorage = devicestorage;

        // delegation-esque pattern to mitigate between node-style events and plain js
        self._imapClient.onIncomingMessage = function(message) {
            if (typeof self.onIncomingMessage === 'function') {
                self.onIncomingMessage(message);
            }
        };
    };

    /**
     * Inits all dependencies
     */
    EmailDAO.prototype.init = function(account, callback) {
        var self = this;

        self._account = account;

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
            // init user's local database
            self._devicestorage.init(emailAddress, function() {
                // call getUserKeyPair to read/sync keypair with devicestorage/cloud
                self._keychain.getUserKeyPair(emailAddress, function(err, storedKeypair) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback(null, storedKeypair);
                });
            });
        }
    };

    EmailDAO.prototype.unlock = function(keypair, passphrase, callback) {
        var self = this;

        if (keypair && keypair.privateKey && keypair.publicKey) {
            // import existing key pair into crypto module
            self._crypto.importKeys({
                passphrase: passphrase,
                privateKeyArmored: keypair.privateKey.encryptedKey,
                publicKeyArmored: keypair.publicKey.publicKey
            }, callback);
            return;
        }

        // no keypair for is stored for the user... generate a new one
        self._crypto.generateKeys({
            emailAddress: self._account.emailAddress,
            keySize: self._account.asymKeySize,
            passphrase: passphrase
        }, function(err, generatedKeypair) {
            if (err) {
                callback(err);
                return;
            }

            // import the new key pair into crypto module
            self._crypto.importKeys({
                passphrase: passphrase,
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
                self._keychain.putUserKeyPair(newKeypair, callback);
            });
        });
    };

    //
    // IMAP Apis
    //

    /**
     * Login the imap client
     */
    EmailDAO.prototype.imapLogin = function(callback) {
        var self = this;

        // login IMAP client if existent
        self._imapClient.login(callback);
    };

    /**
     * Cleanup by logging the user off.
     */
    EmailDAO.prototype.destroy = function(callback) {
        var self = this;

        self._imapClient.logout(callback);
    };

    /**
     * List the folders in the user's IMAP mailbox.
     */
    EmailDAO.prototype.imapListFolders = function(callback) {
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

    /**
     * Get the number of unread message for a folder
     */
    EmailDAO.prototype.unreadMessages = function(path, callback) {
        var self = this;

        self._imapClient.unreadMessages(path, callback);
    };

    /**
     * Fetch a list of emails from the device's local storage
     */
    EmailDAO.prototype.listMessages = function(options, callback) {
        var self = this,
            cleartextList = [];

        // validate options
        if (!options.folder) {
            callback({
                errMsg: 'Invalid options!'
            });
            return;
        }
        options.offset = (typeof options.offset === 'undefined') ? 0 : options.offset;
        options.num = (typeof options.num === 'undefined') ? null : options.num;

        // fetch items from device storage
        self._devicestorage.listItems('email_' + options.folder, options.offset, options.num, function(err, emails) {
            if (err) {
                callback(err);
                return;
            }

            if (emails.length === 0) {
                callback(null, cleartextList);
                return;
            }

            var after = _.after(emails.length, function() {
                callback(null, cleartextList);
            });

            _.each(emails, function(email) {
                handleMail(email, after);
            });
        });

        function handleMail(email, localCallback) {
            // remove subject filter prefix
            email.subject = email.subject.split(str.subjectPrefix)[1];

            // encrypted mail
            if (isPGPMail(email)) {
                email = parseMessageBlock(email);
                decrypt(email, localCallback);
                return;
            }

            // verification mail
            if (isVerificationMail(email)) {
                verify(email, localCallback);
                return;
            }

            // cleartext mail
            cleartextList.push(email);
            localCallback();
        }

        function isPGPMail(email) {
            return typeof email.body === 'string' && email.body.indexOf(str.cryptPrefix) !== -1 && email.body.indexOf(str.cryptSuffix) !== -1;
        }

        function isVerificationMail(email) {
            return email.subject === consts.verificationSubject;
        }

        function parseMessageBlock(email) {
            var messageBlock;

            // parse email body for encrypted message block
            // get ascii armored message block by prefix and suffix
            messageBlock = email.body.split(str.cryptPrefix)[1].split(str.cryptSuffix)[0];
            // add prefix and suffix again
            email.body = str.cryptPrefix + messageBlock + str.cryptSuffix;

            return email;
        }

        function decrypt(email, localCallback) {
            // fetch public key required to verify signatures
            var sender = email.from[0].address;
            self._keychain.getReceiverPublicKey(sender, function(err, senderPubkey) {
                if (err) {
                    callback(err);
                    return;
                }

                // decrypt and verfiy signatures
                self._crypto.decrypt(email.body, senderPubkey.publicKey, function(err, decrypted) {
                    if (err) {
                        decrypted = err.errMsg;
                    }

                    email.body = decrypted;
                    cleartextList.push(email);
                    localCallback();
                });
            });
        }

        function verify(email, localCallback) {
            var uuid, index;

            if (!email.unread) {
                // don't bother if the email was already marked as read
                localCallback();
                return;
            }

            index = email.body.indexOf(consts.verificationUrlPrefix);
            if (index === -1) {
                localCallback();
                return;
            }

            uuid = email.body.substr(index + consts.verificationUrlPrefix.length, consts.verificationUuidLength);
            self._keychain.verifyPublicKey(uuid, function(err) {
                if (err) {
                    callback({
                        errMsg: 'Verifying your public key failed: ' + err.errMsg
                    });
                    return;
                }

                // public key has been verified, mark the message as read, delete it, and ignore it in the future
                self.imapMarkMessageRead({
                    folder: options.folder,
                    uid: email.uid
                }, function(err) {
                    if (err) {
                        // if marking the mail as read failed, don't bother
                        localCallback();
                        return;
                    }

                    self.imapDeleteMessage({
                        folder: options.folder,
                        uid: email.uid
                    }, function() {
                        localCallback();
                    });
                });
            });
        }
    };

    /**
     * High level sync operation for the delta from the user's IMAP inbox
     */
    EmailDAO.prototype.imapSync = function(options, callback) {
        var self = this,
            dbType = 'email_' + options.folder;

        fetchList(function(err, emails) {
            if (err) {
                callback(err);
                return;
            }

            // delete old items from db
            self._devicestorage.removeList(dbType, function(err) {
                if (err) {
                    callback(err);
                    return;
                }

                // persist encrypted list in device storage
                self._devicestorage.storeList(emails, dbType, callback);
            });
        });

        function fetchList(callback) {
            var headers = [];

            // fetch imap folder's message list
            self.imapListMessages({
                folder: options.folder,
                offset: options.offset,
                num: options.num
            }, function(err, emails) {
                if (err) {
                    callback(err);
                    return;
                }

                // find encrypted messages by subject
                emails.forEach(function(i) {
                    if (typeof i.subject === 'string' && i.subject.indexOf(str.subjectPrefix) !== -1) {
                        headers.push(i);
                    }
                });

                // fetch message bodies
                fetchBodies(headers, callback);
            });
        }

        function fetchBodies(headers, callback) {
            var emails = [];

            if (headers.length < 1) {
                callback(null, emails);
                return;
            }

            var after = _.after(headers.length, function() {
                callback(null, emails);
            });

            _.each(headers, function(header) {
                self.imapGetMessage({
                    folder: options.folder,
                    uid: header.uid
                }, function(err, message) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    // set gotten attributes like body to message object containing list meta data like 'unread' or 'replied'
                    header.id = message.id;
                    header.body = message.body;
                    header.html = message.html;
                    header.attachments = message.attachments;

                    emails.push(header);
                    after();
                });
            });
        }
    };

    /**
     * List messages from an imap folder. This will not yet fetch the email body.
     * @param {String} options.folderName The name of the imap folder.
     * @param {Number} options.offset The offset of items to fetch (0 is the last stored item)
     * @param {Number} options.num The number of items to fetch (null means fetch all)
     */
    EmailDAO.prototype.imapListMessages = function(options, callback) {
        var self = this;

        self._imapClient.listMessages({
            path: options.folder,
            offset: options.offset,
            length: options.num
        }, callback);
    };

    /**
     * Get an email messsage including the email body from imap
     * @param {String} options.messageId The
     */
    EmailDAO.prototype.imapGetMessage = function(options, callback) {
        var self = this;

        self._imapClient.getMessagePreview({
            path: options.folder,
            uid: options.uid
        }, callback);
    };

    EmailDAO.prototype.imapMoveMessage = function(options, callback) {
        var self = this;

        self._imapClient.moveMessage({
            path: options.folder,
            uid: options.uid,
            destination: options.destination
        }, moved);

        function moved(err) {
            if (err) {
                callback(err);
                return;
            }

            // delete from local db
            self._devicestorage.removeList('email_' + options.folder + '_' + options.uid, callback);
        }
    };

    EmailDAO.prototype.imapDeleteMessage = function(options, callback) {
        var self = this;

        self._imapClient.deleteMessage({
            path: options.folder,
            uid: options.uid
        }, moved);

        function moved(err) {
            if (err) {
                callback(err);
                return;
            }

            // delete from local db
            self._devicestorage.removeList('email_' + options.folder + '_' + options.uid, callback);
        }
    };

    EmailDAO.prototype.imapMarkMessageRead = function(options, callback) {
        var self = this;

        self._imapClient.updateFlags({
            path: options.folder,
            uid: options.uid,
            unread: false
        }, callback);
    };

    EmailDAO.prototype.imapMarkAnswered = function(options, callback) {
        var self = this;

        self._imapClient.updateFlags({
            path: options.folder,
            uid: options.uid,
            answered: true
        }, callback);
    };

    //
    // SMTP Apis
    //

    /**
     * Send an email client side via STMP.
     */
    EmailDAO.prototype.smtpSend = function(email, callback) {
        var self = this,
            invalidRecipient;

        // validate the email input
        if (!email.to || !email.from || !email.to[0].address || !email.from[0].address) {
            callback({
                errMsg: 'Invalid email object!'
            });
            return;
        }

        // validate email addresses
        _.each(email.to, function(i) {
            if (!util.validateEmailAddress(i.address)) {
                invalidRecipient = i.address;
            }
        });
        if (invalidRecipient) {
            callback({
                errMsg: 'Invalid recipient: ' + invalidRecipient
            });
            return;
        }
        if (!util.validateEmailAddress(email.from[0].address)) {
            callback({
                errMsg: 'Invalid sender: ' + email.from
            });
            return;
        }

        // only support single recipient for e-2-e encryption
        // check if receiver has a public key
        self._keychain.getReceiverPublicKey(email.to[0].address, function(err, receiverPubkey) {
            if (err) {
                callback(err);
                return;
            }

            // validate public key
            if (!receiverPubkey) {
                callback({
                    errMsg: 'User has no public key yet!'
                });
                // user hasn't registered a public key yet... invite
                //self.encryptForNewUser(email, callback);
                return;
            }

            // public key found... encrypt and send
            self.encryptForUser(email, receiverPubkey.publicKey, callback);
        });
    };

    /**
     * Encrypt an email asymmetrically for an exisiting user with their public key
     */
    EmailDAO.prototype.encryptForUser = function(email, receiverPubkey, callback) {
        var self = this,
            pt = email.body,
            receiverPubkeys = [receiverPubkey];

        // get own public key so send message can be read
        self._crypto.exportKeys(function(err, ownKeys) {
            if (err) {
                callback(err);
                return;
            }

            // add own public key to receiver list
            receiverPubkeys.push(ownKeys.publicKeyArmored);
            // encrypt the email
            self._crypto.encrypt(pt, receiverPubkeys, function(err, ct) {
                if (err) {
                    callback(err);
                    return;
                }

                // bundle encrypted email together for sending
                frameEncryptedMessage(email, ct);

                self.send(email, callback);
            });
        });
    };

    /**
     * Frames an encrypted message in base64 Format.
     */

    function frameEncryptedMessage(email, ct) {
        var to, greeting;

        var MESSAGE = str.message + '\n\n\n',
            SIGNATURE = '\n\n' + str.signature + '\n\n';

        // get first name of recipient
        to = (email.to[0].name || email.to[0].address).split('@')[0].split('.')[0].split(' ')[0];
        greeting = 'Hi ' + to + ',\n\n';

        // build encrypted text body
        email.body = greeting + MESSAGE + ct + SIGNATURE;
        email.subject = str.subjectPrefix + email.subject;

        return email;
    }

    /**
     * Send an actual message object via smtp
     */
    EmailDAO.prototype.send = function(email, callback) {
        var self = this;

        self._smtpClient.send(email, callback);
    };

    return EmailDAO;
});