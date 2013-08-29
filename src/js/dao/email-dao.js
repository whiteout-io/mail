define(function(require) {
    'use strict';

    var _ = require('underscore'),
        util = require('cryptoLib/util'),
        crypto = require('js/crypto/crypto'),
        jsonDB = require('js/dao/lawnchair-dao'),
        devicestorage = require('js/dao/devicestorage-dao'),
        app = require('js/app-config');

    var SUBJECT = '[whiteout] Encrypted message',
        MESSAGE = 'this is a private conversation. To read my encrypted message below, simply install Whiteout Mail for Chrome. The app is really easy to use and automatically encrypts sent emails, so that only the two of us can read them: https://chrome.google.com/webstore/detail/whiteout-mail/jjgghafhamholjigjoghcfcekhkonijg\n\n\n',
        PREFIX = '-----BEGIN ENCRYPTED MESSAGE-----\n',
        SUFFIX = '\n-----END ENCRYPTED MESSAGE-----',
        SIGNATURE = '\n\n\nSent securely from whiteout mail\nhttp://whiteout.io\n\n';

    /**
     * A high-level Data-Access Api for handling Email synchronization
     * between the cloud service and the device's local storage
     */
    var EmailDAO = function(keychain, imapClient, smtpClient) {
        var self = this;

        self._keychain = keychain;
        self._imapClient = imapClient;
        self._smtpClient = smtpClient;
    };

    /**
     * Inits all dependencies
     */
    EmailDAO.prototype.init = function(account, password, callback) {
        var self = this;

        self._account = account;

        // validate email address
        var emailAddress = self._account.emailAddress;
        if (!validateEmail(emailAddress)) {
            callback({
                errMsg: 'The user email address must be specified!'
            });
            return;
        }

        // login IMAP client if existent
        if (self._imapClient) {
            self._imapClient.login(function(err) {
                if (err) {
                    callback(err);
                    return;
                }
                initKeychain();
            });
        } else {
            initKeychain();
        }

        function initKeychain() {
            // init user's local database
            jsonDB.init(emailAddress);

            // call getUserKeyPair to read/sync keypair with devicestorage/cloud
            self._keychain.getUserKeyPair(emailAddress, function(err, storedKeypair) {
                if (err) {
                    callback(err);
                    return;
                }
                // init crypto
                initCrypto(storedKeypair);
            });
        }

        function initCrypto(storedKeypair) {
            crypto.init({
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
            if (!validateEmail(i.address)) {
                invalidRecipient = i.address;
            }
        });
        if (invalidRecipient) {
            callback({
                errMsg: 'Invalid recipient: ' + invalidRecipient
            });
            return;
        }
        if (!validateEmail(email.from[0].address)) {
            callback({
                errMsg: 'Invalid sender: ' + email.from
            });
            return;
        }

        // generate a new UUID for the new email
        email.id = util.UUID();

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
                    errMsg: 'No public key found for: ' + email.from
                });
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
            ptItems = [email],
            receiverPubkeys = [receiverPubkey],
            to, greeting, ct, i;

        // add attachment to encryption batch and remove from email object
        if (email.attachments) {
            email.attachments.forEach(function(attachment) {
                attachment.id = email.id;
                ptItems.push(attachment);
            });
            delete email.attachments;
        }

        // encrypt the email
        crypto.encryptListForUser(ptItems, receiverPubkeys, function(err, encryptedList) {
            if (err) {
                callback(err);
                return;
            }

            // get first name of recipient
            to = (email.to[0].name || email.to[0].address).split('@')[0].split('.')[0].split(' ')[0];
            greeting = 'Hi ' + to + ',\n\n';

            // build encrypted text body
            ct = btoa(JSON.stringify(encryptedList[0]));
            email.body = greeting + MESSAGE + PREFIX + ct + SUFFIX + SIGNATURE;
            email.subject = SUBJECT;

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

            self.send(email, callback);
        });
    };

    EmailDAO.prototype.send = function(email, callback) {
        var self = this;

        self._smtpClient.send(email, callback);
    };

    /**
     * List the folders in the user's IMAP mailbox.
     */
    EmailDAO.prototype.imapListFolders = function(callback) {
        var self = this;

        self._imapClient.listFolders(callback);
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

        // try fetching from cache before doing a roundtrip
        message = self.readCache(options.folder, options.uid);
        if (message) {
            // message was fetched from cache successfully
            callback(null, message);
            return;
        }

        /* message was not found in cache... fetch from imap server */

        function messageReady(err, gottenMessage) {
            message = gottenMessage;
            itemCounter++;
            // remember how many items should be fetched before the callback fires
            expectedItems = (message.attachments instanceof Array) ? message.attachments.length + 1 : 1;

            // decrypt Message body
            if (message.body.indexOf(PREFIX) !== -1 && message.body.indexOf(SUFFIX) !== -1) {
                decryptMessageBody(message, function(err, ptMessage) {
                    message = ptMessage;
                    // return decrypted message
                    callback(null, message);
                });
                return;
            }

            // return unencrypted message
            callback(null, message);

            //check();
        }

        function decryptMessageBody(email, callback) {
            var ctMessageBase64, ctMessage, pubkeyIds;

            // parse email body for encrypted message block
            try {
                ctMessageBase64 = email.body.split(PREFIX)[1].split(SUFFIX)[0];
                ctMessage = JSON.parse(atob(ctMessageBase64));
            } catch (e) {
                callback({
                    errMsg: 'Error parsing encrypted message block!'
                });
                return;
            }

            // gather public key ids required to verify signatures
            pubkeyIds = [{
                _id: ctMessage.senderPk
            }];

            // fetch public keys from keychain
            self._keychain.getPublicKeys(pubkeyIds, function(err, senderPubkeys) {
                if (err) {
                    callback(err);
                    return;
                }

                // verfiy signatures and re-encrypt item keys
                crypto.decryptListForUser([ctMessage], senderPubkeys, function(err, decryptedList) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    var ptEmail = decryptedList[0];
                    email.body = ptEmail.body;
                    email.subject = ptEmail.subject;

                    callback(null, email);
                });
            });
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
            onMessageBody: messageReady,
            /*onAttachment: attachmentReady*/
        });
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

    //
    // Cloud storage Apis
    //

    /**
     * Fetch a list of emails from the device's local storage
     * @param offset [Number] The offset of items to fetch (0 is the last stored item)
     * @param num [Number] The number of items to fetch (null means fetch all)
     */
    EmailDAO.prototype.listItems = function(folderName, offset, num, callback) {
        var self = this,
            collection, folder;

        // check if items are in memory already (_account.folders model)
        folder = self._account.get('folders').where({
            name: folderName
        })[0];

        if (!folder) {
            // get encrypted items from storage
            devicestorage.listEncryptedItems('email_' + folderName, offset, num, function(err, encryptedList) {
                if (err) {
                    callback(err);
                    return;
                }
                if (encryptedList.length === 0) {
                    callback(null, []);
                    return;
                }

                // decrypt list
                crypto.decryptKeysAndList(encryptedList, function(err, decryptedList) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    // cache collection in folder memory
                    if (decryptedList.length > 0) {
                        folder = new app.model.Folder({
                            name: folderName
                        });
                        folder.set('items', decryptedList);
                        self._account.get('folders').add(folder);
                    }

                    callback(null, decryptedList);
                });
            });

        } else {
            // read items from memory
            collection = folder.get('items');
            callback(null, collection);
        }
    };

    /**
     * Synchronize a folder's items from the cloud to the device-storage
     * @param folderName [String] The name of the folder e.g. 'inbox'
     */
    EmailDAO.prototype.syncFromCloud = function(folderName, callback) {
        var self = this,
            folder, already, pubkeyIds = [];

        // fetch most recent date
        this.listItems(folderName, 0, 1, function(err, localItems) {
            if (err) {
                callback(err); // error
                return;
            }

            var filter = '';
            if (localItems && localItems.length > 0) {
                // get gmt date since that's what the storage service seems to use
                var sentDate = localItems[localItems.length - 1].sentDate;
                var date = util.parseDate(sentDate);
                date.setHours(date.getHours() + (date.getTimezoneOffset() / 60));
                var gmtDate = util.formatDate(date);

                // sync delta of last item sent date
                filter = '?date=' + gmtDate;
                startSync(filter);

            } else {
                // do a full sync of all items on the cloud
                startSync(filter);
            }
        });

        function startSync(filter) {
            // fetch items from the cloud
            self._cloudstorage.listEncryptedItems('email', self._account.get('emailAddress'), folderName + filter, function(err, encryptedList) {
                // return if an error occured
                if (err) {
                    callback({
                        errMsg: 'Syncing encrypted items from cloud failed!',
                        err: err
                    }); // error
                    return;
                }
                if (encryptedList.length === 0) {
                    callback();
                    return;
                }

                // TODO: remove old folder items from devicestorage

                reencryptItems(encryptedList);
            });
        }

        function reencryptItems(encryptedList) {
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
                crypto.reencryptListKeysForUser(encryptedList, senderPubkeys, function(err, encryptedKeyList) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    // persist encrypted list in device storage
                    devicestorage.storeEcryptedList(encryptedKeyList, 'email_' + folderName, function() {
                        // remove cached folder in _account model
                        folder = self._account.get('folders').where({
                            name: folderName
                        })[0];
                        if (folder) {
                            self._account.get('folders').remove(folder);
                        }
                        callback();
                    });
                });
            });
        }
    };

    /**
     * Send a plaintext Email to the user's outbox in the cloud
     */
    EmailDAO.prototype.sendEmail = function(email, callback) {
        var self = this,
            userId = self._account.get('emailAddress');

        // validate email addresses
        var invalidRecipient;
        _.each(email.to, function(i) {
            if (!validateEmail(i.address)) {
                invalidRecipient = i.address;
            }
        });
        if (invalidRecipient) {
            callback({
                errMsg: 'Invalid recipient: ' + invalidRecipient
            });
            return;
        }
        if (!validateEmail(email.from[0].address)) {
            callback({
                errMsg: 'Invalid sender: ' + email.from
            });
            return;
        }

        // generate a new UUID for the new email
        email.id = util.UUID();
        // set sent date
        email.sentDate = util.formatDate(new Date());

        // only support single recipient for e-2-e encryption
        var recipient = email.to[0].address;

        // check if receiver has a public key
        self._keychain.getReveiverPublicKey(recipient, function(err, receiverPubkey) {
            if (err) {
                callback(err);
                return;
            }

            if (receiverPubkey) {
                // public key found... encrypt and send
                encrypt(email, receiverPubkey);
            } else {
                // no public key found... send plaintext mail via SMTP
                send(email);
            }
        });

        function encrypt(email, receiverPubkey) {
            // encrypt the email
            crypto.encryptListForUser([email], [receiverPubkey], function(err, encryptedList) {
                if (err) {
                    callback(err);
                    return;
                }

                var ct = encryptedList[0];

                var envelope = {
                    id: email.id,
                    crypto: 'rsa-1024-sha-256-aes-128-cbc',
                    sentDate: email.sentDate,
                    ciphertext: ct.ciphertext,
                    encryptedKey: ct.encryptedKey,
                    iv: ct.iv,
                    signature: ct.signature,
                    senderPk: ct.senderPk
                };

                send(envelope);
            });
        }

        function send(email) {
            // send email via cloud service
            self._cloudstorage.deliverEmail(email, userId, recipient, function(err) {
                callback(err);
            });
        }
    };

    //
    // helper functions
    //

    /**
     * Validates an email address
     */

    function validateEmail(email) {
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }

    return EmailDAO;
});