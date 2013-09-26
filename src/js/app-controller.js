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
        Crypto = require('js/crypto/crypto'),
        config = require('js/app-config').config;
    require('cordova');

    var self = {};

    /**
     * Start the application by loading the view templates
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
            callback();
        }
    };

    self.fetchOAuthToken = function(password, callback) {
        // get OAuth Token from chrome
        chrome.identity.getAuthToken({
                'interactive': true
            },
            function(token) {
                // fetch gmail user's email address from the Google Authorization Server endpoint
                $.ajax({
                    url: 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + token,
                    type: 'GET',
                    dataType: 'json',
                    success: function(info) {
                        // login using the received email address
                        self.login(info.email, password, token, function(err) {
                            // send email address to sandbox
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
        );
    };

    self.login = function(userId, password, token, callback) {
        var auth, imapOptions, smtpOptions,
            keychain, imapClient, smtpClient, crypto, deviceStorage;

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
        crypto = new Crypto();
        deviceStorage = new DeviceStorageDAO();
        self._emailDao = new EmailDAO(keychain, imapClient, smtpClient, crypto, deviceStorage);

        // init email dao
        var account = {
            emailAddress: userId,
            symKeySize: config.symKeySize,
            symIvSize: config.symIvSize,
            asymKeySize: config.asymKeySize
        };
        self._emailDao.init(account, password, callback);
    };

    return self;
});