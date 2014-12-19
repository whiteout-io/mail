'use strict';

var ngModule = angular.module('woEmail');
ngModule.service('account', Account);
module.exports = Account;

var axe = require('axe-logger'),
    util = require('crypto-lib').util,
    PgpMailer = require('pgpmailer'),
    ImapClient = require('imap-client');

function Account(appConfig, auth, accountStore, email, outbox, keychain, updateHandler, pgpbuilder, dialog) {
    this._appConfig = appConfig;
    this._auth = auth;
    this._accountStore = accountStore;
    this._emailDao = email;
    this._outbox = outbox;
    this._keychain = keychain;
    this._updateHandler = updateHandler;
    this._pgpbuilder = pgpbuilder;
    this._dialog = dialog;
    this._accounts = []; // init accounts list
}

/**
 * Check if the account is already logged in.
 * @return {Boolean} if the account is logged in
 */
Account.prototype.isLoggedIn = function() {
    return (this._accounts.length > 0);
};

/**
 * Lists all of the current accounts connected to the app
 * @return {Array<Object>} The account objects containing folder and message objects
 */
Account.prototype.list = function() {
    return this._accounts;
};

/**
 * Fire up the database, retrieve the available keys for the user and initialize the email data access object
 */
Account.prototype.init = function(options) {
    var self = this;

    // account information for the email dao
    var account = {
        realname: options.realname,
        emailAddress: options.emailAddress,
        asymKeySize: this._appConfig.config.asymKeySize
    };

    // Pre-Flight check: don't even start to initialize stuff if the email address is not valid
    if (!util.validateEmailAddress(options.emailAddress)) {
        return new Promise(function() {
            throw new Error('The user email address is invalid!');
        });
    }

    // Pre-Flight check: initialize and prepare user's local database
    return self._accountStore.init(options.emailAddress).then(function() {
        // Migrate the databases if necessary
        return self._updateHandler.update().catch(function(err) {
            throw new Error('Updating the internal database failed. Please reinstall the app! Reason: ' + err.message);
        });

    }).then(function() {
        // retrieve keypair fom devicestorage/cloud, refresh public key if signup was incomplete before
        return self._keychain.getUserKeyPair(options.emailAddress);

    }).then(function(keys) {
        // this is either a first start on a new device, OR a subsequent start without completing the signup,
        // since we can't differenciate those cases here, do a public key refresh because it might be outdated
        if (keys && keys.publicKey && !keys.privateKey) {
            return self._keychain.refreshKeyForUserId({
                userId: options.emailAddress,
                overridePermission: true
            }).then(function(publicKey) {
                return {
                    publicKey: publicKey
                };
            });
        }
        // either signup was complete or no pubkey is available, so we're good here.
        return keys;

    }).then(function(keys) {
        // init the email data access object
        return self._emailDao.init({
            account: account
        }).then(function() {
            // Handle offline and online gracefully ... arm dom event
            window.addEventListener('online', self.onConnect.bind(self));
            window.addEventListener('offline', self.onDisconnect.bind(self));

            // add account object to the accounts array for the ng controllers
            self._accounts.push(account);

            return keys;
        });
    });
};

/**
 * Check if the user agent is online.
 */
Account.prototype.isOnline = function() {
    return navigator.onLine;
};

/**
 * Event that is called when the user agent goes online. This create new instances of the imap-client and pgp-mailer and connects to the mail server.
 */
Account.prototype.onConnect = function(callback) {
    var self = this;
    var config = self._appConfig.config;

    callback = callback || self._dialog.error;

    if (!self.isOnline() || !self._emailDao || !self._emailDao._account) {
        // prevent connection infinite loop
        return;
    }

    // init imap/smtp clients
    self._auth.getCredentials().then(function(credentials) {
        // add the maximum update batch size for imap folders to the imap configuration
        credentials.imap.maxUpdateSize = config.imapUpdateBatchSize;

        // tls socket worker path for multithreaded tls in non-native tls environments
        credentials.imap.tlsWorkerPath = credentials.smtp.tlsWorkerPath = config.workerPath + '/tcp-socket-tls-worker.min.js';

        var pgpMailer = new PgpMailer(credentials.smtp, self._pgpbuilder);
        var imapClient = new ImapClient(credentials.imap);
        imapClient.onError = onConnectionError;
        pgpMailer.onError = onConnectionError;

        // certificate update handling
        imapClient.onCert = self._auth.handleCertificateUpdate.bind(self._auth, 'imap', self.onConnect.bind(self), self._dialog.error);
        pgpMailer.onCert = self._auth.handleCertificateUpdate.bind(self._auth, 'smtp', self.onConnect.bind(self), self._dialog.error);

        // connect to clients
        return self._emailDao.onConnect({
            imapClient: imapClient,
            pgpMailer: pgpMailer,
            ignoreUploadOnSent: self._emailDao.checkIgnoreUploadOnSent(credentials.imap.host)
        });
    }).then(callback).catch(callback);

    function onConnectionError(error) {
        axe.debug('Connection error. Attempting reconnect in ' + config.reconnectInterval + ' ms. Error: ' + (error.errMsg || error.message) + (error.stack ? ('\n' + error.stack) : ''));

        setTimeout(function() {
            axe.debug('Reconnecting...');
            // re-init client modules on error
            self.onConnect(function(err) {
                if (err) {
                    axe.error('Reconnect attempt failed! ' + (err.errMsg || err.message) + (err.stack ? ('\n' + err.stack) : ''));
                    return;
                }

                axe.debug('Reconnect attempt complete.');
            });
        }, config.reconnectInterval);
    }
};

/**
 * Event handler that is called when the user agent goes offline.
 */
Account.prototype.onDisconnect = function() {
    return this._emailDao.onDisconnect();
};

/**
 * Logout of an email account. Log the current user out by clear the app config store and deleting instances of imap-client and pgp-mailer.
 */
Account.prototype.logout = function() {
    var self = this;
    // clear app config store
    return self._auth.logout().then(function() {
        // delete instance of imap-client and pgp-mailer
        return self._emailDao.onDisconnect();

    }).then(function() {
        if (typeof window.chrome !== 'undefined' && chrome.runtime && chrome.runtime.reload) {
            // reload chrome app
            chrome.runtime.reload();
        } else {
            // navigate to login
            window.location.href = '/';
        }
    });
};