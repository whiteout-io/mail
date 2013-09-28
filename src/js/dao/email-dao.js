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
    EmailDAO.prototype.init = function(account, password, callback) {
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
            self._crypto.init({
                emailAddress: emailAddress,
                password: password,
                keySize: self._account.symKeySize,
                rsaKeySize: self._account.asymKeySize,
                storedKeypair: storedKeypair
            }, function(err, generatedKeypair) {
                if (err) {
                    callback(err);
                    return;
                }

                if (generatedKeypair) {
                    // persist newly generated keypair
                    self._keychain.putUserKeyPair(generatedKeypair, callback);
                } else {
                    callback();
                }
            });
        }
    };

    //
    // IMAP/SMTP Apis
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
            self.encryptForUser(email, receiverPubkey, callback);
        });
    };

    /**
     * Encrypt an email asymmetrically for an exisiting user with their public key
     */
    EmailDAO.prototype.encryptForUser = function(email, receiverPubkey, callback) {
        var self = this,
            ptItems = bundleForEncryption(email),
            receiverPubkeys = [receiverPubkey];

        // encrypt the email
        self._crypto.encryptListForUser(ptItems, receiverPubkeys, function(err, encryptedList) {
            if (err) {
                callback(err);
                return;
            }

            // bundle encrypted email together for sending
            bundleEncryptedItems(email, encryptedList);

            self.send(email, callback);
        });
    };

    /**
     * Encrypt an email symmetrically for a new user, write the secret one time key to the cloudstorage REST service, and send the email client side via SMTP.
     */
    EmailDAO.prototype.encryptForNewUser = function(email, callback) {
        var self = this,
            ptItems = bundleForEncryption(email);

        self._crypto.symEncryptList(ptItems, function(err, result) {
            if (err) {
                callback(err);
                return;
            }

            // bundle encrypted email together for sending
            bundleEncryptedItems(email, result.list);

            // TODO: write result.key to REST endpoint

            self.send(email, callback);
        });
    };

    /**
     * Give the email a newly generated UUID, remove its attachments, and bundle all plaintext items to a batchable array for encryption.
     */

    function bundleForEncryption(email) {
        var ptItems = [email];

        // generate a new UUID for the new email
        email.id = util.UUID();

        // add attachment to encryption batch and remove from email object
        if (email.attachments) {
            email.attachments.forEach(function(attachment) {
                attachment.id = email.id;
                ptItems.push(attachment);
            });
            delete email.attachments;
        }

        return ptItems;
    }

    /**
     * Frame the encrypted email message and append the encrypted attachments.
     */

    function bundleEncryptedItems(email, encryptedList) {
        var i;

        // replace body and subject of the email with encrypted versions
        email = frameEncryptedMessage(email, encryptedList[0]);

        // add encrypted attachments
        if (encryptedList.length > 1) {
            email.attachments = [];
        }
        for (i = 1; i < encryptedList.length; i++) {
            email.attachments.push({
                fileName: 'Encrypted Attachment ' + i,
                contentType: 'application/octet-stream',
                uint8Array: util.binStr2Uint8Arr(JSON.stringify(encryptedList[i]))
            });
        }
    }

    /**
     * Frames an encrypted message in base64 Format.
     */

    function frameEncryptedMessage(email, ct) {
        var to, greeting, ctBase64;

        var SUBJECT = str.subject,
            MESSAGE = str.message + '\n\n\n',
            PREFIX = str.cryptPrefix + '\n',
            SUFFIX = '\n' + str.cryptSuffix,
            SIGNATURE = '\n\n\n' + str.signature + '\n' + str.webSite + '\n\n';

        // get first name of recipient
        to = (email.to[0].name || email.to[0].address).split('@')[0].split('.')[0].split(' ')[0];
        greeting = 'Hi ' + to + ',\n\n';

        // build encrypted text body
        ctBase64 = btoa(JSON.stringify(ct));
        email.body = greeting + MESSAGE + PREFIX + ctBase64 + SUFFIX + SIGNATURE;
        email.subject = SUBJECT;

        return email;
    }

    /**
     * Send an actual message object via smtp
     */
    EmailDAO.prototype.send = function(email, callback) {
        var self = this;

        self._smtpClient.send(email, callback);
    };

    /**
     * List the folders in the user's IMAP mailbox.
     */
    EmailDAO.prototype.imapListFolders = function(callback) {
        var self = this;

        self._imapClient.listAllFolders(callback);
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
            displayList = [],
            encryptedList = [];

        // validate options
        if (!options.folder || typeof options.offset === 'undefined' || typeof options.num === 'undefined') {
            callback({
                errMsg: 'Invalid options!'
            });
            return;
        }

        // fetch items from device storage
        self._devicestorage.listItems('email_' + options.folder, options.offset, options.num, function(err, emails) {
            if (err) {
                callback(err);
                return;
            }
            if (emails.length === 0) {
                callback(null, []);
                return;
            }

            // find encrypted items
            emails.forEach(function(i) {
                if (i.body.indexOf(str.cryptPrefix) !== -1 && i.body.indexOf(str.cryptSuffix) !== -1) {
                    // add item to plaintext list for display later
                    displayList.push(i);
                    // parse ct object from ascii armored message block
                    encryptedList.push(parseMessageBlock(i));
                }
            });

            // decrypt items
            decryptList(encryptedList, function(err, decryptedList) {
                // replace encrypted subject and body
                for (var j = 0; j < displayList.length; j++) {
                    displayList[j].subject = decryptedList[j].subject;
                    displayList[j].body = decryptedList[j].body;
                }

                // return only decrypted items
                callback(null, displayList);
            });
        });

        function parseMessageBlock(email) {
            var ctMessageBase64, ctMessageJson, ctMessage;

            // parse email body for encrypted message block
            try {
                // get base64 encoded message block
                ctMessageBase64 = email.body.split(str.cryptPrefix)[1].split(str.cryptSuffix)[0].trim();
                // decode bae64
                ctMessageJson = atob(ctMessageBase64);
                // parse json string to get ciphertext object
                ctMessage = JSON.parse(ctMessageJson);
            } catch (e) {
                callback({
                    errMsg: 'Error parsing encrypted message block!'
                });
                return;
            }

            return ctMessage;
        }

        function decryptList(encryptedList, callback) {
            var already, pubkeyIds = [];

            // gather public key ids required to verify signatures
            encryptedList.forEach(function(i) {
                already = null;
                already = _.findWhere(pubkeyIds, {
                    _id: i.senderPk
                });
                if (!already) {
                    pubkeyIds.push({
                        _id: i.senderPk
                    });
                }
            });

            // fetch public keys from keychain
            self._keychain.getPublicKeys(pubkeyIds, function(err, senderPubkeys) {
                if (err) {
                    callback(err);
                    return;
                }

                // verfiy signatures and re-encrypt item keys
                self._crypto.decryptListForUser(encryptedList, senderPubkeys, function(err, decryptedList) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    callback(null, decryptedList);
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

        // validate options
        if (!options.folder || typeof options.offset === 'undefined' || typeof options.num === 'undefined') {
            callback({
                errMsg: 'Invalid options!'
            });
            return;
        }

        fetchList(options, function(emails) {
            // delete old items from db
            self._devicestorage.removeList(dbType, function(err) {
                if (err) {
                    callback(err);
                    return;
                }
                // persist encrypted list in device storage
                self._devicestorage.storeList(emails, dbType, function(err) {
                    callback(err);
                });
            });
        });

        function fetchList(folder, callback) {
            var encryptedList = [];

            // fetch imap folder's message list
            self.imapListMessages({
                folder: options.folder,
                offset: options.offset,
                num: options.num
            }, function(err, emails) {
                if (err) {
                    console.log(err);
                    return;
                }

                // find encrypted messages by subject
                emails.forEach(function(i) {
                    if (i.subject === str.subject) {
                        encryptedList.push(i);
                    }
                });

                // fetch message bodies
                fetchBodies(encryptedList, folder, function(messages) {
                    callback(messages);
                });
            });
        }

        function fetchBodies(messageList, folder, callback) {
            var emails = [];

            if (messageList.length < 1) {
                callback(emails);
                return;
            }

            var after = _.after(messageList.length, function() {
                callback(emails);
            });

            _.each(messageList, function(messageItem) {
                self.imapGetMessage({
                    folder: folder,
                    uid: messageItem.uid
                }, function(err, message) {
                    if (err) {
                        console.log(err);
                        return;
                    }

                    emails.push(message);
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

        // validate options
        if (!options.folder || typeof options.offset === 'undefined' || typeof options.num === 'undefined') {
            callback({
                errMsg: 'Invalid options!'
            });
            return;
        }

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
        var self = this,
            expectedItems,
            itemCounter = 0,
            message /*, attachments = []*/ ;

        // validate options
        if (!options.folder || !options.uid) {
            callback({
                errMsg: 'Invalid options!'
            });
            return;
        }

        function messageReady(err, gottenMessage) {
            message = gottenMessage;
            itemCounter++;
            // remember how many items should be fetched before the callback fires
            expectedItems = (message.attachments instanceof Array) ? message.attachments.length + 1 : 1;

            // TODO: remove once attachments work again
            if (itemCounter > 1) {
                return;
            }

            // return message
            callback(null, message);

            //check();
        }

        // function attachmentReady(err, gottenAttachment) {
        //     attachments.push(gottenAttachment);
        //     itemCounter++;
        //     check();
        // }

        // function check() {
        //     // go for another round you don't yet know how mich to fetch or you haven't fetch enough
        //     if (!expectedItems || itemCounter < expectedItems) {
        //         return;
        //     }

        //     // overwrite attachments array with the uint8array variant
        //     message.attachments = (attachments.length > 0) ? attachments : undefined;
        //     // cache message object in memory
        //     self.cacheItem(options.folder, message);

        //     callback(null, message);
        // }

        self._imapClient.getMessage({
            path: options.folder,
            uid: options.uid,
            textOnly: true
        }, messageReady);
    };

    /**
     * Checks if an item is already cached and if not, cache it.
     */
    EmailDAO.prototype.cacheItem = function(folderName, item) {
        var self = this;

        // check if account has a folders attribute
        if (!self._account.folders) {
            self._account.folders = {};
        }
        // create folder if not existant
        if (!self._account.folders[folderName]) {
            self._account.folders[folderName] = {};
        }

        // cache item
        self._account.folders[folderName][item.uid] = item;
    };

    /**
     * Fetch an item from the cache with the following id
     */
    EmailDAO.prototype.readCache = function(folderName, itemId) {
        var self = this;

        // check if account has a folders attribute
        if (!self._account.folders) {
            return;
        }
        // check folder
        if (!self._account.folders[folderName]) {
            return;
        }

        return self._account.folders[folderName][itemId];
    };

    return EmailDAO;
});