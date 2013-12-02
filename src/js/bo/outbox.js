define(function(require) {
    'use strict';

    var _ = require('underscore'),
        str = require('js/app-config').string,
        config = require('js/app-config').config,
        InvitationDAO = require('js/dao/invitation-dao'),
        dbType = 'email_OUTBOX';

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

        /**
         * Pending, unsent emails stored in the outbox. Updated on each call to _processOutbox
         * @public */
        this.pendingEmails = [];
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
     * Checks the local device storage for pending mails.
     * @param {Function} callback(error, pendingMailsCount) Callback that informs you about the count of pending mails.
     */
    OutboxBO.prototype._processOutbox = function(callback) {
        var self = this,
            emails;

        // if a _processOutbox call is still in progress when a new timeout kicks 
        // in, since sending mails might take time, ignore it. otherwise, mails
        // could get sent multiple times
        if (self._outboxBusy) {
            return;
        }

        checkStorage();

        function checkStorage() {
            self._outboxBusy = true;

            // get last item from outbox
            self._emailDao.list(function(err, pending) {
                if (err) {
                    self._outboxBusy = false;
                    callback(err);
                    return;
                }

                // update outbox folder count
                emails = pending;

                // keep an independent shallow copy of the pending mails array in the member
                self.pendingEmails = pending.slice();

                // sending pending mails
                processMails();
            });
        }

        // process the next pending mail
        function processMails() {
            if (emails.length === 0) {
                // in the navigation controller, this updates the folder count
                self._outboxBusy = false;
                callback(null, self.pendingEmails.length);
                return;
            }

            // in the navigation controller, this updates the folder count
            callback(null, self.pendingEmails.length);
            var email = emails.shift();
            checkReceivers(email);
        }

        // check whether there are unregistered receivers, i.e. receivers without a public key
        function checkReceivers(email) {
            var unregisteredUsers, receiverChecked;

            unregisteredUsers = [];
            receiverChecked = _.after(email.to.length, function() {
                // invite unregistered users if necessary
                if (unregisteredUsers.length > 0) {
                    invite(unregisteredUsers);
                    return;
                }

                sendEncrypted(email);
            });

            // find out if there are unregistered users
            email.to.forEach(function(recipient) {
                self._keychain.getReceiverPublicKey(recipient.address, function(err, key) {
                    if (err) {
                        self._outboxBusy = false;
                        callback(err);
                        return;
                    }

                    if (!key) {
                        unregisteredUsers.push(recipient);
                    }

                    receiverChecked();
                });
            });
        }

        // invite the unregistered receivers, if necessary
        function invite(addresses) {
            var sender = self._emailDao._account.emailAddress;

            var invitationFinished = _.after(addresses.length, function() {
                // after all of the invitations are checked and sent (if necessary),
                processMails();
            });

            // check which of the adresses has pending invitations
            addresses.forEach(function(recipient) {
                var recipientAddress = recipient.address;

                self._invitationDao.check({
                    recipient: recipientAddress,
                    sender: sender
                }, function(err, status) {
                    if (err) {
                        self._outboxBusy = false;
                        callback(err);
                        return;
                    }

                    if (status === InvitationDAO.INVITE_PENDING) {
                        // the recipient is already invited, we're done here.
                        invitationFinished();
                        return;
                    }

                    // the recipient is not yet invited, so let's do that
                    self._invitationDao.invite({
                        recipient: recipientAddress,
                        sender: sender
                    }, function(err, status) {
                        if (err) {
                            self._outboxBusy = false;
                            callback(err);
                            return;
                        }
                        if (status !== InvitationDAO.INVITE_SUCCESS) {
                            self._outboxBusy = false;
                            callback({
                                errMsg: 'could not successfully invite ' + recipientAddress
                            });
                            return;
                        }

                        sendInvitationMail(recipient, sender);
                    });

                });
            });

            // send an invitation to the unregistered user, aka the recipient
            function sendInvitationMail(recipient, sender) {
                var to = (recipient.name || recipient.address).split('@')[0].split('.')[0].split(' ')[0],
                    invitationMail = {
                        from: [sender],
                        to: [recipient],
                        subject: str.invitationSubject,
                        body: 'Hi ' + to + ',\n\n' + str.invitationMessage + '\n\n\n' + str.signature
                    };

                // send invitation mail
                self._emailDao.send(invitationMail, function(err) {
                    if (err) {
                        self._outboxBusy = false;
                        callback(err);
                        return;
                    }
                    invitationFinished();
                });
            }
        }

        function sendEncrypted(email) {
            removeFromPendingMails(email);
            self._emailDao.encryptedSend(email, function(err) {
                if (err) {
                    self._outboxBusy = false;
                    callback(err);
                    return;
                }

                removeFromStorage(email.id);
            });
        }

        // update the member so that the outbox can visualize
        function removeFromPendingMails(email) {
            var i = self.pendingEmails.indexOf(email);
            self.pendingEmails.splice(i, 1);
        }

        function removeFromStorage(id) {
            if (!id) {
                self._outboxBusy = false;
                callback({
                    errMsg: 'Cannot remove email from storage without a valid id!'
                });
                return;
            }

            // delete email from local storage
            var key = dbType + '_' + id;
            self._devicestorage.removeList(key, function(err) {
                if (err) {
                    self._outboxBusy = false;
                    callback(err);
                    return;
                }

                processMails();
            });
        }
    };

    return OutboxBO;
});