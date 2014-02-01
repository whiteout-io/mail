/**
 * The main application controller
 */
define(function(require) {
    'use strict';

    var $ = require('jquery'),
        ImapClient = require('imap-client'),
        SmtpClient = require('smtp-client'),
        EmailDAO = require('js/dao/email-dao'),
        RestDAO = require('js/dao/rest-dao'),
        PublicKeyDAO = require('js/dao/publickey-dao'),
        LawnchairDAO = require('js/dao/lawnchair-dao'),
        KeychainDAO = require('js/dao/keychain-dao'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        InvitationDAO = require('js/dao/invitation-dao'),
        OutboxBO = require('js/bo/outbox'),
        PGP = require('js/crypto/pgp'),
        config = require('js/app-config').config;

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

            // Handle offline and online gracefully
            window.addEventListener('online', self.onConnect.bind(self, options.onError));
            window.addEventListener('offline', self.onDisconnect.bind(self, options.onError));

            // init app config storage
            self._appConfigStore = new DeviceStorageDAO(new LawnchairDAO());
            self._appConfigStore.init('app-config', callback);
        }
    };

    self.onDisconnect = function(callback) {
        if (!self._emailDao) {
            // the following code only makes sense if the email dao has been initialized
            return;
        }

        self._emailDao.onDisconnect(null, callback);
    };

    self.onConnect = function(callback) {
        if (!self._emailDao) {
            // the following code only makes sense if the email dao has been initialized
            return;
        }

        if (!self.isOnline()) {
            // prevent connection infinite loop
            console.log('Not connecting since user agent is offline.');
            callback();
            return;
        }

        // fetch pinned local ssl certificate
        self.getCertficate(function(err, certificate) {
            if (err) {
                callback(err);
                return;
            }

            // get a fresh oauth token
            self.fetchOAuthToken(function(err, oauth) {
                if (err) {
                    callback(err);
                    return;
                }

                initClients(oauth, certificate);
            });
        });

        function initClients(oauth, certificate) {
            var auth, imapOptions, imapClient, smtpOptions, smtpClient;

            auth = {
                XOAuth2: {
                    user: oauth.emailAddress,
                    clientId: config.gmail.clientId,
                    accessToken: oauth.token
                }
            };
            imapOptions = {
                secure: config.gmail.imap.secure,
                port: config.gmail.imap.port,
                host: config.gmail.imap.host,
                auth: auth,
                ca: [certificate]
            };
            smtpOptions = {
                secure: config.gmail.smtp.secure,
                port: config.gmail.smtp.port,
                host: config.gmail.smtp.host,
                auth: auth,
                ca: [certificate]
            };

            imapClient = new ImapClient(imapOptions);
            smtpClient = new SmtpClient(smtpOptions);

            imapClient.onError = function(err) {
                console.log('IMAP error.', err);
                console.log('IMAP reconnecting...');
                // re-init client modules on error
                self.onConnect(function(err) {
                    if (err) {
                        console.error('IMAP reconnect failed!', err);
                        return;
                    }

                    console.log('IMAP reconnect successful.');
                });
            };

            // connect to clients
            self._emailDao.onConnect({
                imapClient: imapClient,
                smtpClient: smtpClient
            }, callback);
        }
    };

    self.getCertficate = function(localCallback) {
        var xhr;

        if (self.certificate) {
            localCallback(null, self.certificate);
            return;
        }

        // fetch pinned local ssl certificate
        xhr = new XMLHttpRequest();
        xhr.open('GET', '/ca/Google_Internet_Authority_G2.pem');
        xhr.onload = function() {
            if (xhr.readyState === 4 && xhr.status === 200 && xhr.responseText) {
                self.certificate = xhr.responseText;
                localCallback(null, self.certificate);
            } else {
                localCallback({
                    errMsg: 'Could not fetch pinned certificate!'
                });
            }
        };
        xhr.onerror = function() {
            localCallback({
                errMsg: 'Could not fetch pinned certificate!'
            });
        };
        xhr.send();
    };

    self.isOnline = function() {
        return navigator.onLine;
    };

    self.checkForUpdate = function() {
        if (!chrome || !chrome.runtime || !chrome.runtime.onUpdateAvailable) {
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
     * Gracefully try to fetch the user's email address from local storage.
     * If not yet stored, handle online/offline cases on first use.
     */
    self.getEmailAddress = function(callback) {
        // try to fetch email address from local storage
        self.getEmailAddressFromConfig(function(err, cachedEmailAddress) {
            if (err) {
                callback(err);
                return;
            }

            if (!cachedEmailAddress && !self.isOnline()) {
                // first time login... must be online
                callback({
                    errMsg: 'The app must be online on first use!'
                });
                return;
            }

            callback(null, cachedEmailAddress);
        });
    };

    /**
     * Get the user's email address from local storage
     */
    self.getEmailAddressFromConfig = function(callback) {
        self._appConfigStore.listItems('emailaddress', 0, null, function(err, cachedItems) {
            if (err) {
                callback(err);
                return;
            }

            // no email address is cached yet
            if (!cachedItems || cachedItems.length < 1) {
                callback();
                return;
            }

            callback(null, cachedItems[0]);
        });
    };

    /**
     * Lookup the user's email address. Check local cache if available
     * otherwise query google's token info api to learn the user's email address
     */
    self.queryEmailAddress = function(token, callback) {
        var itemKey = 'emailaddress';

        self.getEmailAddressFromConfig(function(err, cachedEmailAddress) {
            if (err) {
                callback(err);
                return;
            }

            // do roundtrip to google api if no email address is cached yet
            if (!cachedEmailAddress) {
                queryGoogleApi();
                return;
            }

            callback(null, cachedEmailAddress);
        });

        function queryGoogleApi() {
            if (!token) {
                callback({
                    errMsg: 'Invalid OAuth token!'
                });
                return;
            }

            // fetch gmail user's email address from the Google Authorization Server endpoint
            $.ajax({
                url: 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + token,
                type: 'GET',
                dataType: 'json',
                success: function(info) {
                    if (!info || !info.email) {
                        callback({
                            errMsg: 'Error looking up email address on google api!'
                        });
                        return;
                    }

                    // cache the email address on the device
                    self._appConfigStore.storeList([info.email], itemKey, function(err) {
                        callback(err, info.email);
                    });
                },
                error: function(xhr, textStatus, err) {
                    callback({
                        errMsg: xhr.status + ': ' + xhr.statusText,
                        err: err
                    });
                }
            });
        }
    };

    /**
     * Request an OAuth token from chrome for gmail users
     */
    self.fetchOAuthToken = function(callback) {
        // get OAuth Token from chrome
        chrome.identity.getAuthToken({
                'interactive': true
            },
            function(token) {
                if ((chrome && chrome.runtime && chrome.runtime.lastError) || !token) {
                    callback({
                        errMsg: 'Error fetching an OAuth token for the user!',
                        err: chrome.runtime.lastError
                    });
                    return;
                }

                // get email address for the token
                self.queryEmailAddress(token, function(err, emailAddress) {
                    if (err || !emailAddress) {
                        callback({
                            errMsg: 'Error looking up email address on login!',
                            err: err
                        });
                        return;
                    }

                    // init the email dao
                    callback(null, {
                        emailAddress: emailAddress,
                        token: token
                    });
                });
            }
        );
    };

    self.buildModules = function() {
        var lawnchairDao, restDao, pubkeyDao, invitationDao,
            emailDao, keychain, pgp, userStorage;

        // init objects and inject dependencies
        restDao = new RestDAO();
        pubkeyDao = new PublicKeyDAO(restDao);
        invitationDao = new InvitationDAO(restDao);
        lawnchairDao = new LawnchairDAO();
        userStorage = new DeviceStorageDAO(lawnchairDao);

        keychain = new KeychainDAO(lawnchairDao, pubkeyDao);
        self._keychain = keychain;
        pgp = new PGP();
        self._crypto = pgp;
        self._emailDao = emailDao = new EmailDAO(keychain, pgp, userStorage);
        self._outboxBo = new OutboxBO(emailDao, keychain, userStorage, invitationDao);
    };

    /**
     * Instanciate the mail email data access object and its dependencies. Login to imap on init.
     */
    self.init = function(options, callback) {
        self.buildModules();

        // init email dao
        var account = {
            emailAddress: options.emailAddress,
            asymKeySize: config.asymKeySize
        };

        self._emailDao.init({
            account: account
        }, function(err, keypair) {
            if (err) {
                callback(err);
                return;
            }

            // connect tcp clients on first startup
            self.onConnect(function(err) {
                if (err) {
                    callback(err);
                    return;
                }

                // init outbox
                self._outboxBo.init();

                callback(null, keypair);
            });
        });
    };

    return self;
});