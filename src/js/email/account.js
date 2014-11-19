'use strict';

var ngModule = angular.module('woServices');
ngModule.service('account', Account);
module.exports = Account;

var axe = require('axe-logger'),
    util = require('crypto-lib').util,
    PgpMailer = require('pgpmailer'),
    ImapClient = require('imap-client');

function Account(appConfig, auth, admin, mailConfig, keychain, pgpbuilder, email, outbox, deviceStorage, updateHandler) {
    this._appConfig = appConfig;
    this._auth = auth;
    this._admin = admin;
    this._mailConfig = mailConfig;
    this._keychain = keychain;
    this._emailDao = email;
    this._pgpbuilder = pgpbuilder;
    this._outbox = outbox;
    this._deviceStorage = deviceStorage;
    this._updateHandler = updateHandler;
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
Account.prototype.init = function(options, callback) {
    var self = this;

    // account information for the email dao
    var account = {
        realname: options.realname,
        emailAddress: options.emailAddress,
        asymKeySize: this._appConfig.asymKeySize
    };

    // Pre-Flight check: don't even start to initialize stuff if the email address is not valid
    if (!util.validateEmailAddress(options.emailAddress)) {
        return callback(new Error('The user email address is invalid!'));
    }

    prepareDatabase();

    // Pre-Flight check: initialize and prepare user's local database
    function prepareDatabase() {
        self._deviceStorage.init(options.emailAddress, function(err) {
            if (err) {
                return callback(err);
            }

            // Migrate the databases if necessary
            self._updateHandler.update(function(err) {
                if (err) {
                    return callback(new Error('Updating the internal database failed. Please reinstall the app! Reason: ' + err.message));
                }

                prepareKeys();
            });
        });
    }

    // retrieve keypair fom devicestorage/cloud, refresh public key if signup was incomplete before
    function prepareKeys() {
        self._keychain.getUserKeyPair(options.emailAddress, function(err, keys) {
            if (err) {
                return callback(err);
            }

            // this is either a first start on a new device, OR a subsequent start without completing the signup,
            // since we can't differenciate those cases here, do a public key refresh because it might be outdated
            if (keys && keys.publicKey && !keys.privateKey) {
                self._keychain.refreshKeyForUserId({
                    userId: options.emailAddress,
                    overridePermission: true
                }, function(err, publicKey) {
                    if (err) {
                        return callback(err);
                    }

                    initEmailDao({
                        publicKey: publicKey
                    });
                });
                return;
            }

            // either signup was complete or no pubkey is available, so we're good here.
            initEmailDao(keys);
        });
    }

    function initEmailDao(keys) {
        self._emailDao.init({
            account: account
        }, function(err) {
            if (err) {
                return callback(err);
            }

            // Handle offline and online gracefully ... arm dom event
            window.addEventListener('online', self.onConnect.bind(self));
            window.addEventListener('offline', self.onDisconnect.bind(self));

            // add account object to the accounts array for the ng controllers
            self._accounts.push(account);

            callback(null, keys);
        });
    }
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

    if (!self.isOnline() || !self._emailDao || !self._emailDao._account) {
        // prevent connection infinite loop
        callback();
        return;
    }

    self._auth.getCredentials(function(err, credentials) {
        if (err) {
            self._dialog.error(err);
            return;
        }

        initClients(credentials);
    });

    function initClients(credentials) {
        // add the maximum update batch size for imap folders to the imap configuration
        credentials.imap.maxUpdateSize = config.imapUpdateBatchSize;

        // tls socket worker path for multithreaded tls in non-native tls environments
        credentials.imap.tlsWorkerPath = credentials.smtp.tlsWorkerPath = config.workerPath + '/tcp-socket-tls-worker.min.js';

        var pgpMailer = new PgpMailer(credentials.smtp, self._pgpbuilder);
        var imapClient = new ImapClient(credentials.imap);
        imapClient.onError = onConnectionError;
        pgpMailer.onError = onConnectionError;

        // certificate update handling
        imapClient.onCert = self._auth.handleCertificateUpdate.bind(self._auth, 'imap', self.onConnect, self._dialog.error);
        pgpMailer.onCert = self._auth.handleCertificateUpdate.bind(self._auth, 'smtp', self.onConnect, self._dialog.error);

        // connect to clients
        self._emailDao.onConnect({
            imapClient: imapClient,
            pgpMailer: pgpMailer,
            ignoreUploadOnSent: self._emailDao.checkIgnoreUploadOnSent(credentials.imap.host)
        }, self._dialog.error);
    }

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
    this._emailDao.onDisconnect();
};

/**
 * Logout of an email account. Log the current user out by clear the app config store and deleting instances of imap-client and pgp-mailer.
 */
Account.prototype.logout = function() {
    var self = this;

    // clear app config store
    self._auth.logout(function(err) {
        if (err) {
            self._dialog.error(err);
            return;
        }

        // delete instance of imap-client and pgp-mailer
        self._emailDao.onDisconnect(function(err) {
            if (err) {
                self._dialog.error(err);
                return;
            }

            if (typeof window.chrome !== 'undefined' && chrome.runtime && chrome.runtime.reload) {
                // reload chrome app
                chrome.runtime.reload();
            } else {
                // navigate to login
                window.location.href = '/';
            }
        });
    });
};

/**
 * Create a new whiteout account. This creates a new email data access object instance for that account and logs in via IMAP.
 * @param  {String} options.emailAddress	The account's email address
 */
Account.prototype.create = function() {};