/**
 * The main application controller
 */

'use strict';

var axe = require('axe-logger'),
    Auth = require('./bo/auth'),
    PGP = require('./crypto/pgp'),
    OAuth = require('./util/oauth'),
    PgpMailer = require('pgpmailer'),
    util = require('crypto-lib').util,
    PgpBuilder = require('pgpbuilder'),
    OutboxBO = require('./bo/outbox'),
    mailreader = require('mailreader'),
    ImapClient = require('imap-client'),
    Crypto = require('./crypto/crypto'),
    RestDAO = require('./dao/rest-dao'),
    appConfig = require('./app-config'),
    EmailDAO = require('./dao/email-dao'),
    AdminDao = require('./dao/admin-dao'),
    KeychainDAO = require('./dao/keychain-dao'),
    PublicKeyDAO = require('./dao/publickey-dao'),
    LawnchairDAO = require('./dao/lawnchair-dao'),
    PrivateKeyDAO = require('./dao/privatekey-dao'),
    InvitationDAO = require('./dao/invitation-dao'),
    DeviceStorageDAO = require('./dao/devicestorage-dao'),
    ConnectionDoctor = require('./util/connection-doctor'),
    UpdateHandler = require('./util/update/update-handler'),
    config = appConfig.config,
    str = appConfig.string;

var ctrl = {};

/**
 * Start the application.
 */
ctrl.start = function(options, callback) {
    if (ctrl.started) {
        return callback();
    }

    ctrl.started = true;
    ctrl.onError = options.onError; // TODO: replace by errorService

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

        // TODO: will be replaced by angular dependency management
        ctrl.buildModules();

        // TODO: move self-contained connection management in emailDao
        // Handle offline and online gracefully
        window.addEventListener('online', ctrl.onConnect.bind(ctrl, ctrl.onError));
        window.addEventListener('offline', ctrl.onDisconnect.bind(ctrl));

        // TODO: move appConfigService shared singleton
        ctrl._appConfigStore.init('app-config', callback);
    }
};

// TODO: will be replaced by angular dependency management

/**
 * Initialize the dependency tree.
 */
ctrl.buildModules = function() {
    var lawnchairDao, restDao, pubkeyDao, privkeyDao, crypto, emailDao, keychain, pgp, userStorage, pgpbuilder, oauth, appConfigStore, auth;

    // start the mailreader's worker thread
    mailreader.startWorker(config.workerPath + '/mailreader-parser-worker.min.js');

    // init objects and inject dependencies
    restDao = new RestDAO();
    lawnchairDao = new LawnchairDAO();
    pubkeyDao = new PublicKeyDAO(restDao);
    privkeyDao = new PrivateKeyDAO(new RestDAO(config.privkeyServerUrl));
    oauth = new OAuth(new RestDAO('https://www.googleapis.com'));

    crypto = new Crypto();
    ctrl._pgp = pgp = new PGP();
    ctrl._keychain = keychain = new KeychainDAO(lawnchairDao, pubkeyDao, privkeyDao, crypto, pgp);
    keychain.requestPermissionForKeyUpdate = function(params, callback) {
        var message = params.newKey ? str.updatePublicKeyMsgNewKey : str.updatePublicKeyMsgRemovedKey;
        message = message.replace('{0}', params.userId);

        ctrl.onError({
            title: str.updatePublicKeyTitle,
            message: message,
            positiveBtnStr: str.updatePublicKeyPosBtn,
            negativeBtnStr: str.updatePublicKeyNegBtn,
            showNegativeBtn: true,
            callback: callback
        });
    };

    ctrl._appConfigStore = appConfigStore = new DeviceStorageDAO(new LawnchairDAO());
    ctrl._auth = auth = new Auth(appConfigStore, oauth, pgp);
    ctrl._userStorage = userStorage = new DeviceStorageDAO(lawnchairDao);
    ctrl._invitationDao = new InvitationDAO(restDao);
    ctrl._pgpbuilder = pgpbuilder = new PgpBuilder();
    ctrl._emailDao = emailDao = new EmailDAO(keychain, pgp, userStorage, pgpbuilder, mailreader);
    ctrl._outboxBo = new OutboxBO(emailDao, keychain, userStorage);
    ctrl._updateHandler = new UpdateHandler(appConfigStore, userStorage, auth);
    ctrl._adminDao = new AdminDao(new RestDAO(config.adminUrl));
    ctrl._doctor = new ConnectionDoctor();

    emailDao.onError = ctrl.onError;
};

/**
 * Calls runtime hooks to check if an app update is available.
 */
ctrl.checkForUpdate = function() {
    ctrl._updateHandler.checkForUpdate(ctrl.onError);
};

// TODO: move to AccountService

/**
 * Fire up the database, retrieve the available keys for the user and initialize the email data access object
 */
