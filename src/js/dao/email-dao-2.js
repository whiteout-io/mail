define(function(require) {
    'use strict';

    var util = require('cryptoLib/util'),
        _ = require('underscore'),
        str = require('js/app-config').string;
    // config = require('js/app-config').config;

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
         * delta1: storage > memory  => we deleted messages, remove from remote
         * delta2:  memory > storage => we added messages, push to remote <<< not supported yet
         * delta3:  memory > imap    => we deleted messages directly from the remote, remove from memory and storage
         * delta4:    imap > memory  => we have new messages available, fetch to memory and storage
         */

        var self = this,
            folder,
            delta1 /*, delta2 */ , delta3, delta4,
            isFolderInitialized;


        // validate options
        if (!options.folder) {
            callback({
                errMsg: 'Invalid options!'
            });
            return;
        }

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
                    callback(err);
                    return;
                }

                if (_.isEmpty(messages)) {
                    // if there's nothing here, we're good
                    callback();
                    return;
                }

                var after = _.after(messages.length, function() {
                    callback();
                    doImapDelta();
                });

                messages.forEach(function(message) {
                    handleMessage(message, function(cleartextMessage) {
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
                /*
                 * delta1: storage > memory  => we deleted messages, remove from remote
                 * delta2:  memory > storage => we added messages, push to remote
                 */
                delta1 = checkDelta(messages, folder.messages);
                // delta2 = checkDelta(folder.messages, messages); // not supported yet

                if (_.isEmpty(delta1) /* && _.isEmpty(delta2)*/ ) {
                    // if there is no delta, head directly to imap sync
                    doImapDelta();
                    callback();
                    return;
                }

                doDelta1();

                function doDelta1() {
                    var after = _.after(delta1.length, function() {
                        // doDelta2(); when it is implemented
                        doImapDelta();
                        callback();
                    });

                    delta1.forEach(function(message) {
                        var deleteMe = {
                            folder: folder.path,
                            uid: message.uid
                        };

                        self._imapDeleteMessage(deleteMe, function(err) {
                            if (err) {
                                callback(err);
                                return;
                            }

                            self._localDeleteMessage(deleteMe, function(err) {
                                if (err) {
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
                    callback(err);
                    return;
                }

                // ignore non-whiteout mails
                headers = _.without(headers, _.filter(headers, function(header) {
                    return header.subject.indexOf(str.subjectPrefix) === -1;
                }));

                /*
                 * delta3:  memory > imap    => we deleted messages directly from the remote, remove from memory and storage
                 * delta4:    imap > memory  => we have new messages available, fetch to memory and storage
                 */
                delta3 = checkDelta(folder.messages, headers);
                delta4 = checkDelta(headers, folder.messages);

                if (_.isEmpty(delta3) && _.isEmpty(delta4)) {
                    // if there is no delta, we're done
                    callback();
                    return;
                }

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
                        callback();
                    }

                    var after = _.after(delta4.length, function() {
                        callback();
                    });

                    delta4.forEach(function(header) {
                        // get the whole message
                        self._imapGetMessage({
                            folder: folder.path,
                            uid: header.uid
                        }, function(err, message) {
                            if (err) {
                                callback(err);
                                return;
                            }

                            // add the encrypted message to the local storage
                            self._localStoreMessages({
                                folder: folder.path,
                                emails: [message]
                            }, function(err) {
                                if (err) {
                                    callback(err);
                                    return;
                                }

                                // decrypt and add to folder in memory
                                handleMessage(message, function(err, cleartextMessage) {
                                    if (err) {
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

        function handleMessage(message, localCallback) {
            if (containsArmoredCiphertext(message)) {
                decrypt(message, localCallback);
                return;
            }

            // cleartext mail
            localCallback(null, message);
            after();
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

    EmailDAO.prototype.markRead = function(options, callback) {
        this._imapClient.updateFlags({
            path: options.folder,
            uid: options.uid,
            unread: false
        }, callback);
    };

    EmailDAO.prototype.markAnswered = function(options, callback) {
        this._imapClient.updateFlags({
            path: options.folder,
            uid: options.uid,
            answered: true
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
                keys: receiverPubkey.publicKey
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

        options.keys = [options.keys] || [];

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
            email.subject = email.subject;
        }
    };

    // Local Storage API

    EmailDAO.prototype._localListMessages = function(options, callback) {
        var dbType = 'email_' + options.folder;
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



    // /**
    //  * Get the number of unread message for a folder
    //  */
    // EmailDAO.prototype.unreadMessages = function(path, callback) {
    //     var self = this;

    //     self._imapClient.unreadMessages(path, callback);
    // };

    // /**
    //  * Fetch a list of emails from the device's local storage
    //  */
    // EmailDAO.prototype.listMessages = function(options, callback) {
    //     var self = this,
    //         cleartextList = [];

    //     // validate options
    //     if (!options.folder) {
    //         callback({
    //             errMsg: 'Invalid options!'
    //         });
    //         return;
    //     }
    //     options.offset = (typeof options.offset === 'undefined') ? 0 : options.offset;
    //     options.num = (typeof options.num === 'undefined') ? null : options.num;

    //     // fetch items from device storage
    //     self._devicestorage.listItems('email_' + options.folder, options.offset, options.num, function(err, emails) {
    //         if (err) {
    //             callback(err);
    //             return;
    //         }

    //         if (emails.length === 0) {
    //             callback(null, cleartextList);
    //             return;
    //         }

    //         var after = _.after(emails.length, function() {
    //             callback(null, cleartextList);
    //         });

    //         _.each(emails, function(email) {
    //             handleMail(email, after);
    //         });
    //     });

    //     function handleMail(email, localCallback) {
    //         // remove subject filter prefix
    //         email.subject = email.subject.split(str.subjectPrefix)[1];

    //         // encrypted mail
    //         if (isPGPMail(email)) {
    //             email = parseMessageBlock(email);
    //             decrypt(email, localCallback);
    //             return;
    //         }

    //         // verification mail
    //         if (isVerificationMail(email)) {
    //             verify(email, localCallback);
    //             return;
    //         }

    //         // cleartext mail
    //         cleartextList.push(email);
    //         localCallback();
    //     }

    //     function isPGPMail(email) {
    //         return typeof email.body === 'string' && email.body.indexOf(str.cryptPrefix) !== -1 && email.body.indexOf(str.cryptSuffix) !== -1;
    //     }

    //     function isVerificationMail(email) {
    //         return email.subject === str.verificationSubject;
    //     }

    //     function parseMessageBlock(email) {
    //         var messageBlock;

    //         // parse email body for encrypted message block
    //         // get ascii armored message block by prefix and suffix
    //         messageBlock = email.body.split(str.cryptPrefix)[1].split(str.cryptSuffix)[0];
    //         // add prefix and suffix again
    //         email.body = str.cryptPrefix + messageBlock + str.cryptSuffix;

    //         return email;
    //     }

    //     function decrypt(email, localCallback) {
    //         // fetch public key required to verify signatures
    //         var sender = email.from[0].address;
    //         self._keychain.getReceiverPublicKey(sender, function(err, senderPubkey) {
    //             if (err) {
    //                 callback(err);
    //                 return;
    //             }

    //             if (!senderPubkey) {
    //                 // this should only happen if a mail from another channel is in the inbox
    //                 setBodyAndContinue('Public key for sender not found!');
    //                 return;
    //             }

    //             // decrypt and verfiy signatures
    //             self._pgp.decrypt(email.body, senderPubkey.publicKey, function(err, decrypted) {
    //                 if (err) {
    //                     decrypted = err.errMsg;
    //                 }

    //                 setBodyAndContinue(decrypted);
    //             });
    //         });

    //         function setBodyAndContinue(text) {
    //             email.body = text;
    //             cleartextList.push(email);
    //             localCallback();
    //         }
    //     }

    //     function verify(email, localCallback) {
    //         var uuid, index,
    //             verifiyUrlPrefix = config.cloudUrl + config.verificationUrl;

    //         if (!email.unread) {
    //             // don't bother if the email was already marked as read
    //             localCallback();
    //             return;
    //         }

    //         index = email.body.indexOf(verifiyUrlPrefix);
    //         if (index === -1) {
    //             localCallback();
    //             return;
    //         }

    //         uuid = email.body.split(config.verificationUrl)[1];
    //         self._keychain.verifyPublicKey(uuid, function(err) {
    //             if (err) {
    //                 callback({
    //                     errMsg: 'Verifying your public key failed: ' + err.errMsg
    //                 });
    //                 return;
    //             }

    //             // public key has been verified, mark the message as read, delete it, and ignore it in the future
    //             self.imapMarkMessageRead({
    //                 folder: options.folder,
    //                 uid: email.uid
    //             }, function(err) {
    //                 if (err) {
    //                     // if marking the mail as read failed, don't bother
    //                     localCallback();
    //                     return;
    //                 }

    //                 self.imapDeleteMessage({
    //                     folder: options.folder,
    //                     uid: email.uid
    //                 }, function() {
    //                     localCallback();
    //                 });
    //             });
    //         });
    //     }
    // };

    // /**
    //  * High level sync operation for the delta from the user's IMAP inbox
    //  */
    // EmailDAO.prototype.imapSync = function(options, callback) {
    //     var self = this,
    //         dbType = 'email_' + options.folder;

    //     fetchList(function(err, emails) {
    //         if (err) {
    //             callback(err);
    //             return;
    //         }

    //         // delete old items from db
    //         self._devicestorage.removeList(dbType, function(err) {
    //             if (err) {
    //                 callback(err);
    //                 return;
    //             }

    //             // persist encrypted list in device storage
    //             self._devicestorage.storeList(emails, dbType, callback);
    //         });
    //     });

    //     function fetchList(callback) {
    //         var headers = [];

    //         // fetch imap folder's message list
    //         self.imapListMessages({
    //             folder: options.folder,
    //             offset: options.offset,
    //             num: options.num
    //         }, function(err, emails) {
    //             if (err) {
    //                 callback(err);
    //                 return;
    //             }

    //             // find encrypted messages by subject
    //             emails.forEach(function(i) {
    //                 if (typeof i.subject === 'string' && i.subject.indexOf(str.subjectPrefix) !== -1) {
    //                     headers.push(i);
    //                 }
    //             });

    //             // fetch message bodies
    //             fetchBodies(headers, callback);
    //         });
    //     }

    //     function fetchBodies(headers, callback) {
    //         var emails = [];

    //         if (headers.length < 1) {
    //             callback(null, emails);
    //             return;
    //         }

    //         var after = _.after(headers.length, function() {
    //             callback(null, emails);
    //         });

    //         _.each(headers, function(header) {
    //             self.imapGetMessage({
    //                 folder: options.folder,
    //                 uid: header.uid
    //             }, function(err, message) {
    //                 if (err) {
    //                     callback(err);
    //                     return;
    //                 }

    //                 // set gotten attributes like body to message object containing list meta data like 'unread' or 'replied'
    //                 header.id = message.id;
    //                 header.body = message.body;
    //                 header.html = message.html;
    //                 header.attachments = message.attachments;

    //                 emails.push(header);
    //                 after();
    //             });
    //         });
    //     }
    // };



    // EmailDAO.prototype.imapMoveMessage = function(options, callback) {
    //     var self = this;

    //     self._imapClient.moveMessage({
    //         path: options.folder,
    //         uid: options.uid,
    //         destination: options.destination
    //     }, moved);

    //     function moved(err) {
    //         if (err) {
    //             callback(err);
    //             return;
    //         }

    //         // delete from local db
    //         self._devicestorage.removeList('email_' + options.folder + '_' + options.uid, callback);
    //     }
    // };

    // EmailDAO.prototype.imapMarkMessageRead = function(options, callback) {
    //     var self = this;

    //     self._imapClient.updateFlags({
    //         path: options.folder,
    //         uid: options.uid,
    //         unread: false
    //     }, callback);
    // };

    // EmailDAO.prototype.imapMarkAnswered = function(options, callback) {
    //     var self = this;

    //     self._imapClient.updateFlags({
    //         path: options.folder,
    //         uid: options.uid,
    //         answered: true
    //     }, callback);
    // };

    // //
    // // SMTP Apis
    // //

    // /**
    //  * Send an email client side via STMP.
    //  */
    // EmailDAO.prototype.encryptedSend = function(email, callback) {
    //     var self = this,
    //         invalidRecipient;

    //     // validate the email input
    //     if (!email.to || !email.from || !email.to[0].address || !email.from[0].address) {
    //         callback({
    //             errMsg: 'Invalid email object!'
    //         });
    //         return;
    //     }

    //     // validate email addresses
    //     _.each(email.to, function(i) {
    //         if (!util.validateEmailAddress(i.address)) {
    //             invalidRecipient = i.address;
    //         }
    //     });
    //     if (invalidRecipient) {
    //         callback({
    //             errMsg: 'Invalid recipient: ' + invalidRecipient
    //         });
    //         return;
    //     }
    //     if (!util.validateEmailAddress(email.from[0].address)) {
    //         callback({
    //             errMsg: 'Invalid sender: ' + email.from
    //         });
    //         return;
    //     }

    //     // only support single recipient for e-2-e encryption
    //     // check if receiver has a public key
    //     self._keychain.getReceiverPublicKey(email.to[0].address, function(err, receiverPubkey) {
    //         if (err) {
    //             callback(err);
    //             return;
    //         }

    //         // validate public key
    //         if (!receiverPubkey) {
    //             callback({
    //                 errMsg: 'User has no public key yet!'
    //             });
    //             return;
    //         }

    //         // public key found... encrypt and send
    //         self.encryptForUser({
    //             email: email,
    //             receiverPubkey: receiverPubkey.publicKey
    //         }, function(err, email) {
    //             if (err) {
    //                 callback(err);
    //                 return;
    //             }

    //             self.send(email, callback);
    //         });
    //     });
    // };

    // /**
    //  * Encrypt an email asymmetrically for an exisiting user with their public key
    //  */
    // EmailDAO.prototype.encryptForUser = function(options, callback) {
    //     var self = this,
    //         pt = options.email.body,
    //         receiverPubkeys = options.receiverPubkey ? [options.receiverPubkey] : [];

    //     // get own public key so send message can be read
    //     self._pgp.exportKeys(function(err, ownKeys) {
    //         if (err) {
    //             callback(err);
    //             return;
    //         }

    //         // add own public key to receiver list
    //         receiverPubkeys.push(ownKeys.publicKeyArmored);
    //         // encrypt the email
    //         self._pgp.encrypt(pt, receiverPubkeys, function(err, ct) {
    //             if (err) {
    //                 callback(err);
    //                 return;
    //             }

    //             // bundle encrypted email together for sending
    //             frameEncryptedMessage(options.email, ct);
    //             callback(null, options.email);
    //         });
    //     });
    // };

    // /**
    //  * Frames an encrypted message in base64 Format.
    //  */
    // function frameEncryptedMessage(email, ct) {
    //     var to, greeting;

    //     var MESSAGE = str.message + '\n\n\n',
    //         SIGNATURE = '\n\n' + str.signature + '\n\n';

    //     // get first name of recipient
    //     to = (email.to[0].name || email.to[0].address).split('@')[0].split('.')[0].split(' ')[0];
    //     greeting = 'Hi ' + to + ',\n\n';

    //     // build encrypted text body
    //     email.body = greeting + MESSAGE + ct + SIGNATURE;
    //     email.subject = str.subjectPrefix + email.subject;
    // }

    // /**
    //  * Send an actual message object via smtp
    //  */
    // EmailDAO.prototype.send = function(email, callback) {
    //     var self = this;

    //     self._smtpClient.send(email, callback);
    // };

    // EmailDAO.prototype.store = function(email, callback) {
    //     var self = this,
    //         dbType = 'email_OUTBOX';

    //     email.id = util.UUID();

    //     // encrypt
    //     self.encryptForUser({
    //         email: email
    //     }, function(err, email) {
    //         if (err) {
    //             callback(err);
    //             return;
    //         }

    //         // store to local storage
    //         self._devicestorage.storeList([email], dbType, callback);
    //     });
    // };

    // EmailDAO.prototype.list = function(callback) {
    //     var self = this,
    //         dbType = 'email_OUTBOX';

    //     self._devicestorage.listItems(dbType, 0, null, function(err, mails) {
    //         if (err) {
    //             callback(err);
    //             return;
    //         }

    //         if (mails.length === 0) {
    //             callback(null, []);
    //             return;
    //         }

    //         self._pgp.exportKeys(function(err, ownKeys) {
    //             if (err) {
    //                 callback(err);
    //                 return;
    //             }

    //             var after = _.after(mails.length, function() {
    //                 callback(null, mails);
    //             });

    //             mails.forEach(function(mail) {
    //                 mail.body = str.cryptPrefix + mail.body.split(str.cryptPrefix)[1].split(str.cryptSuffix)[0] + str.cryptSuffix;
    //                 self._pgp.decrypt(mail.body, ownKeys.publicKeyArmored, function(err, decrypted) {
    //                     mail.body = err ? err.errMsg : decrypted;
    //                     mail.subject = mail.subject.split(str.subjectPrefix)[1];
    //                     after();
    //                 });
    //             });

    //         });
    //     });
    // };

    return EmailDAO;
});