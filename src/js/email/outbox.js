'use strict';

var ngModule = angular.module('woEmail');
ngModule.service('outbox', Outbox);
module.exports = Outbox;

var util = require('crypto-lib').util,
    config = require('../app-config').config,
    outboxDb = 'email_OUTBOX';

/**
 * High level business object that orchestrates the local outbox.
 * The local outbox takes care of the emails before they are being sent.
 * It also checks periodically if there are any mails in the local device storage to be sent.
 */
function Outbox(email, keychain, accountStore) {
    /** @private */
    this._emailDao = email;

    /** @private */
    this._keychain = keychain;

    /** @private */
    this._devicestorage = accountStore;

    /**
     * Semaphore-esque flag to avoid 'concurrent' calls to _processOutbox when the timeout fires, but a call is still in process.
     * @private */
    this._outboxBusy = false;
}

/**
 * This function activates the periodic checking of the local device storage for pending mails.
 * @param {Function} callback(error, pendingMailsCount) Callback that informs you about the count of pending mails.
 */
Outbox.prototype.startChecking = function(callback) {
    // remember global callback
    this._onUpdate = callback;
    // start periodic checking of outbox
    this._intervalId = setInterval(this._processOutbox.bind(this, this._onUpdate), config.checkOutboxInterval);
};

/**
 * Outbox stops the periodic checking of the local device storage for pending mails.
 */
Outbox.prototype.stopChecking = function() {
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
 * @returns {Promise}
 */
Outbox.prototype.put = function(mail) {
    var self = this,
        allReaders = mail.from.concat(mail.to.concat(mail.cc.concat(mail.bcc))); // all the users that should be able to read the mail

    if (mail.to.concat(mail.cc.concat(mail.bcc)).length === 0) {
        return new Promise(function() {
            throw new Error('Message has no recipients!');
        });
    }

    mail.publicKeysArmored = []; // gather the public keys
    mail.uid = mail.id = util.UUID(); // the mail needs a random id & uid for storage in the database

    // do not encrypt mails with a bcc recipient, due to a possible privacy leak
    if (mail.bcc.length > 0) {
        return storeAndForward(mail);
    }

    return checkRecipients(allReaders).then(checkEncrypt);

    // check if there are unregistered recipients
    function checkRecipients(recipients) {
        var pubkeyJobs = [];
        recipients.forEach(function(recipient) {
            var promise = self._keychain.getReceiverPublicKey(recipient.address).then(function(key) {
                // if a public key is available, add the recipient's key to the armored public keys,
                // otherwise remember the recipient as unregistered for later sending
                if (key) {
                    mail.publicKeysArmored.push(key.publicKey);
                }
            });
            pubkeyJobs.push(promise);
        });

        return Promise.all(pubkeyJobs);
    }

    function checkEncrypt() {
        // only encrypt if all recipients have public keys
        if (mail.publicKeysArmored.length < allReaders.length) {
            return storeAndForward(mail);
        }

        // encrypts the body and attachments and persists the mail object
        return self._emailDao.encrypt({
            mail: mail,
            publicKeysArmored: mail.publicKeysArmored
        }).then(function() {
            return storeAndForward(mail);
        });
    }

    function storeAndForward(mail) {
        // store in outbox
        return self._devicestorage.storeList([mail], outboxDb).then(function() {
            // don't wait for next round
            self._processOutbox(self._onUpdate);
        });
    }
};

/**
 * Checks the local device storage for pending mails.
 * @param {Function} callback(error, pendingMailsCount) Callback that informs you about the count of pending mails.
 */
Outbox.prototype._processOutbox = function(callback) {
    var self = this;

    // also, if a _processOutbox call is still in progress, ignore it.
    if (self._outboxBusy) {
        return;
    }

    self._outboxBusy = true;

    // get pending mails from the outbox
    self._devicestorage.listItems(outboxDb).then(function(pendingMails) {
        // if we're not online, don't even bother sending mails.
        if (!self._emailDao._account.online || _.isEmpty(pendingMails)) {
            return;
        }

        var sendJobs = [];
        // send pending mails if possible
        pendingMails.forEach(function(mail) {
            sendJobs.push(send(mail));
        });

        // we're done after all the mails have been handled
        // update the outbox count...
        return Promise.all(sendJobs);

    }).then(function() {
        self._outboxBusy = false;
        callback();

    }).catch(function(err) {
        self._outboxBusy = false;
        callback(err);
    });

    // send the message
    function send(mail) {
        // check is email is to be sent encrypted or as plaintex
        if (mail.encrypted === true) {
            // email was already encrypted before persisting in outbox, tell pgpmailer to send encrypted and not encrypt again
            return self._emailDao.sendEncrypted({
                email: mail
            }).then(onSend).catch(sendFailed);
        } else {
            // send email as plaintext
            return self._emailDao.sendPlaintext({
                email: mail
            }).then(onSend).catch(sendFailed);
        }

        function onSend() {
            // fire sent notification
            if (typeof self.onSent === 'function') {
                self.onSent(mail);
            }

            // removes the mail object from disk after successfully sending it
            return self._devicestorage.removeList(outboxDb + '_' + mail.uid);
        }

        function sendFailed(err) {
            if (err.code === 42) {
                // offline. resolve promise and try again later
                return;
            }
            throw err;
        }
    }
};