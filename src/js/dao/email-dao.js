define(function(require) {
    'use strict';

    var util = require('cryptoLib/util'),
        _ = require('underscore'),
        str = require('js/app-config').string,
        config = require('js/app-config').config;

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

    //
    // External API
    //

    EmailDAO.prototype.init = function(options, callback) {
        var self = this,
            keypair;

        self._account = options.account;
        self._account.busy = false;

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

                    keypair = storedKeypair;
                    initFolders();
                });
            });
        }

        function initFolders() {
            self._imapLogin(function(err) {
                if (err) {
                    callback(err);
                    return;
                }

                self._imapListFolders(function(err, folders) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    self._account.folders = folders;
                    callback(null, keypair);
                });
            });
        }
    };


    EmailDAO.prototype.unlock = function(options, callback) {
        var self = this;

        if (options.keypair) {
            // import existing key pair into crypto module
            self._crypto.importKeys({
                passphrase: options.passphrase,
                privateKeyArmored: options.keypair.privateKey.encryptedKey,
                publicKeyArmored: options.keypair.publicKey.publicKey
            }, callback);
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
                self._keychain.putUserKeyPair(newKeypair, callback);
            });
        }
    };

    EmailDAO.prototype.sync = function(options, callback) {
        /*
         * Here's how delta sync works:
         *
         * First, we sync the messages between memory and local storage, based on their uid
         * delta1: storage > memory  => we deleted messages, remove from remote and memory
         * delta2:  memory > storage => we added messages, push to remote <<< not supported yet
         *
         * Second, we check the delta for the flags
         * deltaF1: memory > storage => we changed flags, sync them to the remote and memory
         *
         * Third, we go on to sync between imap and memory, again based on uid
         * delta3: memory > imap    => we deleted messages directly from the remote, remove from memory and storage
         * delta4:   imap > memory  => we have new messages available, fetch to memory and storage
         *
         * Fourth, we pull changes in the flags downstream
         * deltaF2: imap > memory  => we changed flags directly on the remote, sync them to the storage and memory
         */

        var self = this,
            folder,
            delta1 /*, delta2 */ , delta3, delta4, //message 
            deltaF1, deltaF2,
            isFolderInitialized;


        // validate options
        if (!options.folder) {
            callback({
                errMsg: 'Invalid options!'
            });
            return;
        }

        if (self._account.busy) {
            callback({
                errMsg: 'Sync aborted: Previous sync still in progress',
                code: 409
            });
            return;
        }

        self._account.busy = true;

        folder = _.findWhere(self._account.folders, {
            path: options.folder
        });
        isFolderInitialized = !! folder.messages;

        // initial filling from local storage is an exception from the normal sync.
        // after reading from local storage, do imap sync
        if (!isFolderInitialized) {
            initFolderMessages();
            return;
        }

        doLocalDelta();

        function initFolderMessages() {
            folder.messages = [];
            self._localListMessages({
                folder: folder.path
            }, function(err, messages) {
                if (err) {
                    self._account.busy = false;
                    callback(err);
                    return;
                }

                if (_.isEmpty(messages)) {
                    // if there's nothing here, we're good
                    callback();
                    doImapDelta();
                    return;
                }

                var after = _.after(messages.length, function() {
                    callback();
                    doImapDelta();
                });

                messages.forEach(function(message) {
                    handleMessage(message, function(err, cleartextMessage) {
                        if (err) {
                            self._account.busy = false;
                            callback(err);
                            return;
                        }

                        folder.messages.push(cleartextMessage);
                        after();
                    });
                });
            });
        }

        function doLocalDelta() {
            self._localListMessages({
                folder: folder.path
            }, function(err, messages) {
                if (err) {
                    self._account.busy = false;
                    callback(err);
                    return;
                }

                /*
                 * delta1: storage > memory  => we deleted messages, remove from remote
                 * delta2:  memory > storage => we added messages, push to remote
                 * deltaF1: memory > storage => we changed flags, sync them to the remote and memory
                 */
                delta1 = checkDelta(messages, folder.messages);
                // delta2 = checkDelta(folder.messages, messages); // not supported yet
                deltaF1 = checkFlags(folder.messages, messages);

                doDelta1();

                function doDelta1() {
                    if (_.isEmpty(delta1)) {
                        doDeltaF1();
                        return;
                    }

                    var after = _.after(delta1.length, function() {
                        doDeltaF1();
                    });

                    delta1.forEach(function(message) {
                        var deleteMe = {
                            folder: folder.path,
                            uid: message.uid
                        };

                        self._imapDeleteMessage(deleteMe, function(err) {
                            if (err) {
                                self._account.busy = false;
                                callback(err);
                                return;
                            }

                            self._localDeleteMessage(deleteMe, function(err) {
                                if (err) {
                                    self._account.busy = false;
                                    callback(err);
                                    return;
                                }

                                after();
                            });
                        });
                    });
                }

                function doDeltaF1() {
                    if (_.isEmpty(deltaF1)) {
                        callback();
                        doImapDelta();
                        return;
                    }

                    var after = _.after(deltaF1.length, function() {
                        callback();
                        doImapDelta();
                    });

                    deltaF1.forEach(function(message) {
                        self._imapMark({
                            folder: folder.path,
                            uid: message.uid,
                            unread: message.unread,
                            answered: message.answered
                        }, function(err) {
                            if (err) {
                                self._account.busy = false;
                                callback(err);
                                return;
                            }

                            var encryptedMsg = _.findWhere(messages, {
                                uid: message.uid
                            });

                            encryptedMsg.unread = message.unread;
                            encryptedMsg.answered = message.answered;

                            self._localStoreMessages({
                                folder: folder.path,
                                emails: [encryptedMsg]
                            }, function(err) {
                                if (err) {
                                    self._account.busy = false;
                                    callback(err);
                                    return;
                                }

                                after();
                            });
                        });
                    });
                }
            });
        }

        function doImapDelta() {
            self._imapListMessages({
                folder: folder.path
            }, function(err, headers) {
                if (err) {
                    self._account.busy = false;
                    callback(err);
                    return;
                }

                // ignore non-whitelisted mails
                var nonWhitelisted = _.filter(headers, function(header) {
                    return header.subject.indexOf(str.subjectPrefix) === -1;
                });
                nonWhitelisted.forEach(function(i) {
                    headers.splice(headers.indexOf(i), 1);
                });

                /*
                 * delta3: memory > imap   => we deleted messages directly from the remote, remove from memory and storage
                 * delta4:   imap > memory => we have new messages available, fetch to memory and storage
                 * deltaF2:  imap > memory => we changed flags directly on the remote, sync them to the storage and memory
                 */
                delta3 = checkDelta(folder.messages, headers);
                delta4 = checkDelta(headers, folder.messages);
                deltaF2 = checkFlags(headers, folder.messages);

                doDelta3();

                // we deleted messages directly from the remote, remove from memory and storage
                function doDelta3() {
                    if (_.isEmpty(delta3)) {
                        doDelta4();
                        return;
                    }

                    var after = _.after(delta3.length, function() {
                        // we're done with delta 3, so let's continue
                        doDelta4();
                    });

                    delta3.forEach(function(header) {
                        // remove delta3 from memory
                        var idx = folder.messages.indexOf(header);
                        folder.messages.splice(idx, 1);

                        // remove delta3 from local storage
                        self._localDeleteMessage({
                            folder: folder.path,
                            uid: header.uid
                        }, function(err) {
                            if (err) {
                                self._account.busy = false;
                                callback(err);
                                return;
                            }

                            after();
                        });
                    });
                }

                // we have new messages available, fetch to memory and storage
                // (downstream sync)
                function doDelta4() {
                    // no delta, we're done here
                    if (_.isEmpty(delta4)) {
                        doDeltaF2();
                        return;
                    }

                    var after = _.after(delta4.length, function() {
                        doDeltaF2();
                    });

                    delta4.forEach(function(header) {
                        // get the whole message
                        self._imapGetMessage({
                            folder: folder.path,
                            uid: header.uid
                        }, function(err, message) {
                            if (err) {
                                self._account.busy = false;
                                callback(err);
                                return;
                            }

                            if (isVerificationMail(message)) {
                                verify(message, function(err) {
                                    if (err) {
                                        self._account.busy = false;
                                        callback(err);
                                        return;
                                    }

                                    after();
                                });
                                return;
                            }

                            // create a bastard child of smtp and imap.
                            // before thinking this is stupid, talk to the guys who wrote this.
                            header.id = message.id;
                            header.body = message.body;
                            header.html = message.html;
                            header.attachments = message.attachments;

                            // add the encrypted message to the local storage
                            self._localStoreMessages({
                                folder: folder.path,
                                emails: [header]
                            }, function(err) {
                                if (err) {
                                    self._account.busy = false;
                                    callback(err);
                                    return;
                                }

                                // decrypt and add to folder in memory
                                handleMessage(header, function(err, cleartextMessage) {
                                    if (err) {
                                        self._account.busy = false;
                                        callback(err);
                                        return;
                                    }

                                    folder.messages.push(cleartextMessage);
                                    after();
                                });
                            });
                        });
                    });
                }

                // we have a mismatch concerning flags between imap and memory.
                // pull changes from imap.
                function doDeltaF2() {
                    if (_.isEmpty(deltaF2)) {
                        self._account.busy = false;
                        callback();
                        return;
                    }

                    var after = _.after(deltaF2.length, function() {
                        self._account.busy = false;
                        callback();
                    });

                    deltaF2.forEach(function(header) {
                        // do a short round trip to the database to avoid re-encrypting,
                        // instead use the encrypted object in the storage
                        self._localListMessages({
                            folder: folder.path,
                            uid: header.uid
                        }, function(err, storedMsgs) {
                            if (err) {
                                self._account.busy = false;
                                callback(err);
                                return;
                            }

                            var storedMsg = storedMsgs[0];
                            storedMsg.unread = header.unread;
                            storedMsg.answered = header.answered;

                            self._localStoreMessages({
                                folder: folder.path,
                                emails: [storedMsg]
                            }, function(err) {
                                if (err) {
                                    self._account.busy = false;
                                    callback(err);
                                    return;
                                }

                                // after the metadata of the encrypted object has changed, proceed with the live object
                                var liveMsg = _.findWhere(folder.messages, {
                                    uid: header.uid
                                });
                                liveMsg.unread = header.unread;
                                liveMsg.answered = header.answered;

                                after();
                            });
                        });
                    });
                }

            });
        }

        /*
         * Checks which messages are included in a, but not in b
         */
        function checkDelta(a, b) {
            var i, msg, exists,
                delta = [];

            // find the delta
            for (i = a.length - 1; i >= 0; i--) {
                msg = a[i];
                exists = _.findWhere(b, {
                    uid: msg.uid
                });
                if (!exists) {
                    delta.push(msg);
                }
            }

            return delta;
        }

        /*
         * checks if there are some flags that have changed in a and b
         */
        function checkFlags(a, b) {
            var i, aI, bI,
                delta = [];

            // find the delta
            for (i = a.length - 1; i >= 0; i--) {
                aI = a[i];
                bI = _.findWhere(b, {
                    uid: aI.uid
                });
                if (bI && (aI.unread !== bI.unread || aI.answered !== bI.answered)) {
                    delta.push(aI);
                }
            }

            return delta;
        }

        function isVerificationMail(email) {
            return email.subject === str.subjectPrefix + str.verificationSubject;
        }

        function verify(email, localCallback) {
            var uuid, index, verifyUrlPrefix = config.cloudUrl + config.verificationUrl;

            if (!email.unread) {
                // don't bother if the email was already marked as read
                localCallback();
                return;
            }

            index = email.body.indexOf(verifyUrlPrefix);
            if (index === -1) {
                // there's no url in the email, so forget about that.
                localCallback();
                return;
            }


            uuid = email.body.substr(index + verifyUrlPrefix.length, config.verificationUuidLength);
            self._keychain.verifyPublicKey(uuid, function(err) {
                if (err) {
                    localCallback({
                        errMsg: 'Verifying your public key failed: ' + err.errMsg
                    });
                    return;
                }

                // public key has been verified, mark the message as read, delete it, and ignore it in the future
                self._imapMark({
                    folder: options.folder,
                    uid: email.uid,
                    unread: false
                }, function(err) {
                    if (err) {
                        localCallback(err);
                        return;
                    }

                    self._imapDeleteMessage({
                        folder: options.folder,
                        uid: email.uid
                    }, localCallback);
                });
            });
        }

        function handleMessage(message, localCallback) {
            message.subject = message.subject.split(str.subjectPrefix)[1];

            if (containsArmoredCiphertext(message)) {
                decrypt(message, localCallback);
                return;
            }

            // cleartext mail
            localCallback(null, message);
        }

        function containsArmoredCiphertext(email) {
            return typeof email.body === 'string' && email.body.indexOf(str.cryptPrefix) !== -1 && email.body.indexOf(str.cryptSuffix) !== -1;
        }

        function decrypt(email, localCallback) {
            var sender;

            extractArmoredContent(email);

            // fetch public key required to verify signatures
            sender = email.from[0].address;
            self._keychain.getReceiverPublicKey(sender, function(err, senderPubkey) {
                if (err) {
                    localCallback(err);
                    return;
                }

                if (!senderPubkey) {
                    // this should only happen if a mail from another channel is in the inbox
                    setBodyAndContinue('Public key for sender not found!');
                    return;
                }

                // decrypt and verfiy signatures
                self._crypto.decrypt(email.body, senderPubkey.publicKey, function(err, decrypted) {
                    if (err) {
                        decrypted = err.errMsg;
                    }

                    // set encrypted flag
                    email.encrypted = true;
                    setBodyAndContinue(decrypted);
                });
            });

            function extractArmoredContent(email) {
                var start = email.body.indexOf(str.cryptPrefix),
                    end = email.body.indexOf(str.cryptSuffix) + str.cryptSuffix.length;

                // parse email body for encrypted message block
                email.body = email.body.substring(start, end);
            }

            function setBodyAndContinue(text) {
                email.body = text;
                localCallback(null, email);
            }
        }
    };

    EmailDAO.prototype._imapMark = function(options, callback) {
        this._imapClient.updateFlags({
            path: options.folder,
            uid: options.uid,
            unread: options.unread,
            answered: options.answered
        }, callback);
    };

    EmailDAO.prototype.move = function(options, callback) {
        this._imapClient.moveMessage({
            path: options.folder,
            uid: options.uid,
            destination: options.destination
        }, callback);
    };

    EmailDAO.prototype.sendEncrypted = function(options, callback) {
        var self = this,
            email = options.email;

        // validate the email input
        if (!email.to || !email.from || !email.to[0].address || !email.from[0].address) {
            callback({
                errMsg: 'Invalid email object!'
            });
            return;
        }

        // validate email addresses
        for (var i = email.to.length - 1; i >= 0; i--) {
            if (!util.validateEmailAddress(email.to[i].address)) {
                callback({
                    errMsg: 'Invalid recipient: ' + email.to[i].address
                });
                return;
            }
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
                return;
            }

            // public key found... encrypt and send
            self._encrypt({
                email: email,
                keys: [receiverPubkey.publicKey]
            }, function(err, email) {
                if (err) {
                    callback(err);
                    return;
                }

                self._smtpClient.send(email, callback);
            });
        });
    };

    EmailDAO.prototype.sendPlaintext = function(options, callback) {
        this._smtpClient.send(options.email, callback);
    };

    //
    // Internal API
    //

    // Encryption API

    EmailDAO.prototype._encrypt = function(options, callback) {
        var self = this,
            pt = options.email.body;

        options.keys = options.keys || [];

        // get own public key so send message can be read
        self._crypto.exportKeys(function(err, ownKeys) {
            if (err) {
                callback(err);
                return;
            }

            // add own public key to receiver list
            options.keys.push(ownKeys.publicKeyArmored);
            // encrypt the email
            self._crypto.encrypt(pt, options.keys, function(err, ct) {
                if (err) {
                    callback(err);
                    return;
                }

                // bundle encrypted email together for sending
                frameEncryptedMessage(options.email, ct);
                callback(null, options.email);
            });
        });

        function frameEncryptedMessage(email, ct) {
            var greeting,
                message = str.message + '\n\n\n',
                signature = '\n\n' + str.signature + '\n\n';

            // get first name of recipient
            greeting = 'Hi ' + (email.to[0].name || email.to[0].address).split('@')[0].split('.')[0].split(' ')[0] + ',\n\n';

            // build encrypted text body
            email.body = greeting + message + ct + signature;
            email.subject = str.subjectPrefix + email.subject;
        }
    };

    // Local Storage API

    EmailDAO.prototype._localListMessages = function(options, callback) {
        var dbType = 'email_' + options.folder;
        if (typeof options.uid !== 'undefined') {
            dbType = dbType + '_' + options.uid;
        }
        this._devicestorage.listItems(dbType, 0, null, callback);
    };

    EmailDAO.prototype._localStoreMessages = function(options, callback) {
        var dbType = 'email_' + options.folder;
        this._devicestorage.storeList(options.emails, dbType, callback);
    };

    EmailDAO.prototype._localDeleteMessage = function(options, callback) {
        if (!options.folder || !options.uid) {
            callback({
                errMsg: 'Invalid options!'
            });
            return;
        }
        var dbType = 'email_' + options.folder + '_' + options.uid;
        this._devicestorage.removeList(dbType, callback);
    };


    // IMAP API

    /**
     * Login the imap client
     */
    EmailDAO.prototype._imapLogin = function(callback) {
        // login IMAP client if existent
        this._imapClient.login(callback);
    };

    /**
     * Cleanup by logging the user off.
     */
    EmailDAO.prototype._imapLogout = function(callback) {
        this._imapClient.logout(callback);
    };

    /**
     * List messages from an imap folder. This will not yet fetch the email body.
     * @param {String} options.folderName The name of the imap folder.
     */
    EmailDAO.prototype._imapListMessages = function(options, callback) {
        this._imapClient.listMessages({
            path: options.folder,
            offset: 0,
            length: 100
        }, callback);
    };

    EmailDAO.prototype._imapDeleteMessage = function(options, callback) {
        this._imapClient.deleteMessage({
            path: options.folder,
            uid: options.uid
        }, callback);
    };

    /**
     * Get an email messsage including the email body from imap
     * @param {String} options.messageId The
     */
    EmailDAO.prototype._imapGetMessage = function(options, callback) {
        this._imapClient.getMessagePreview({
            path: options.folder,
            uid: options.uid
        }, callback);
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

    // to be removed and solved with IMAP!
    EmailDAO.prototype.store = function(email, callback) {
        var self = this,
            dbType = 'email_OUTBOX';

        email.id = util.UUID();

        // encrypt
        self._encrypt({
            email: email
        }, function(err, email) {
            if (err) {
                callback(err);
                return;
            }

            // store to local storage
            self._devicestorage.storeList([email], dbType, callback);
        });
    };

    // to be removed and solved with IMAP!
    EmailDAO.prototype.list = function(callback) {
        var self = this,
            dbType = 'email_OUTBOX';

        self._devicestorage.listItems(dbType, 0, null, function(err, mails) {
            if (err) {
                callback(err);
                return;
            }

            if (mails.length === 0) {
                callback(null, []);
                return;
            }

            self._crypto.exportKeys(function(err, ownKeys) {
                if (err) {
                    callback(err);
                    return;
                }

                var after = _.after(mails.length, function() {
                    callback(null, mails);
                });

                mails.forEach(function(mail) {
                    mail.body = str.cryptPrefix + mail.body.split(str.cryptPrefix)[1].split(str.cryptSuffix)[0] + str.cryptSuffix;
                    mail.subject = mail.subject.split(str.subjectPrefix)[1];
                    self._crypto.decrypt(mail.body, ownKeys.publicKeyArmored, function(err, decrypted) {
                        mail.body = err ? err.errMsg : decrypted;
                        after();
                    });
                });

            });
        });
    };

    return EmailDAO;
});