define(function(require) {
    'use strict';

    var config = require('js/app-config').config,
        dbType = 'email_OUTBOX';

    var OutboxBO = function(emailDao, invitationDao) {
        this._emailDao = emailDao;
        this._invitationDao = invitationDao;
        this._outboxBusy = false;
    };

    OutboxBO.prototype.startChecking = function(callback) {
        // start periodic checking of outbox
        this._intervalId = setInterval(this._emptyOutbox.bind(this, callback), config.checkOutboxInterval);
    };

    OutboxBO.prototype.stopChecking = function() {
        if (!this._intervalId) {
            return;
        }

        clearInterval(this._intervalId);
        delete this._intervalId;
    };

    OutboxBO.prototype._emptyOutbox = function(callback) {
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
                send();
            });
        }

        function send() {
            callback(null, emails.length);

            if (emails.length === 0) {
                self._outboxBusy = false;
                return;
            }

            var email = emails.shift();
            self._emailDao.smtpSend(email, function(err) {
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

                send();
            });
        }
    };

    return OutboxBO;
});