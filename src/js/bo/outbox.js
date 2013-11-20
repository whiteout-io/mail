define(function(require) {
    'use strict';

    var _ = require('underscore'),
        str = require('js/app-config').string,
        config = require('js/app-config').config,
        InvitationDAO = require('js/dao/invitation-dao'),
        dbType = 'email_OUTBOX';

    var OutboxBO = function(emailDao, invitationDao) {
        this._emailDao = emailDao;
        this._invitationDao = invitationDao;
        this._outboxBusy = false;
    };

    OutboxBO.prototype.startChecking = function(callback) {
        // start periodic checking of outbox
        this._intervalId = setInterval(this._processOutbox.bind(this, callback), config.checkOutboxInterval);
    };

    OutboxBO.prototype.stopChecking = function() {
        if (!this._intervalId) {
            return;
        }

        clearInterval(this._intervalId);
        delete this._intervalId;
    };

    OutboxBO.prototype._processOutbox = function(callback) {
        var self = this,
            emails;

        if (self._outboxBusy) {
            return;
        }

        checkStorage();

        function checkStorage() {
            self._outboxBusy = true;

            // get last item from outbox
            self._emailDao._devicestorage.listItems(dbType, 0, null, function(err, pending) {
                if (err) {
                    self._outboxBusy = false;
                    callback(err);
                    return;
                }

                // update outbox folder count
                emails = pending;

                // sending pending mails
                processMails();
            });
        }

        function processMails() {
            // in the navigation controller, this updates the folder count

            if (emails.length === 0) {
                self._outboxBusy = false;
                callback(null, 0);
                return;
            }

            callback(null, emails.length);
            var email = emails.shift();
            checkReceivers(email);
        }

        function checkReceivers(email) {
            var unregisteredUsers, receiverChecked;

            unregisteredUsers = [];
            receiverChecked = _.after(email.to.length, function() {
                if (unregisteredUsers.length > 0) {
                    invite(unregisteredUsers);
                    return;
                }

                sendEncrypted(email);
            });

            email.to.forEach(function(recipient) {
                self._emailDao._keychain.getReceiverPublicKey(recipient.address, function(err, key) {
                    if (err) {
                        // stop processing
                    }

                    if (!key) {
                        unregisteredUsers.push(recipient);
                    }

                    receiverChecked();
                });
            });
        }

        function invite(addresses) {
            var sender = self._emailDao._account.emailAddress;

            var invitationFinished = _.after(addresses.length, function() {
                // after all of the invitations are checked and sent (if necessary),
                // 
                processMails();
            });

            // send invite
            addresses.forEach(function(recipient) {
                var recipientAddress = recipient.address;
                self._invitationDao.check({
                    recipient: recipientAddress,
                    sender: sender
                }, function(err, status) {
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
                            console.error(err.errMsg);
                            return;
                        }
                        if (status !== InvitationDAO.INVITE_SUCCESS) {
                            console.error('could not successfully invite ' + recipientAddress);
                            return;
                        }

                        sendInvitationMail(recipient, sender);
                    });

                });
            });

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
                        console.error(err.errMsg);
                    }
                    invitationFinished();
                });
            }
        }


        function sendEncrypted(email) {
            self._emailDao.encryptedSend(email, function(err) {
                if (err) {
                    self._outboxBusy = false;
                    callback(err);
                    return;
                }

                removeFromStorage(email.id);
            });
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
            self._emailDao._devicestorage.removeList(key, function(err) {
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