ctrl.init = function(options, callback) {
    // account information for the email dao
    var account = {
        realname: options.realname,
        emailAddress: options.emailAddress,
        asymKeySize: config.asymKeySize
    };

    // Pre-Flight check: don't even start to initialize stuff if the email address is not valid
    if (!util.validateEmailAddress(options.emailAddress)) {
        return callback(new Error('The user email address is invalid!'));
    }

    prepareDatabase();

    // Pre-Flight check: initialize and prepare user's local database
    function prepareDatabase() {
        ctrl._userStorage.init(options.emailAddress, function(err) {
            if (err) {
                return callback(err);
            }

            // Migrate the databases if necessary
            ctrl._updateHandler.update(function(err) {
                if (err) {
                    return callback(new Error('Updating the internal database failed. Please reinstall the app! Reason: ' + err.message));
                }

                prepareKeys();
            });
        });
    }

    // retrieve keypair fom devicestorage/cloud, refresh public key if signup was incomplete before
    function prepareKeys() {
        ctrl._keychain.getUserKeyPair(options.emailAddress, function(err, keys) {
            if (err) {
                return callback(err);
            }

            // this is either a first start on a new device, OR a subsequent start without completing the signup,
            // since we can't differenciate those cases here, do a public key refresh because it might be outdated
            if (keys && keys.publicKey && !keys.privateKey) {
                ctrl._keychain.refreshKeyForUserId({
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
        ctrl._emailDao.init({
            account: account
        }, function(err) {
            if (err) {
                return callback(err);
            }

            callback(null, keys);
        });
    }
};

/**
 * Check if the user agent is online.
 */
ctrl.isOnline = function() {
    return navigator.onLine;
};

// TODO: move to AccountService

/**
 * Event handler that is called when the user agent goes offline.
 */
ctrl.onDisconnect = function() {
    ctrl._emailDao.onDisconnect();
};

// TODO: move to AccountService

/**
 * Log the current user out by clear the app config store and deleting instances of imap-client and pgp-mailer.
 */
ctrl.logout = function() {
    // clear app config store
    ctrl._auth.logout(function(err) {
        if (err) {
            ctrl.onError(err);
            return;
        }

        // delete instance of imap-client and pgp-mailer
        ctrl._emailDao.onDisconnect(function(err) {
            if (err) {
                ctrl.onError(err);
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

// TODO: move onConnect to emailDao

/**
 * Event that is called when the user agent goes online. This create new instances of the imap-client and pgp-mailer and connects to the mail server.
 */
ctrl.onConnect = function(callback) {
    if (!ctrl.isOnline() || !ctrl._emailDao || !ctrl._emailDao._account) {
        // prevent connection infinite loop
        callback();
        return;
    }

    ctrl._auth.getCredentials(function(err, credentials) {
        if (err) {
            callback(err);
            return;
        }

        initClients(credentials);
    });

    function initClients(credentials) {
        // add the maximum update batch size for imap folders to the imap configuration
        credentials.imap.maxUpdateSize = config.imapUpdateBatchSize;

        // tls socket worker path for multithreaded tls in non-native tls environments
        credentials.imap.tlsWorkerPath = credentials.smtp.tlsWorkerPath = config.workerPath + '/tcp-socket-tls-worker.min.js';

        var pgpMailer = new PgpMailer(credentials.smtp, ctrl._pgpbuilder);
        var imapClient = new ImapClient(credentials.imap);
        imapClient.onError = onConnectionError;
        pgpMailer.onError = onConnectionError;

        // certificate update handling
        imapClient.onCert = ctrl._auth.handleCertificateUpdate.bind(ctrl._auth, 'imap', ctrl.onConnect, ctrl.onError);
        pgpMailer.onCert = ctrl._auth.handleCertificateUpdate.bind(ctrl._auth, 'smtp', ctrl.onConnect, ctrl.onError);

        // connect to clients
        ctrl._emailDao.onConnect({
            imapClient: imapClient,
            pgpMailer: pgpMailer,
            ignoreUploadOnSent: ctrl._emailDao.checkIgnoreUploadOnSent(credentials.imap.host)
        }, callback);
    }

    function onConnectionError(error) {
        axe.debug('Connection error. Attempting reconnect in ' + config.reconnectInterval + ' ms. Error: ' + (error.errMsg || error.message) + (error.stack ? ('\n' + error.stack) : ''));

        setTimeout(function() {
            axe.debug('Reconnecting...');
            // re-init client modules on error
            ctrl.onConnect(function(err) {
                if (err) {
                    axe.error('Reconnect attempt failed! ' + (err.errMsg || err.message) + (err.stack ? ('\n' + err.stack) : ''));
                    return;
                }

                axe.debug('Reconnect attempt complete.');
            });
        }, config.reconnectInterval);
    }
};

module.exports = ctrl;