/**
 * The main application controller
 */
define(function(require) {
    'use strict';

    var $ = require('jquery'),
        ImapClient = require('imap-client'),
        SmtpClient = require('smtp-client'),
        EmailDAO = require('js/dao/email-dao'),
        KeychainDAO = require('js/dao/keychain-dao'),
        cloudstorage = require('js/dao/cloudstorage-dao'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
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
            self._appConfigStore = new DeviceStorageDAO();
            self._appConfigStore.init('app-config', callback);
        }
    };

    /**
     * Request an OAuth token from chrome for gmail users
     */
    self.fetchOAuthToken = function(passphrase, callback) {
        // get OAuth Token from chrome
        chrome.identity.getAuthToken({
                'interactive': true
            },
            function(token) {
                if (!token) {
                    callback({
                        errMsg: 'Error fetching an OAuth token for the user!'
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
                    self.init(emailAddress, passphrase, token, callback);
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
    self.init = function(userId, passphrase, token, callback) {
        var auth, imapOptions, smtpOptions,
            keychain, imapClient, smtpClient, pgp, userStorage;

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
            auth: auth
        };
        smtpOptions = {
            secure: config.gmail.smtp.secure,
            port: config.gmail.smtp.port,
            host: config.gmail.smtp.host,
            auth: auth
        };

        // init objects and inject dependencies
        keychain = new KeychainDAO(cloudstorage);
        imapClient = new ImapClient(imapOptions);
        smtpClient = new SmtpClient(smtpOptions);
        pgp = new PGP();
        userStorage = new DeviceStorageDAO();
        self._emailDao = new EmailDAO(keychain, imapClient, smtpClient, pgp, userStorage);

        // init email dao
        var account = {
            emailAddress: userId,
            asymKeySize: config.asymKeySize
        };
        self._emailDao.init(account, passphrase, callback);
    };

    return self;
});