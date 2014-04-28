define(function(require) {
    'use strict';

    var _ = require('underscore'),
        config = require('js/app-config').config,
        str = require('js/app-config').string;

    var EmailSync = function(keychain, devicestorage) {
        this._keychain = keychain;
        this._devicestorage = devicestorage;
    };

    EmailSync.prototype.init = function(options, callback) {
        this._account = options.account;

        callback();
    };

    EmailSync.prototype.onConnect = function(options, callback) {
        this._imapClient = options.imapClient;

        callback();
    };

    EmailSync.prototype.onDisconnect = function(options, callback) {
        this._imapClient = undefined;

        callback();
    };

    /**
     * Syncs outbox content from disk to memory, not vice-versa
     */
    EmailSync.prototype.syncOutbox = function(options, callback) {
        var self = this;

        // check busy status
        if (self._account.busy) {
            callback({
                errMsg: 'Sync aborted: Previous sync still in progress',
                code: 409
            });
            return;
        }

        // make sure two syncs for the same folder don't interfere
        self._account.busy = true;

        var folder = _.findWhere(self._account.folders, {
            path: options.folder
        });

        folder.messages = folder.messages || [];

        self._localListMessages({
            folder: folder.path
        }, function(err, storedMessages) {
            if (err) {
                self._account.busy = false;
                callback(err);
                return;
            }

            // calculate the diffs between memory and disk
            var storedIds = _.pluck(storedMessages, 'id'),
                inMemoryIds = _.pluck(folder.messages, 'id'),
                newIds = _.difference(storedIds, inMemoryIds),
                removedIds = _.difference(inMemoryIds, storedIds);

            // which messages are new on the disk that are not yet in memory?
            var newMessages = _.filter(storedMessages, function(msg) {
                return _.contains(newIds, msg.id);
            });

            // which messages are no longer on disk, i.e. have been sent
            var removedMessages = _.filter(folder.messages, function(msg) {
                return _.contains(removedIds, msg.id);
            });

            // add the new messages to memory
            newMessages.forEach(function(newMessage) {
                folder.messages.push(newMessage);
            });

            // remove the sent messages from memory
            removedMessages.forEach(function(removedMessage) {
                var index = folder.messages.indexOf(removedMessage);
                folder.messages.splice(index, 1);
            });

            // update the folder count and we're done.
            folder.count = folder.messages.length;
            self._account.busy = false;

            callback();
        });
    };

    EmailSync.prototype.sync = function(options, callback) {
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

        var self = this;

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

        // make sure two syncs for the same folder don't interfere
        self._account.busy = true;

        var folder = _.findWhere(self._account.folders, {
            path: options.folder
        });

        /*
         * if the folder is not initialized with the messages from the memory, we need to fill it first, otherwise the delta sync obviously breaks.
         * initial filling from local storage is an exception from the normal sync. after reading from local storage, do imap sync
         */
        var isFolderInitialized = !! folder.messages;
        if (!isFolderInitialized) {
            initFolderMessages();
            return;
        }

        doLocalDelta();

        /*
         * pre-fill the memory with the messages stored on the hard disk
         */
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

                storedMessages.forEach(function(storedMessage) {
                    // remove the body to not load unnecessary data to memory
                    delete storedMessage.body;

                    folder.messages.push(storedMessage);
                });

                callback();
                doImapDelta();
            });
        }

        /*
         * compares the messages in memory to the messages on the disk
         */
        function doLocalDelta() {
            self._localListMessages({
                folder: folder.path
            }, function(err, storedMessages) {
                if (err) {
                    self._account.busy = false;
                    callback(err);
                    return;
                }

                doDelta1();

                /*
                 * delta1:
                 * storage contains messages that are not present in memory => we deleted messages from the memory, so remove the messages from the remote and the disk
                 */
                function doDelta1() {
                    var inMemoryUids = _.pluck(folder.messages, 'uid'),
                        storedMessageUids = _.pluck(storedMessages, 'uid'),
                        delta1 = _.difference(storedMessageUids, inMemoryUids); // delta1 contains only uids

                    // if we're we are done here
                    if (_.isEmpty(delta1)) {
                        doDeltaF2();
                        return;
                    }

                    var after = _.after(delta1.length, function() {
                        doDeltaF2();
                    });

                    // delta1 contains uids of messages on the disk
                    delta1.forEach(function(inMemoryUid) {
                        var deleteMe = {
                            folder: folder.path,
                            uid: inMemoryUid
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

                /*
                 * deltaF2:
                 * memory contains messages that have flags other than those in storage => we changed flags, sync them to the remote and memory
                 */
                function doDeltaF2() {
                    var deltaF2 = checkFlags(folder.messages, storedMessages); // deltaF2 contains the message objects, we need those to sync the flags

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

        /*
         * compare the messages on the imap server to the in memory messages
         */
        function doImapDelta() {
            self._imapSearch({
                folder: folder.path
            }, function(err, inImapUids) {
                if (err) {
                    self._account.busy = false;
                    callback(err);
                    return;
                }

                doDelta3();

                /*
                 * delta3:
                 * memory contains messages that are not present on the imap => we deleted messages directly from the remote, remove from memory and storage
                 */
                function doDelta3() {
                    var inMemoryUids = _.pluck(folder.messages, 'uid'),
                        delta3 = _.difference(inMemoryUids, inImapUids);

                    if (_.isEmpty(delta3)) {
                        doDelta4();
                        return;
                    }

                    var after = _.after(delta3.length, function() {
                        doDelta4();
                    });

                    // delta3 contains uids of the in-memory messages that have been deleted from the remote
                    delta3.forEach(function(inMemoryUid) {
                        // remove from local storage
                        self._localDeleteMessage({
                            folder: folder.path,
                            uid: inMemoryUid
                        }, function(err) {
                            if (err) {
                                self._account.busy = false;
                                callback(err);
                                return;
                            }

                            // remove from memory
                            var inMemoryMessage = _.findWhere(folder.messages, function(msg) {
                                return msg.uid === inMemoryUid;
                            });
                            folder.messages.splice(folder.messages.indexOf(inMemoryMessage), 1);

                            after();
                        });
                    });
                }

                /*
                 * delta4:
                 * imap contains messages that are not present in memory => we have new messages available, fetch downstream to memory and storage
                 */
                function doDelta4() {
                    var inMemoryUids = _.pluck(folder.messages, 'uid'),
                        delta4 = _.difference(inImapUids, inMemoryUids);

                    // eliminate uids smaller than the biggest local uid, i.e. just fetch everything
                    // that came in AFTER the most recent email we have in memory. Keep in mind that
                    // uids are strictly ascending, so there can't be a NEW mail in the mailbox with a 
                    // uid smaller than anything we've encountered before.
                    if (!_.isEmpty(inMemoryUids)) {
                        var maxInMemoryUid = Math.max.apply(null, inMemoryUids); // apply works with separate arguments rather than an array

                        // eliminate everything prior to maxInMemoryUid, i.e. everything that was already synced
                        delta4 = _.filter(delta4, function(uid) {
                            return uid > maxInMemoryUid;
                        });
                    }

                    // no delta, we're done here
                    if (_.isEmpty(delta4)) {
                        doDeltaF4();
                        return;
                    }

                    // list the messages starting from the lowest new uid to the highest new uid
                    self._imapListMessages({
                        folder: folder.path,
                        firstUid: Math.min.apply(null, delta4),
                        lastUid: Math.max.apply(null, delta4)
                    }, function(err, messages) {
                        if (err) {
                            self._account.busy = false;
                            callback(err);
                            return;
                        }

                        // if there are verification messages in the synced messages, handle it
                        var verificationMessages = _.filter(messages, function(message) {
                            return message.subject === (str.subjectPrefix + str.verificationSubject);
                        });

                        // if there are verification messages, continue after we've tried to verify
                        if (verificationMessages.length > 0) {
                            var after = _.after(verificationMessages.length, storeHeaders);

                            verificationMessages.forEach(function(verificationMessage) {
                                handleVerification(verificationMessage, function(err, isValid) {
                                    // if it was NOT a valid verification mail, do nothing
                                    if (!isValid) {
                                        after();
                                        return;
                                    }

                                    // if an error occurred and the mail was a valid verification mail, display the error, but
                                    // keep the mail in the list so the user can see it and verify manually
                                    if (err) {
                                        callback(err);
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
                            // no delta, we're done here
                            if (_.isEmpty(messages)) {
                                doDeltaF4();
                                return;
                            }

                            // persist the encrypted message to the local storage
                            self._localStoreMessages({
                                folder: folder.path,
                                emails: messages
                            }, function(err) {
                                if (err) {
                                    self._account.busy = false;
                                    callback(err);
                                    return;
                                }

                                // if persisting worked, add them to the messages array
                                folder.messages = folder.messages.concat(messages);
                                self.onIncomingMessage(messages);
                                doDeltaF4();
                            });
                        }
                    });
                }
            });

            /**
             * deltaF4: imap > memory => we changed flags directly on the remote, sync them to the storage and memory
             */
            function doDeltaF4() {
                var answeredUids, unreadUids,
                    deltaF4 = [];

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
            }
        }

        function finishSync() {
            // whereas normal folders show the unread messages count only,
            // the outbox shows the total count
            // after all the tags are up to date, let's adjust the unread mail count
            folder.count = _.filter(folder.messages, function(msg) {
                return msg.unread === true;
            }).length;

            // allow the next sync to take place
            self._account.busy = false;
            callback();
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

        function handleVerification(message, localCallback) {
            self._imapStreamText({
                folder: options.folder,
                message: message
            }, function(error) {
                // we could not stream the text to determine if the verification was valid or not
                // so handle it as if it were valid
                if (error) {
                    localCallback(error, true);
                    return;
                }

                var verificationUrlPrefix = config.cloudUrl + config.verificationUrl,
                    uuid = message.body.split(verificationUrlPrefix).pop().substr(0, config.verificationUuidLength),
                    isValidUuid = new RegExp('[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}').test(uuid);

                // there's no valid uuid in the message, so forget about it
                if (!isValidUuid) {
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
                        folder: options.folder,
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

    //
    // Internal APIs
    //

    // Local Storage API

    EmailSync.prototype._localListMessages = function(options, callback) {
        var dbType = 'email_' + options.folder;
        if (typeof options.uid !== 'undefined') {
            dbType = dbType + '_' + options.uid;
        }
        this._devicestorage.listItems(dbType, 0, null, callback);
    };

    EmailSync.prototype._localStoreMessages = function(options, callback) {
        var dbType = 'email_' + options.folder;
        this._devicestorage.storeList(options.emails, dbType, callback);
    };

    EmailSync.prototype._localDeleteMessage = function(options, callback) {
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
     * Mark imap messages as un-/read or un-/answered
     */
    EmailSync.prototype._imapMark = function(options, callback) {
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

    /**
     * Returns the relevant messages corresponding to the search terms in the options
     * @param {String} options.folder The folder's path
     * @param {Boolean} options.answered (optional) Mails with or without the \Answered flag set.
     * @param {Boolean} options.unread (optional) Mails with or without the \Seen flag set.
     * @param {Function} callback(error, uids) invoked with the uids of messages matching the search terms, or an error object if an error occurred
     */
    EmailSync.prototype._imapSearch = function(options, callback) {
        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        var o = {
            path: options.folder
        };

        if (typeof options.answered !== 'undefined') {
            o.answered = options.answered;
        }
        if (typeof options.unread !== 'undefined') {
            o.unread = options.unread;
        }

        this._imapClient.search(o, callback);
    };

    EmailSync.prototype._imapDeleteMessage = function(options, callback) {
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
     * Get an email messsage without the body
     * @param {String} options.folder The folder
     * @param {Number} options.firstUid The lower bound of the uid (inclusive)
     * @param {Number} options.lastUid The upper bound of the uid range (inclusive)
     * @param {Function} callback (error, messages) The callback when the imap client is done fetching message metadata
     */
    EmailSync.prototype._imapListMessages = function(options, callback) {
        var self = this;

        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        self._imapClient.listMessagesByUid({
            path: options.folder,
            firstUid: options.firstUid,
            lastUid: options.lastUid
        }, callback);
    };

    /**
     * Stream an email messsage's body
     * @param {String} options.folder The folder
     * @param {Object} options.message The message, as retrieved by _imapListMessages
     * @param {Function} callback (error, message) The callback when the imap client is done streaming message text content
     */
    EmailSync.prototype._imapStreamText = function(options, callback) {
        var self = this;

        if (!this._account.online) {
            callback({
                errMsg: 'Client is currently offline!',
                code: 42
            });
            return;
        }

        self._imapClient.getBody({
            path: options.folder,
            message: options.message
        }, callback);
    };

    return EmailSync;
});