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
        RestDAO = require('js/dao/rest-dao'),
        EmailDAO = require('js/dao/email-dao'),
        config = require('js/app-config').config,
        KeychainDAO = require('js/dao/keychain-dao'),
        PublicKeyDAO = require('js/dao/publickey-dao'),
        LawnchairDAO = require('js/dao/lawnchair-dao'),
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
            console.log('Assuming Cordova environment...');
            document.addEventListener("deviceready", onDeviceReady, false);
        } else {
            // No need to wait on events... just start the app
            console.log('Assuming Browser environment...');
            onDeviceReady();
        }

        function onDeviceReady() {
            console.log('Starting app.');

            self.buildModules(options);

            // Handle offline and online gracefully
            window.addEventListener('online', self.onConnect.bind(self, options.onError));
            window.addEventListener('offline', self.onDisconnect.bind(self));

            self._appConfigStore.init('app-config', callback);
        }
    };

    self.buildModules = function(options) {
        var lawnchairDao, restDao, pubkeyDao, emailDao, keychain, pgp, userStorage, pgpbuilder, oauth, appConfigStore;

        // start the mailreader's worker thread
        mailreader.startWorker(config.workerPath + '/../lib/mailreader-parser-worker.js');

        // init objects and inject dependencies
        restDao = new RestDAO();
        lawnchairDao = new LawnchairDAO();
        pubkeyDao = new PublicKeyDAO(restDao);
        oauth = new OAuth(new RestDAO('https://www.googleapis.com'));

        self._appConfigStore = appConfigStore = new DeviceStorageDAO(new LawnchairDAO());
        self._auth = new Auth(appConfigStore, oauth, new RestDAO('/ca'));
        self._userStorage = userStorage = new DeviceStorageDAO(lawnchairDao);
        self._invitationDao = new InvitationDAO(restDao);
        self._keychain = keychain = new KeychainDAO(lawnchairDao, pubkeyDao);
        self._crypto = pgp = new PGP();
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

        // fetch pinned local ssl certificate
        self._auth.getCredentials({}, function(err, credentials) {
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
                xoauth2: credentials.oauthToken
            };
            imapOptions = {
                secure: config.gmail.imap.secure,
                port: config.gmail.imap.port,
                host: config.gmail.imap.host,
                auth: auth,
                ca: [credentials.sslCert]
            };
            smtpOptions = {
                secureConnection: config.gmail.smtp.secure,
                port: config.gmail.smtp.port,
                host: config.gmail.smtp.host,
                auth: auth,
                tls: {
                    ca: [credentials.sslCert]
                },
                onError: console.error
            };

            pgpMailer = new PgpMailer(smtpOptions, self._pgpbuilder);
            imapClient = new ImapClient(imapOptions);
            imapClient.onError = onImapError;

            // connect to clients
            self._emailDao.onConnect({
                imapClient: imapClient,
                pgpMailer: pgpMailer
            }, callback);
        }

        function onImapError(err) {
            console.log('IMAP error.', err);
            console.log('IMAP reconnecting...');
            // re-init client modules on error
            self.onConnect(function(err) {
                if (err) {
                    console.error('IMAP reconnect failed!', err);
                    return;
                }

                console.log('IMAP reconnect attempt complete.');
            });
        }
    };

    self.checkForUpdate = function() {
        if (!window.chrome || !chrome.runtime || !chrome.runtime.onUpdateAvailable) {
            return;
        }

        // check for update and restart
        chrome.runtime.onUpdateAvailable.addListener(function(details) {
            console.log("Updating to version " + details.version);
            chrome.runtime.reload();
        });
        chrome.runtime.requestUpdateCheck(function(status) {
            if (status === "update_found") {
                console.log("Update pending...");
            } else if (status === "no_update") {
                console.log("No update found.");
            } else if (status === "throttled") {
                console.log("Checking updates too frequently.");
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