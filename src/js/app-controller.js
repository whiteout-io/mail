/**
 * The main application controller
 */
define(function(require) {
    'use strict';

    var Auth = require('js/bo/auth'),
        PGP = require('js/crypto/pgp'),
        PgpMailer = require('pgpmailer'),
        OAuth = require('js/util/oauth'),
        PgpBuilder = require('pgpbuilder'),
        OutboxBO = require('js/bo/outbox'),
        mailreader = require('mailreader'),
        ImapClient = require('imap-client'),
        Crypto = require('js/crypto/crypto'),
        axe = require('axe'),
        RestDAO = require('js/dao/rest-dao'),
        EmailDAO = require('js/dao/email-dao'),
        appConfig = require('js/app-config'),
        config = appConfig.config,
        str = appConfig.string,
        KeychainDAO = require('js/dao/keychain-dao'),
        PublicKeyDAO = require('js/dao/publickey-dao'),
        LawnchairDAO = require('js/dao/lawnchair-dao'),
        PrivateKeyDAO = require('js/dao/privatekey-dao'),
        InvitationDAO = require('js/dao/invitation-dao'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        UpdateHandler = require('js/util/update/update-handler');

    var self = {};

    /**
     * Start the application
     */
    self.start = function(options, callback) {
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

            self.buildModules(options);

            // Handle offline and online gracefully
            window.addEventListener('online', self.onConnect.bind(self, options.onError));
            window.addEventListener('offline', self.onDisconnect.bind(self));

            self._appConfigStore.init('app-config', callback);
        }
    };

    self.buildModules = function(options) {
        var lawnchairDao, restDao, pubkeyDao, privkeyDao, crypto, emailDao, keychain, pgp, userStorage, pgpbuilder, oauth, appConfigStore;

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

            options.onError({
                title: str.updatePublicKeyTitle,
                message: message,
                positiveBtnStr: str.updatePublicKeyPosBtn,
                negativeBtnStr: str.updatePublicKeyNegBtn,
                showNegativeBtn: true,
                callback: callback
            });
        };

        self._appConfigStore = appConfigStore = new DeviceStorageDAO(new LawnchairDAO());
        self._auth = new Auth(appConfigStore, oauth, new RestDAO('/ca'));
        self._userStorage = userStorage = new DeviceStorageDAO(lawnchairDao);
        self._invitationDao = new InvitationDAO(restDao);
        self._pgpbuilder = pgpbuilder = new PgpBuilder();
        self._emailDao = emailDao = new EmailDAO(keychain, pgp, userStorage, pgpbuilder, mailreader);
        self._outboxBo = new OutboxBO(emailDao, keychain, userStorage);
        self._updateHandler = new UpdateHandler(appConfigStore, userStorage);

        emailDao.onError = options.onError;
    };

    self.isOnline = function() {
        return navigator.onLine;
    };

    self.onDisconnect = function() {
        self._emailDao.onDisconnect();
    };

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
            var auth, imapOptions, imapClient, smtpOptions, pgpMailer;

            auth = {
                user: credentials.emailAddress,
                xoauth2: credentials.oauthToken,
                pass: credentials.password // password or oauthToken is undefined
            };

            imapOptions = {
                secure: credentials.imap.secure,
                port: credentials.imap.port,
                host: credentials.imap.host,
                auth: auth,
                ca: credentials.imap.ca
            };

            smtpOptions = {
                secureConnection: credentials.smtp.secure,
                port: credentials.smtp.port,
                host: credentials.smtp.host,
                auth: auth,
                tls: {
                    ca: credentials.smtp.ca
                }
            };

            pgpMailer = new PgpMailer(smtpOptions, self._pgpbuilder);
            imapClient = new ImapClient(imapOptions);
            imapClient.onError = onImapError;

            // after-setup configuration depending on the provider:
            // gmail does not require you to upload to the sent items folder
            // after successful sending, whereas most other providers do
            self._emailDao.ignoreUploadOnSent = !!(config[auth.provider] && config[auth.provider].ignoreUploadOnSent);

            // connect to clients
            self._emailDao.onConnect({
                imapClient: imapClient,
                pgpMailer: pgpMailer
            }, callback);
        }

        function onImapError(error) {
            axe.debug('IMAP error.' + (error.errMsg || error.message) + (error.stack ? ('\n' + error.stack) : ''));
            axe.debug('IMAP reconnecting...');
            // re-init client modules on error
            self.onConnect(function(err) {
                if (err) {
                    axe.error('IMAP reconnect failed! ' + (err.errMsg || err.message) + (err.stack ? ('\n' + err.stack) : ''));
                    return;
                }

                axe.debug('IMAP reconnect attempt complete.');
            });
        }
    };

    self.checkForUpdate = function() {
        if (!window.chrome || !chrome.runtime || !chrome.runtime.onUpdateAvailable) {
            return;
        }

        // check for update and restart
        chrome.runtime.onUpdateAvailable.addListener(function(details) {
            axe.debug("Updating to version " + details.version);
            chrome.runtime.reload();
        });
        chrome.runtime.requestUpdateCheck(function(status) {
            if (status === "update_found") {
                axe.debug("Update pending...");
            } else if (status === "no_update") {
                axe.debug("No update found.");
            } else if (status === "throttled") {
                axe.debug("Checking updates too frequently.");
            }
        });
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

    return self;
});