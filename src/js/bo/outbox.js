define(function(require) {
    'use strict';

    var _ = require('underscore'),
        util = require('cryptoLib/util'),
        str = require('js/app-config').string,
        config = require('js/app-config').config,
        InvitationDAO = require('js/dao/invitation-dao'),
        outboxDb = 'email_OUTBOX';

    /**
     * High level business object that orchestrates the local outbox.
     * The local outbox takes care of the emails before they are being sent.
     * It also checks periodically if there are any mails in the local device storage to be sent.
     */
    var OutboxBO = function(emailDao, keychain, devicestorage, invitationDao) {
        /** @private */
        this._emailDao = emailDao;

        /** @private */
        this._keychain = keychain;

        /** @private */
        this._devicestorage = devicestorage;


        /** @private */
        this._invitationDao = invitationDao;

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
        mail.unregisteredUsers = []; // gather the recipients for which no public key is available
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
                    } else {
                        mail.unregisteredUsers.push(recipient);
                    }

                    after();
                });
            });
        }

        // encrypts the body and attachments and persists the mail object
        function encryptAndPersist() {
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
                handleMail(mail, after);
            });
        });

        // if we can send the mail, do that. otherwise check if there are users that need to be invited
        function handleMail(mail, done) {
            // no unregistered users, go straight to send
            if (mail.unregisteredUsers.length === 0) {
                send(mail, done);
                return;
            }

            var after = _.after(mail.unregisteredUsers.length, function() {
                // invite unregistered users if necessary
                if (mail.unregisteredUsers.length > 0) {
                    unsentMails++;
                    self._invite({
                        sender: mail.from[0],
                        recipients: mail.unregisteredUsers
                    }, done);
                    return;
                }

                // there are public keys available for the missing users,
                // so let's re-encrypt the mail for them and send it
                reencryptAndSend(mail, done);
            });

            // find out if the unregistered users have registered in the meantime
            mail.unregisteredUsers.forEach(function(recipient) {
                self._keychain.getReceiverPublicKey(recipient.address, function(err, key) {
                    var index;

                    if (err) {
                        self._outboxBusy = false;
                        callback(err);
                        return;
                    }

                    if (key) {
                        // remove the newly joined users from the unregistered users
                        index = mail.unregisteredUsers.indexOf(recipient);
                        mail.unregisteredUsers.splice(index, 1);
                        mail.publicKeysArmored.push(key.publicKey);
                    }

                    after();
                });
            });
        }

        // all the recipients have public keys available, so let's re-encrypt the mail
        // to make it available for them, too
        function reencryptAndSend(mail, done) {
            self._emailDao.reEncrypt({
                mail: mail,
                publicKeysArmored: mail.publicKeysArmored
            }, function(err) {
                if (err) {
                    self._outboxBusy = false;
                    callback(err);
                    return;
                }

                // stores the newly encrypted mail object to disk in case something funky
                // happens during sending and we need do re-send the mail later.
                // avoids doing the encryption twice...
                self._devicestorage.storeList([mail], outboxDb, function(err) {
                    if (err) {
                        self._outboxBusy = false;
                        callback(err);
                        return;
                    }

                    send(mail, done);
                });
            });
        }

        // send the encrypted message
        function send(mail, done) {
            self._emailDao.sendEncrypted({
                email: mail
            }, function(err) {
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
            });
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

    /**
     * Sends an invitation mail to an array of users that have no public key available yet
     * @param {Array} recipients Array of objects with information on the sender (name, address)
     * @param {Function} callback Invoked when the mail was sent
     */
    OutboxBO.prototype._invite = function(options, callback) {
        var self = this,
            sender = options.sender;

        var after = _.after(options.recipients.length, callback);

        options.recipients.forEach(function(recipient) {
            checkInvitationStatus(recipient, after);
        });

        // checks the invitation status. if an invitation is pending, we do not need to resend the invitation mail
        function checkInvitationStatus(recipient, done) {
            self._invitationDao.check({
                recipient: recipient.address,
                sender: sender.address
            }, function(err, status) {
                if (err) {
                    callback(err);
                    return;
                }

                if (status === InvitationDAO.INVITE_PENDING) {
                    // the recipient is already invited, we're done here.
                    done();
                    return;
                }

                invite(recipient, done);
            });
        }

        // let's invite the recipient and send him a mail to inform him to join whiteout
        function invite(recipient, done) {
            self._invitationDao.invite({
                recipient: recipient.address,
                sender: sender.address
            }, function(err, status) {
                if (err) {
                    callback(err);
                    return;
                }
                if (status !== InvitationDAO.INVITE_SUCCESS) {
                    callback({
                        errMsg: 'Could not successfully invite ' + recipient
                    });
                    return;
                }

                var invitationMail = {
                    from: [sender],
                    to: [recipient],
                    subject: str.invitationSubject,
                    body: 'Hi,\n\n' + str.invitationMessage + '\n\n'
                };

                // send invitation mail
                self._emailDao.sendPlaintext({
                    email: invitationMail
                }, function(err) {
                    if (err) {
                        if (err.code === 42) {
                            // offline try again later
                            done();
                        } else {
                            callback(err);
                        }
                        return;
                    }

                    // fire sent notification
                    if (typeof self.onSent === 'function') {
                        self.onSent(invitationMail);
                    }

                    done();
                });
            });
        }
    };

    return OutboxBO;
});