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
    require('cordova');

    var self = {};

    /**
     * Start the application
     */
    self.start = function(callback) {
        // are we running in native app or in browser?
        if (document.URL.indexOf("http") === 0 || document.URL.indexOf("app") === 0 || document.URL.indexOf("chrome") === 0) {
            console.log('Assuming Browser environment...');
            onDeviceReady();
        } else {
            console.log('Assuming Cordova environment...');
            document.addEventListener("deviceready", onDeviceReady, false);
        }

        function onDeviceReady() {
            console.log('Starting app.');
            // init app config storage
            self._appConfigStore = new DeviceStorageDAO(new LawnchairDAO());
            self._appConfigStore.init('app-config', callback);
        }
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

    /**
     * Lookup the user's email address. Check local cache if available, otherwise query google's token info api to learn the user's email address
     */
    self.queryEmailAddress = function(token, callback) {
        var itemKey = 'emailaddress';

        self._appConfigStore.listItems(itemKey, 0, null, function(err, cachedItems) {
            if (err) {
                callback(err);
                return;
            }

            // do roundtrip to google api if no email address is cached yet
            if (!cachedItems || cachedItems.length < 1) {
                queryGoogleApi();
                return;
            }

            callback(null, cachedItems[0]);
        });

        function queryGoogleApi() {
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
     * Instanciate the mail email data access object and its dependencies. Login to imap on init.
     */
    self.init = function(userId, token, callback) {
        var auth, imapOptions, smtpOptions, certificate,
            lawnchairDao, restDao, pubkeyDao, invitationDao,
            keychain, imapClient, smtpClient, pgp, userStorage, xhr;

        // fetch pinned local ssl certificate
        xhr = new XMLHttpRequest();
        xhr.open('GET', '/ca/Google_Internet_Authority_G2.pem');
        xhr.onload = function() {
            if (xhr.readyState === 4 && xhr.status === 200 && xhr.responseText) {
                certificate = xhr.responseText;
                setupDaos();
            } else {
                callback({
                    errMsg: 'Could not fetch pinned certificate!'
                });
            }
        };
        xhr.onerror = function() {
            callback({
                errMsg: 'Could not fetch pinned certificate!'
            });
        };
        xhr.send();

        function setupDaos() {
            // create mail credentials objects for imap/smtp
            auth = {
                XOAuth2: {
                    user: userId,
                    clientId: config.gmail.clientId,
                    accessToken: token
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

            // init objects and inject dependencies
            restDao = new RestDAO();
            pubkeyDao = new PublicKeyDAO(restDao);
            lawnchairDao = new LawnchairDAO();
            keychain = new KeychainDAO(lawnchairDao, pubkeyDao);
            imapClient = new ImapClient(imapOptions);
            smtpClient = new SmtpClient(smtpOptions);
            pgp = new PGP();
            userStorage = new DeviceStorageDAO(lawnchairDao);
            self._emailDao = new EmailDAO(keychain, imapClient, smtpClient, pgp, userStorage);

            invitationDao = new InvitationDAO(restDao);
            self._outboxBo = new OutboxBO(self._emailDao, invitationDao);

            // init email dao
            var account = {
                emailAddress: userId,
                asymKeySize: config.asymKeySize
            };

            self._emailDao.init(account, callback);
        }
    };

    return self;
});