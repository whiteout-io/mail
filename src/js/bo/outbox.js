define(function(require) {
    'use strict';

    var _ = require('underscore'),
        util = require('cryptoLib/util'),
        config = require('js/app-config').config,
        outboxDb = 'email_OUTBOX';

    /**
     * High level business object that orchestrates the local outbox.
     * The local outbox takes care of the emails before they are being sent.
     * It also checks periodically if there are any mails in the local device storage to be sent.
     */
    var OutboxBO = function(emailDao, keychain, devicestorage) {
        /** @private */
        this._emailDao = emailDao;

        /** @private */
        this._keychain = keychain;

        /** @private */
        this._devicestorage = devicestorage;

        /**
         * Semaphore-esque flag to avoid 'concurrent' calls to _processOutbox when the timeout fires, but a call is still in process.
         * @private */
        this._outboxBusy = false;
    };

    /** 
     * This function activates the periodic checking of the local device storage for pending mails.
     * @param {Function} callback(error, pendingMailsCount) Callback that informs you about the count of pending mails.
     */
    OutboxBO.prototype.startChecking = function(callback) {
        // start periodic checking of outbox
        this._intervalId = setInterval(this._processOutbox.bind(this, callback), config.checkOutboxInterval);
    };

    /**
     * Outbox stops the periodic checking of the local device storage for pending mails.
     */
    OutboxBO.prototype.stopChecking = function() {
        if (!this._intervalId) {
            return;
        }

        clearInterval(this._intervalId);
        delete this._intervalId;
    };

    /**
     * Put a email dto in the outbox for sending when ready
     * @param  {Object}   mail     The Email DTO
     * @param  {Function} callback Invoked when the object was encrypted and persisted to disk
     */
    OutboxBO.prototype.put = function(mail, callback) {
        var self = this,
            allReaders = mail.from.concat(mail.to.concat(mail.cc.concat(mail.bcc))); // all the users that should be able to read the mail

        mail.publicKeysArmored = []; // gather the public keys
        mail.id = util.UUID(); // the mail needs a random uuid for storage in the database

        checkRecipients(allReaders);

        // check if there are unregistered recipients
        function checkRecipients(recipients) {
            var after = _.after(recipients.length, function() {
                encryptAndPersist();
            });

            // find out if there are unregistered users
            recipients.forEach(function(recipient) {
                self._keychain.getReceiverPublicKey(recipient.address, function(err, key) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    // if a public key is available, add the recipient's key to the armored public keys,
                    // otherwise remember the recipient as unregistered for later sending
                    if (key) {
                        mail.publicKeysArmored.push(key.publicKey);
                    }

                    after();
                });
            });
        }


        function encryptAndPersist() {
            // only encrypt if all recipients have public keys
            if (mail.publicKeysArmored.length < allReaders.length) {
                self._devicestorage.storeList([mail], outboxDb, callback);
                return;
            }

            // encrypts the body and attachments and persists the mail object
            self._emailDao.encrypt({
                mail: mail,
                publicKeysArmored: mail.publicKeysArmored
            }, function(err) {
                if (err) {
                    callback(err);
                    return;
                }

                self._devicestorage.storeList([mail], outboxDb, callback);
            });
        }
    };

    /**
     * Checks the local device storage for pending mails.
     * @param {Function} callback(error, pendingMailsCount) Callback that informs you about the count of pending mails.
     */
    OutboxBO.prototype._processOutbox = function(callback) {
        var self = this,
            unsentMails = 0;

        // also, if a _processOutbox call is still in progress, ignore it.
        if (self._outboxBusy) {
            return;
        }

        self._outboxBusy = true;

        // get pending mails from the outbox
        self._devicestorage.listItems(outboxDb, 0, null, function(err, pendingMails) {
            // error, we're done here
            if (err) {
                self._outboxBusy = false;
                callback(err);
                return;
            }

            // if we're not online, don't even bother sending mails.
            if (!self._emailDao._account.online || _.isEmpty(pendingMails)) {
                self._outboxBusy = false;
                callback(null, pendingMails.length);
                return;
            }

            // we're done after all the mails have been handled
            // update the outbox count...
            var after = _.after(pendingMails.length, function() {
                self._outboxBusy = false;
                callback(null, unsentMails);
            });

            // send pending mails if possible
            pendingMails.forEach(function(mail) {
                send(mail, after);
            });
        });

        // send the message
        function send(mail, done) {

            // check is email is to be sent encrypted or as plaintex
            if (mail.encrypted === true) {
                // email was already encrypted before persisting in outbox, tell pgpmailer to send encrypted and not encrypt again
                self._emailDao.sendEncrypted({
                    email: mail
                }, onSend);
            } else {
                // send email as plaintext
                self._emailDao.sendPlaintext({
                    email: mail
                }, onSend);
            }

            function onSend(err) {
                if (err) {
                    self._outboxBusy = false;
                    if (err.code === 42) {
                        // offline try again later
                        done();
                    } else {
                        self._outboxBusy = false;
                        callback(err);
                    }
                    return;
                }

                // remove the pending mail from the storage
                removeFromStorage(mail, done);

                // fire sent notification
                if (typeof self.onSent === 'function') {
                    self.onSent(mail);
                }
            }
        }

        // removes the mail object from disk after successfully sending it
        function removeFromStorage(mail, done) {
            self._devicestorage.removeList(outboxDb + '_' + mail.id, function(err) {
                if (err) {
                    self._outboxBusy = false;
                    callback(err);
                    return;
                }

                done();
            });
        }
    };

    return OutboxBO;
});