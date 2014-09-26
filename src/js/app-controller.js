/**
 * The main application controller
 */
define(function(require) {
    'use strict';

    var axe = require('axe'),
        Auth = require('js/bo/auth'),
        PGP = require('js/crypto/pgp'),
        PgpMailer = require('pgpmailer'),
        OAuth = require('js/util/oauth'),
        PgpBuilder = require('pgpbuilder'),
        OutboxBO = require('js/bo/outbox'),
        mailreader = require('mailreader'),
        ImapClient = require('imap-client'),
        Crypto = require('js/crypto/crypto'),
        RestDAO = require('js/dao/rest-dao'),
        appConfig = require('js/app-config'),
        EmailDAO = require('js/dao/email-dao'),
        AdminDao = require('js/dao/admin-dao'),
        KeychainDAO = require('js/dao/keychain-dao'),
        PublicKeyDAO = require('js/dao/publickey-dao'),
        LawnchairDAO = require('js/dao/lawnchair-dao'),
        PrivateKeyDAO = require('js/dao/privatekey-dao'),
        InvitationDAO = require('js/dao/invitation-dao'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        ConnectionDoctor = require('js/util/connection-doctor'),
        UpdateHandler = require('js/util/update/update-handler'),
        config = appConfig.config,
        str = appConfig.string;

    var self = {};

    /**
     * Start the application.
     */
    self.start = function(options, callback) {
        if (self.started) {
            return callback();
        }

        self.started = true;
        self.onError = options.onError;

        // are we running in a cordova app or in a browser environment?
        if (window.cordova) {
            // wait for 'deviceready' event to make sure plugins are loaded
            axe.debug('Assuming Cordova environment...');
            document.addEventListener("deviceready", onDeviceReady, false);
        } else {
            // No need to wait on events... just start the app
            axe.debug('Assuming Browser environment...');
            onDeviceReady();
        }

        function onDeviceReady() {
            axe.debug('Starting app.');

            self.buildModules();

            // Handle offline and online gracefully
            window.addEventListener('online', self.onConnect.bind(self, self.onError));
            window.addEventListener('offline', self.onDisconnect.bind(self));

            self._appConfigStore.init('app-config', callback);
        }
    };

    /**
     * Initialize the dependency tree.
     */
    self.buildModules = function() {
        var lawnchairDao, restDao, pubkeyDao, privkeyDao, crypto, emailDao, keychain, pgp, userStorage, pgpbuilder, oauth, appConfigStore, auth;

        // start the mailreader's worker thread
        mailreader.startWorker(config.workerPath + '/../lib/mailreader-parser-worker.js');

        // init objects and inject dependencies
        restDao = new RestDAO();
        lawnchairDao = new LawnchairDAO();
        pubkeyDao = new PublicKeyDAO(restDao);
        privkeyDao = new PrivateKeyDAO(new RestDAO(config.privkeyServerUrl));
        oauth = new OAuth(new RestDAO('https://www.googleapis.com'));

        crypto = new Crypto();
        self._pgp = pgp = new PGP();
        self._keychain = keychain = new KeychainDAO(lawnchairDao, pubkeyDao, privkeyDao, crypto, pgp);
        keychain.requestPermissionForKeyUpdate = function(params, callback) {
            var message = params.newKey ? str.updatePublicKeyMsgNewKey : str.updatePublicKeyMsgRemovedKey;
            message = message.replace('{0}', params.userId);

            self.onError({
                title: str.updatePublicKeyTitle,
                message: message,
                positiveBtnStr: str.updatePublicKeyPosBtn,
                negativeBtnStr: str.updatePublicKeyNegBtn,
                showNegativeBtn: true,
                callback: callback
            });
        };

        self._appConfigStore = appConfigStore = new DeviceStorageDAO(new LawnchairDAO());
        self._auth = auth = new Auth(appConfigStore, oauth, pgp);
        self._userStorage = userStorage = new DeviceStorageDAO(lawnchairDao);
        self._invitationDao = new InvitationDAO(restDao);
        self._pgpbuilder = pgpbuilder = new PgpBuilder();
        self._emailDao = emailDao = new EmailDAO(keychain, pgp, userStorage, pgpbuilder, mailreader);
        self._outboxBo = new OutboxBO(emailDao, keychain, userStorage);
        self._updateHandler = new UpdateHandler(appConfigStore, userStorage, auth);
        self._adminDao = new AdminDao(new RestDAO(config.adminUrl));
        self._doctor = new ConnectionDoctor();

        emailDao.onError = self.onError;
    };

    /**
     * Calls runtime hooks to check if an app update is available.
     */
    self.checkForUpdate = function() {
        self._updateHandler.checkForUpdate(self.onError);
    };

    /**
     * Instanciate the mail email data access object and its dependencies. Login to imap on init.
     */
    self.init = function(options, callback) {
        // init user's local database
        self._userStorage.init(options.emailAddress, function(err) {
            if (err) {
                callback(err);
                return;
            }

            // Migrate the databases if necessary
            self._updateHandler.update(onUpdate);
        });

        function onUpdate(err) {
            if (err) {
                callback({
                    errMsg: 'Update failed, please reinstall the app.',
                    err: err
                });
                return;
            }

            // account information for the email dao
            var account = {
                realname: options.realname,
                emailAddress: options.emailAddress,
                asymKeySize: config.asymKeySize
            };

            // init email dao
            self._emailDao.init({
                account: account
            }, function(err, keypair) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, keypair);
            });
        }
    };

    /**
     * Check if the user agent is online.
     */
    self.isOnline = function() {
        return navigator.onLine;
    };

    /**
     * Event handler that is called when the user agent goes offline.
     */
    self.onDisconnect = function() {
        self._emailDao.onDisconnect();
    };

    /**
     * Log the current user out by clear the app config store and deleting instances of imap-client and pgp-mailer.
     */
    self.logout = function() {
        var self = this;

        // clear app config store
        self._auth.logout(function(err) {
            if (err) {
                self.onError(err);
                return;
            }

            // delete instance of imap-client and pgp-mailer
            self._emailDao.onDisconnect(function(err) {
                if (err) {
                    self.onError(err);
                    return;
                }

                // navigate to login
                window.location.href = '/';
            });
        });
    };

    /**
     * Event that is called when the user agent goes online. This create new instances of the imap-client and pgp-mailer and connects to the mail server.
     */
    self.onConnect = function(callback) {
        if (!self.isOnline() || !self._emailDao || !self._emailDao._account) {
            // prevent connection infinite loop
            callback();
            return;
        }

        self._auth.getCredentials(function(err, credentials) {
            if (err) {
                callback(err);
                return;
            }

            initClients(credentials);
        });

        function initClients(credentials) {
            var pgpMailer = new PgpMailer(credentials.smtp, self._pgpbuilder);
            var imapClient = new ImapClient(credentials.imap);
            imapClient.onError = onConnectionError;
            pgpMailer.onError = onConnectionError;

            // certificate update handling
            imapClient.onCert = self._auth.handleCertificateUpdate.bind(self._auth, 'imap', self.onConnect, self.onError);
            pgpMailer.onCert = self._auth.handleCertificateUpdate.bind(self._auth, 'smtp', self.onConnect, self.onError);

            // after-setup configuration depending on the provider:
            // gmail does not require you to upload to the sent items folder
            // after successful sending, whereas most other providers do
            self._emailDao.ignoreUploadOnSent = !!(config[self._auth.provider] && config[self._auth.provider].ignoreUploadOnSent);

            // connect to clients
            self._emailDao.onConnect({
                imapClient: imapClient,
                pgpMailer: pgpMailer
            }, callback);
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

    return self;
});