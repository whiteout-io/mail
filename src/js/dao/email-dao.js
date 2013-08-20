define(function(require) {
    'use strict';

    var _ = require('underscore'),
        util = require('cryptoLib/util'),
        crypto = require('js/crypto/crypto'),
        jsonDB = require('js/dao/lawnchair-dao'),
        devicestorage = require('js/dao/devicestorage-dao'),
        app = require('js/app-config');

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

        self.account = account;

        // validate email address
        var emailAddress = account.emailAddress;
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
                keySize: account.symKeySize,
                rsaKeySize: account.asymKeySize,
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
    // New IMAP/SMTP implementation
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
        var self = this;

        // validate the email input
        if (!email.to || !email.from || !email.to[0].address || !email.from[0].address) {
            callback({
                errMsg: 'Invalid email object!'
            });
            return;
        }

        self._smtpClient.send(email, callback);
    };

    /**
     * List the folders in the user's IMAP mailbox.
     */
    EmailDAO.prototype.imapListFolders = function(callback) {

    };

    /**
     * List messages from an imap folder. This will not yet fetch the email body.
     * @param {String} options.folderName The name of the imap folder.
     * @param {Number} offset The offset of items to fetch (0 is the last stored item)
     * @param {Number} num The number of items to fetch (null means fetch all)
     */
    EmailDAO.prototype.imapListMessages = function(options, callback) {

    };

    /**
     * Get an email messsage including the email body from imap
     * @param {String} options.messageId The
     */
    EmailDAO.prototype.imapGetMessage = function(options, callback) {

    };

    //
    // Old cloud storage implementation
    //

    /**
     * Fetch an email with the following id
     */
    EmailDAO.prototype.getItem = function(folderName, itemId) {
        var self = this;

        var folder = self.account.get('folders').where({
            name: folderName
        })[0];
        var mail = _.find(folder.get('items'), function(email) {
            return email.id + '' === itemId + '';
        });
        return mail;
    };

    /**
     * Fetch a list of emails from the device's local storage
     * @param offset [Number] The offset of items to fetch (0 is the last stored item)
     * @param num [Number] The number of items to fetch (null means fetch all)
     */
    EmailDAO.prototype.listItems = function(folderName, offset, num, callback) {
        var self = this,
            collection, folder;

        // check if items are in memory already (account.folders model)
        folder = self.account.get('folders').where({
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
                        self.account.get('folders').add(folder);
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
            self._cloudstorage.listEncryptedItems('email', self.account.get('emailAddress'), folderName + filter, function(err, encryptedList) {
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
                        // remove cached folder in account model
                        folder = self.account.get('folders').where({
                            name: folderName
                        })[0];
                        if (folder) {
                            self.account.get('folders').remove(folder);
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
            userId = self.account.get('emailAddress');

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