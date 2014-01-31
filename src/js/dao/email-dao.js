define(function(require) {
    'use strict';

    var util = require('cryptoLib/util'),
        _ = require('underscore'),
        str = require('js/app-config').string,
        config = require('js/app-config').config;

    var EmailDAO = function(keychain, crypto, devicestorage) {
        var self = this;

        self._keychain = keychain;
        self._crypto = crypto;
        self._devicestorage = devicestorage;
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

        self._imapClient = options.imapClient;
        self._smtpClient = options.smtpClient;

        // delegation-esque pattern to mitigate between node-style events and plain js
        self._imapClient.onIncomingMessage = function(message) {
            if (typeof self.onIncomingMessage === 'function') {
                self.onIncomingMessage(message);
            }
        };

        // connect to newly created imap client
        self._imapLogin(function(err) {
            if (err) {
                callback(err);
                return;
            }

            // set status to online
            self._account.online = true;

            // check memory
            if (self._account.folders) {
                // no need to init folder again on connect... already in memory
                callback();
                return;
            }

            // init folders
            self._imapListFolders(function(err, folders) {
                if (err) {
                    callback(err);
                    return;
                }

                self._account.folders = folders;
                callback();
            });
        });
    };

    EmailDAO.prototype.onDisconnect = function(options, callback) {
        // set status to online
        this._account.online = false;
        this._imapClient = undefined;
        this._smtpClient = undefined;

        callback();
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
         * deltaF2: memory > storage => we changed flags, sync them to the remote and memory
         *
         * Third, we go on to sync between imap and memory, again based on uid
         * delta3: memory > imap    => we deleted messages directly from the remote, remove from memory and storage
         * delta4:   imap > memory  => we have new messages available, fetch to memory and storage
         *
         * Fourth, we pull changes in the flags downstream
         * deltaF4: imap > memory  => we changed flags directly on the remote, sync them to the storage and memory
         */

        var self = this,
            folder,
            delta1 /*, delta2 */ , delta3, delta4, //message 
            deltaF2, deltaF4,
            isFolderInitialized;


        // validate options
        if (!options.folder) {
            callback({
                errMsg: 'Invalid options!'
            });
            return;
        }

        // check busy status
        if (self._account.busy) {
            callback({
                errMsg: 'Sync aborted: Previous sync still in progress',
                code: 409
            });
            return;
        }

        // not busy -> set busy
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
            }, function(err, storedMessages) {
                if (err) {
                    self._account.busy = false;
                    callback(err);
                    return;
                }

                if (_.isEmpty(storedMessages)) {
                    // if there's nothing here, we're good
                    callback();
                    doImapDelta();
                    return;
                }

                var after = _.after(storedMessages.length, function() {
                    callback();
                    doImapDelta();
                });

                storedMessages.forEach(function(storedMessage) {
                    handleMessage(storedMessage, function(err, cleartextMessage) {
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
            }, function(err, storedMessages) {
                if (err) {
                    self._account.busy = false;
                    callback(err);
                    return;
                }

                /*
                 * delta1: storage > memory  => we deleted messages, remove from remote
                 * delta2:  memory > storage => we added messages, push to remote
                 * deltaF2: memory > storage => we changed flags, sync them to the remote and memory
                 */
                delta1 = checkDelta(storedMessages, folder.messages);
                // delta2 = checkDelta(folder.messages, storedMessages); // not supported yet
                deltaF2 = checkFlags(folder.messages, storedMessages);

                doDelta1();

                function doDelta1() {
                    if (_.isEmpty(delta1)) {
                        doDeltaF2();
                        return;
                    }

                    var after = _.after(delta1.length, function() {
                        doDeltaF2();
                    });

                    // deltaF2 contains references to the in-memory messages
                    delta1.forEach(function(inMemoryMessage) {
                        var deleteMe = {
                            folder: folder.path,
                            uid: inMemoryMessage.uid
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

                function doDeltaF2() {
                    if (_.isEmpty(deltaF2)) {
                        callback();
                        doImapDelta();
                        return;
                    }

                    var after = _.after(deltaF2.length, function() {
                        callback();
                        doImapDelta();
                    });

                    // deltaF2 contains references to the in-memory messages
                    deltaF2.forEach(function(inMemoryMessage) {
                        self._imapMark({
                            folder: folder.path,
                            uid: inMemoryMessage.uid,
                            unread: inMemoryMessage.unread,
                            answered: inMemoryMessage.answered
                        }, function(err) {
                            if (err) {
                                self._account.busy = false;
                                callback(err);
                                return;
                            }

                            var storedMessage = _.findWhere(storedMessages, {
                                uid: inMemoryMessage.uid
                            });

                            storedMessage.unread = inMemoryMessage.unread;
                            storedMessage.answered = inMemoryMessage.answered;

                            self._localStoreMessages({
                                folder: folder.path,
                                emails: [storedMessage]
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
            self._imapSearch({
                folder: folder.path
            }, function(err, uids) {
                if (err) {
                    self._account.busy = false;
                    callback(err);
                    return;
                }

                // uidWrappers is just to wrap the bare uids in an object { uid: 123 } so 
                // the checkDelta function can treat it like something that resembles a stripped down email object...
                var uidWrappers = _.map(uids, function(uid) {
                    return {
                        uid: uid
                    };
                });

                /*
                 * delta3: memory > imap   => we deleted messages directly from the remote, remove from memory and storage
                 * delta4:   imap > memory => we have new messages available, fetch to memory and storage
                 */
                delta3 = checkDelta(folder.messages, uidWrappers);
                delta4 = checkDelta(uidWrappers, folder.messages);

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

                    // delta3 contains references to the in-memory messages that have been deleted from the remote
                    delta3.forEach(function(inMemoryMessage) {
                        // remove delta3 from local storage
                        self._localDeleteMessage({
                            folder: folder.path,
                            uid: inMemoryMessage.uid
                        }, function(err) {
                            if (err) {
                                self._account.busy = false;
                                callback(err);
                                return;
                            }

                            // remove delta3 from memory
                            var idx = folder.messages.indexOf(inMemoryMessage);
                            folder.messages.splice(idx, 1);

                            after();
                        });
                    });
                }

                // we have new messages available, fetch to memory and storage
                // (downstream sync)
                function doDelta4() {
                    // eliminate uids smaller than the biggest local uid, i.e. just fetch everything
                    // that came in AFTER the most recent email we have in memory. Keep in mind that
                    // uids are strictly ascending, so there can't be a NEW mail in the mailbox with a 
                    // uid smaller than anything we've encountered before.
                    if (!_.isEmpty(folder.messages)) {
                        var localUids = _.pluck(folder.messages, 'uid'),
                            maxLocalUid = Math.max.apply(null, localUids);

                        // eliminate everything prior to maxLocalUid
                        delta4 = _.filter(delta4, function(uidWrapper) {
                            return uidWrapper.uid > maxLocalUid;
                        });
                    }

                    // sync in the uids in ascending order, to not leave the local database in a corrupted state:
                    // when the 5, 3, 1 should be synced and the client would fail at 3, but 5 was successfully synced,
                    // any subsequent syncs would never fetch 1 and 3. simple solution: sync in ascending order
                    delta4 = _.sortBy(delta4, function(uidWrapper) {
                        return uidWrapper.uid;
                    });

                    syncNextItem();

                    function syncNextItem() {
                        // no delta, we're done here
                        if (_.isEmpty(delta4)) {
                            doDeltaF4();
                            return;
                        }

                        // delta4 contains the headers that are newly available on the remote
                        var nextUidWrapper = delta4.shift();

                        // get the whole message
                        self._imapGetMessage({
                            folder: folder.path,
                            uid: nextUidWrapper.uid
                        }, function(err, message) {
                            if (err) {
                                self._account.busy = false;
                                callback(err);
                                return;
                            }

                            // imap filtering is insufficient, since google ignores non-alphabetical characters
                            if (message.subject.indexOf(str.subjectPrefix) === -1) {
                                syncNextItem();
                                return;
                            }

                            if (isVerificationMail(message)) {
                                verify(message, function(err) {
                                    if (err) {
                                        self._account.busy = false;
                                        callback(err);
                                        return;
                                    }

                                    syncNextItem();
                                });
                                return;
                            }

                            // add the encrypted message to the local storage
                            self._localStoreMessages({
                                folder: folder.path,
                                emails: [message]
                            }, function(err) {
                                if (err) {
                                    self._account.busy = false;
                                    callback(err);
                                    return;
                                }

                                // decrypt and add to folder in memory
                                handleMessage(message, function(err, cleartextMessage) {
                                    if (err) {
                                        self._account.busy = false;
                                        callback(err);
                                        return;
                                    }

                                    folder.messages.push(cleartextMessage);
                                    syncNextItem();
                                });
                            });
                        });
                    }
                }
            });

            function doDeltaF4() {
                var answeredUids, unreadUids;

                getUnreadUids();

                // find all the relevant unread mails
                function getUnreadUids() {
                    self._imapSearch({
                        folder: folder.path,
                        unread: true
                    }, function(err, uids) {
                        if (err) {
                            self._account.busy = false;
                            callback(err);
                            return;
                        }

                        // we're done here, let's get all the answered mails
                        unreadUids = uids;
                        getAnsweredUids();
                    });
                }

                // find all the relevant answered mails
                function getAnsweredUids() {
                    // find all the relevant answered mails
                    self._imapSearch({
                        folder: folder.path,
                        answered: true
                    }, function(err, uids) {
                        if (err) {
                            self._account.busy = false;
                            callback(err);
                            return;
                        }

                        // we're done here, let's update what we have in memory and persist that!
                        answeredUids = uids;
                        updateFlags();
                    });

                }

                function updateFlags() {
                    // deltaF4:  imap > memory => we changed flags directly on the remote, sync them to the storage and memory
                    deltaF4 = [];

                    folder.messages.forEach(function(msg) {
                        // if the message's uid is among the uids that should be unread,
                        // AND the message is not unread, we clearly have to change that
                        var shouldBeUnread = _.contains(unreadUids, msg.uid);
                        if (msg.unread === shouldBeUnread) {
                            // everything is in order, we're good here
                            return;
                        }

                        msg.unread = shouldBeUnread;
                        deltaF4.push(msg);
                    });

                    folder.messages.forEach(function(msg) {
                        // if the message's uid is among the uids that should be answered,
                        // AND the message is not answered, we clearly have to change that
                        var shouldBeAnswered = _.contains(answeredUids, msg.uid);
                        if (msg.answered === shouldBeAnswered) {
                            // everything is in order, we're good here
                            return;
                        }

                        msg.answered = shouldBeAnswered;
                        deltaF4.push(msg);
                    });

                    // maybe a mail had BOTH flags wrong, so let's create
                    // a duplicate-free version of deltaF4
                    deltaF4 = _.uniq(deltaF4);

                    // everything up to date? fine, we're done!
                    if (_.isEmpty(deltaF4)) {
                        finishSync();
                        return;
                    }

                    var after = _.after(deltaF4.length, function() {
                        // we're doing updating everything
                        finishSync();
                    });

                    // alright, so let's sync the corrected messages
                    deltaF4.forEach(function(inMemoryMessage) {
                        // do a short round trip to the database to avoid re-encrypting,
                        // instead use the encrypted object in the storage
                        self._localListMessages({
                            folder: folder.path,
                            uid: inMemoryMessage.uid
                        }, function(err, storedMessages) {
                            if (err) {
                                self._account.busy = false;
                                callback(err);
                                return;
                            }

                            var storedMessage = storedMessages[0];
                            storedMessage.unread = inMemoryMessage.unread;
                            storedMessage.answered = inMemoryMessage.answered;

                            // persist the modified object
                            self._localStoreMessages({
                                folder: folder.path,
                                emails: [storedMessage]
                            }, function(err) {
                                if (err) {
                                    self._account.busy = false;
                                    callback(err);
                                    return;
                                }

                                // and we're done.
                                after();
                            });
                        });

                    });
                }

                function finishSync() {
                    // after all the tags are up to date, let's adjust the unread mail count
                    folder.count = _.filter(folder.messages, function(msg) {
                        return msg.unread === true;
                    }).length;
                    // allow the next sync to take place
                    self._account.busy = false;
                    callback();
                }
            }
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
            var uuid, isValidUuid, index, verifyUrlPrefix = config.cloudUrl + config.verificationUrl;

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
            isValidUuid = new RegExp('[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}').test(uuid);
            if (!isValidUuid) {
                // there's no valid uuid in the email, so forget about that, too.
                localCallback();
                return;
            }

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
        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        this._imapClient.updateFlags({
            path: options.folder,
            uid: options.uid,
            unread: options.unread,
            answered: options.answered
        }, callback);
    };

    EmailDAO.prototype.move = function(options, callback) {
        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        this._imapClient.moveMessage({
            path: options.folder,
            uid: options.uid,
            destination: options.destination
        }, callback);
    };

    EmailDAO.prototype.sendEncrypted = function(options, callback) {
        var self = this,
            email = options.email;

        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        // validate the email input
        if (!email.to || !email.from || !email.to[0].address || !email.from[0].address || !Array.isArray(email.receiverKeys)) {
            callback({
                errMsg: 'Invalid email object!'
            });
            return;
        }

        // public key found... encrypt and send
        self._encrypt({
            email: email,
            keys: email.receiverKeys // this Array is set in writer controller
        }, function(err, email) {
            if (err) {
                callback(err);
                return;
            }

            self._smtpClient.send(email, callback);
        });
    };

    EmailDAO.prototype.sendPlaintext = function(options, callback) {
        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

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

            greeting = 'Hi,\n\n';

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
     * Returns the relevant messages corresponding to the search terms in the options
     * @param {String} options.folder The folder's path
     * @param {Boolean} options.answered (optional) Mails with or without the \Answered flag set.
     * @param {Boolean} options.unread (optional) Mails with or without the \Seen flag set.
     * @param {Function} callback(error, uids) invoked with the uids of messages matching the search terms, or an error object if an error occurred
     */
    EmailDAO.prototype._imapSearch = function(options, callback) {
        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        var o = {
            path: options.folder,
            subject: str.subjectPrefix
        };

        if (typeof options.answered !== 'undefined') {
            o.answered = options.answered;
        }
        if (typeof options.unread !== 'undefined') {
            o.unread = options.unread;
        }

        this._imapClient.search(o, callback);
    };

    EmailDAO.prototype._imapDeleteMessage = function(options, callback) {
        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

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
        var self = this;

        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        self._imapClient.getMessage({
            path: options.folder,
            uid: options.uid
        }, function(err, message) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, message);
        });
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
                    mail.encrypted = true;
                });

            });
        });
    };

    return EmailDAO;
});