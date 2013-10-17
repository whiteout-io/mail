define(function(require) {
    'use strict';

    var _ = require('underscore'),
        util = require('cryptoLib/util'),
        str = require('js/app-config').string;

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
    };

    /**
     * Inits all dependencies
     */
    EmailDAO.prototype.init = function(account, passphrase, callback) {
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
                    // init crypto
                    initCrypto(storedKeypair);
                });
            });
        }

        function initCrypto(storedKeypair) {
            if (storedKeypair && storedKeypair.privateKey && storedKeypair.publicKey) {
                // import existing key pair into crypto module
                self._crypto.importKeys({
                    passphrase: passphrase,
                    privateKeyArmored: storedKeypair.privateKey.encryptedKey,
                    publicKeyArmored: storedKeypair.publicKey.publicKey
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
        }
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
            encryptedList = [];

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

            // find encrypted items
            emails.forEach(function(i) {
                if (typeof i.body === 'string' && i.body.indexOf(str.cryptPrefix) !== -1 && i.body.indexOf(str.cryptSuffix) !== -1) {
                    // parse ct object from ascii armored message block
                    encryptedList.push(parseMessageBlock(i));
                }
            });

            if (encryptedList.length === 0) {
                callback(null, []);
                return;
            }

            // decrypt items
            decryptList(encryptedList, callback);
        });

        function parseMessageBlock(email) {
            var messageBlock;

            // parse email body for encrypted message block
            try {
                // get ascii armored message block by prefix and suffix
                messageBlock = email.body.split(str.cryptPrefix)[1].split(str.cryptSuffix)[0];
                // add prefix and suffix again
                email.body = str.cryptPrefix + messageBlock + str.cryptSuffix;
            } catch (e) {
                callback({
                    errMsg: 'Error parsing encrypted message block!'
                });
                return;
            }

            return email;
        }

        function decryptList(list, callback) {
            var after = _.after(list.length, function() {
                callback(null, list);
            });

            list.forEach(function(i) {
                // gather public keys required to verify signatures
                var sender = i.from[0].address;
                self._keychain.getReveiverPublicKey(sender, function(err, senderPubkey) {

                    // decrypt and verfiy signatures
                    self._crypto.decrypt(i.body, senderPubkey.publicKey, function(err, decrypted) {
                        if (err) {
                            callback(err);
                            return;
                        }

                        decrypted = JSON.parse(decrypted);
                        i.subject = decrypted.subject;
                        i.body = decrypted.body;

                        after();
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
            var encryptedList = [];

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
                    if (i.subject === str.subject) {
                        encryptedList.push(i);
                    }
                });

                // fetch message bodies
                fetchBodies(encryptedList, callback);
            });
        }

        function fetchBodies(messageList, callback) {
            var emails = [];

            if (messageList.length < 1) {
                callback(null, emails);
                return;
            }

            var after = _.after(messageList.length, function() {
                callback(null, emails);
            });

            _.each(messageList, function(messageItem) {
                self.imapGetMessage({
                    folder: options.folder,
                    uid: messageItem.uid
                }, function(err, message) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    // set gotten attributes like body to message object containing list meta data like 'unread' or 'replied'
                    messageItem.id = message.id;
                    messageItem.body = message.body;
                    messageItem.html = message.html;
                    messageItem.attachments = message.attachments;

                    emails.push(messageItem);
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
        self._keychain.getReveiverPublicKey(email.to[0].address, function(err, receiverPubkey) {
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
            pt = JSON.stringify(email),
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
            SIGNATURE = '\n\n\n' + str.signature + '\n' + str.webSite + '\n\n';

        // get first name of recipient
        to = (email.to[0].name || email.to[0].address).split('@')[0].split('.')[0].split(' ')[0];
        greeting = 'Hi ' + to + ',\n\n';

        // build encrypted text body
        email.body = greeting + MESSAGE + ct + SIGNATURE;
        email.subject = str.subject;

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