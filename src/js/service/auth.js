'use strict';

var ngModule = angular.module('woServices');
ngModule.service('auth', Auth);
module.exports = Auth;

var axe = require('axe-logger'),
    cfg = require('../app-config').config,
    str = require('../app-config').string;

var APP_CONFIG_DB_NAME = 'app-config';
var EMAIL_ADDR_DB_KEY = 'emailaddress';
var USERNAME_DB_KEY = 'username';
var REALNAME_DB_KEY = 'realname';
var PASSWD_DB_KEY = 'password';
var IMAP_DB_KEY = 'imap';
var SMTP_DB_KEY = 'smtp';

/**
 * The Auth BO handles the rough edges and gaps between user/password authentication
 * and OAuth via Chrome Identity API.
 * Typical usage:
 * var auth = new Auth(...);
 * auth.setCredentials(...); // during the account setup
 * auth.getEmailAddress(...); // called from the login controller to determine if there is already a user present on the device
 * auth.getCredentials(...); // called to gather all the information to connect to IMAP/SMTP,
 *                              username, password / oauth token, IMAP/SMTP server host names, ...
 */
function Auth(appConfigStore, oauth, pgp) {
    this._appConfigStore = appConfigStore;
    this._oauth = oauth;
    this._pgp = pgp;

    this._initialized = false;
}

/**
 * Initialize the service
 */
Auth.prototype.init = function() {
    var self = this;
    return self._appConfigStore.init(APP_CONFIG_DB_NAME).then(function() {
        self._initialized = true;
    });
};

/**
 * Check if the service has been initialized.
 */
Auth.prototype.isInitialized = function() {
    return this._initialized;
};

/**
 * Retrieves credentials and IMAP/SMTP settings:
 * 1) Fetches the credentials from disk, then...
 * 2 a) ... in an oauth setting, retrieves a fresh oauth token from the Chrome Identity API.
 * 2 b) ... in a user/passwd setting, does not need to do additional work.
 * 3) Loads the intermediate certs from the configuration.
 */
Auth.prototype.getCredentials = function() {
    var self = this;

    if (!self.emailAddress) {
        // we're not yet initialized, so let's load our stuff from disk
        return self._loadCredentials().then(chooseLogin);
    }

    return chooseLogin();

    function chooseLogin() {
        if (self.useOAuth(self.imap.host) && !self.password) {
            // oauth login
            return self.getOAuthToken().then(done);
        }

        if (self.passwordNeedsDecryption) {
            // decrypt password
            return self._pgp.decrypt(self.password, undefined).then(function(pt) {
                if (!pt.signaturesValid) {
                    throw new Error('Verifying PGP signature of encrypted password failed!');
                }

                self.passwordNeedsDecryption = false;
                self.password = pt.decrypted;
            }).then(done);
        }

        return done();
    }

    function done() {
        return new Promise(function(resolve) {
            var credentials = {
                imap: {
                    secure: self.imap.secure,
                    requireTLS: self.imap.requireTLS,
                    ignoreTLS: self.imap.ignoreTLS,
                    port: self.imap.port,
                    host: self.imap.host,
                    ca: self.imap.ca,
                    auth: {
                        user: self.username,
                        xoauth2: self.oauthToken, // password or oauthToken is undefined
                        pass: self.password
                    }
                },
                smtp: {
                    secure: self.smtp.secure,
                    requireTLS: self.smtp.requireTLS,
                    ignoreTLS: self.smtp.ignoreTLS,
                    port: self.smtp.port,
                    host: self.smtp.host,
                    ca: self.smtp.ca,
                    auth: {
                        user: self.username,
                        xoauth2: self.oauthToken,
                        pass: self.password // password or oauthToken is undefined
                    }
                }
            };
            resolve(credentials);
        });
    }
};

/**
 * Set the credentials
 *
 * @param {String} options.emailAddress The email address
 * @param {String} options.username The user name
 * @param {String} options.realname The user's real name
 * @param {String} options.password The password, only in user/passwd setting
 * @param {String} options.smtp The smtp settings (host, port, secure)
 * @param {String} options.imap The imap settings (host, port, secure)
 */
Auth.prototype.setCredentials = function(options) {
    this.credentialsDirty = true;
    this.emailAddress = options.emailAddress;
    this.username = options.username;
    this.realname = options.realname ? options.realname : '';
    this.password = options.password;
    this.smtp = options.smtp; // host, port, secure, ca
    this.imap = options.imap; // host, port, secure, ca
};

Auth.prototype.storeCredentials = function() {
    var self = this;

    if (!self.credentialsDirty) {
        // nothing to store if credentials not dirty
        return new Promise(function(resolve) {
            resolve();
        });
    }

    // persist the config
    var storeSmtp = self._appConfigStore.storeList([self.smtp], SMTP_DB_KEY);
    var storeImap = self._appConfigStore.storeList([self.imap], IMAP_DB_KEY);
    var storeEmailAddress = self._appConfigStore.storeList([self.emailAddress], EMAIL_ADDR_DB_KEY);
    var storeUsername = self._appConfigStore.storeList([self.username], USERNAME_DB_KEY);
    var storeRealname = self._appConfigStore.storeList([self.realname], REALNAME_DB_KEY);
    var storePassword = new Promise(function(resolve) {
        if (!self.password) {
            resolve();
            return;
        }

        if (self.passwordNeedsDecryption) {
            // password is not decrypted yet, so no need to re-encrypt it before storing...
            return self._appConfigStore.storeList([self.password], PASSWD_DB_KEY).then(resolve);
        }
        return self._pgp.encrypt(self.password, undefined).then(function(ciphertext) {
            return self._appConfigStore.storeList([ciphertext], PASSWD_DB_KEY).then(resolve);
        });
    });

    return Promise.all([
        storeSmtp,
        storeImap,
        storeEmailAddress,
        storeUsername,
        storeRealname,
        storePassword
    ]).then(function() {
        self.credentialsDirty = false;
    });
};

/**
 * Returns the email address. Loads it from disk, if necessary
 */
Auth.prototype.getEmailAddress = function() {
    var self = this;

    if (self.emailAddress) {
        return new Promise(function(resolve) {
            resolve({
                emailAddress: self.emailAddress,
                realname: self.realname
            });
        });
    }

    return self._loadCredentials().then(function() {
        return {
            emailAddress: self.emailAddress,
            realname: self.realname
        };
    });
};

/**
 * Check if the current platform and mail provider support OAuth.
 * @param  {String} hostname    The hostname of the mail server e.g. imap.gmail.com
 * @return {Boolean}            If oauth should be used
 */
Auth.prototype.useOAuth = function(hostname) {
    if (!this._oauth.isSupported()) {
        return false;
    }

    var regex = cfg.oauthDomains;
    for (var i = 0; i < regex.length; i++) {
        if (regex[i].test(hostname)) {
            return true;
        }
    }

    return false;
};

/**
 * READ FIRST b/c usage of the oauth api is weird.
 * the chrome identity api will let you query an oauth token for an email account without knowing
 * the corresponding email address. also, android has multiple accounts whereas desktop chrome only
 * has one user logged in.
 * 1) try to read the email address from the configuration (see above)
 * 2) fetch the oauth token. if we already HAVE an email address at this point, we can spare
 *    popping up the account picker on android! if not, the account picker will pop up. this
 *    is android only, since the desktop chrome will query the user that is logged into chrome
 * 3) fetch the email address for the oauth token from the chrome identity api
 */
Auth.prototype.getOAuthToken = function() {
    var self = this;

    // get a fresh oauth token
    return self._oauth.getOAuthToken(self.emailAddress).then(onToken);

    function onToken(oauthToken) {
        // shortcut if the email address is already known
        if (self.emailAddress) {
            self.oauthToken = oauthToken;
            return;
        }

        // query the email address
        return self._oauth.queryEmailAddress(oauthToken).then(function(emailAddress) {
            self.oauthToken = oauthToken;
            self.emailAddress = emailAddress;
        });
    }
};

/**
 * Loads email address, password, ... from disk and sets them on `this`
 */
Auth.prototype._loadCredentials = function() {
    var self = this;

    if (self.initialized) {
        return new Promise(function(resolve) {
            resolve();
        });
    }

    return loadFromDB(SMTP_DB_KEY).then(function(smtp) {
        self.smtp = smtp;
        return loadFromDB(IMAP_DB_KEY);

    }).then(function(imap) {
        self.imap = imap;
        return loadFromDB(USERNAME_DB_KEY);

    }).then(function(username) {
        self.username = username;
        return loadFromDB(REALNAME_DB_KEY);

    }).then(function(realname) {
        self.realname = realname;
        return loadFromDB(EMAIL_ADDR_DB_KEY);

    }).then(function(emailAddress) {
        self.emailAddress = emailAddress;
        return loadFromDB(PASSWD_DB_KEY);

    }).then(function(password) {
        self.password = password;
        self.passwordNeedsDecryption = !!password;
        self.initialized = true;
    });

    function loadFromDB(key) {
        return self._appConfigStore.listItems(key).then(function(cachedItems) {
            return cachedItems && cachedItems[0];
        });
    }
};

/**
 * Handles certificate updates and errors by notifying the user.
 * @param  {String}   component      Either imap or smtp
 * @param  {Function} callback       The error handler
 * @param  {[type]}   pemEncodedCert The PEM encoded SSL certificate
 */
Auth.prototype.handleCertificateUpdate = function(component, reconnectCallback, callback, pemEncodedCert) {
    var self = this;

    axe.debug('new ssl certificate received: ' + pemEncodedCert);

    if (!self[component].ca) {
        // no previous ssl cert, trust on first use
        self[component].ca = pemEncodedCert;
        self.credentialsDirty = true;
        self.storeCredentials().then(callback).catch(callback);
        return;
    }

    if (self[component].ca === pemEncodedCert) {
        // ignore multiple successive tls handshakes, e.g. for gmail
        return;
    }

    // previous ssl cert known, does not match: query user and certificate
    callback({
        title: str.updateCertificateTitle,
        message: str.updateCertificateMessage.replace('{0}', self[component].host),
        positiveBtnStr: str.updateCertificatePosBtn,
        negativeBtnStr: str.updateCertificateNegBtn,
        showNegativeBtn: true,
        faqLink: str.certificateFaqLink,
        callback: function(granted) {
            if (!granted) {
                return;
            }

            self[component].ca = pemEncodedCert;
            self.credentialsDirty = true;
            self.storeCredentials().then(function() {
                reconnectCallback(callback);
            }).catch(callback);
        }
    });
};

/**
 * Logout of the app by clearing the app config store and in memory credentials
 */
Auth.prototype.logout = function() {
    var self = this;

    // clear app config db
    return self._appConfigStore.clear().then(function() {
        // clear in memory cache
        self.setCredentials({});
        self.initialized = undefined;
        self.credentialsDirty = undefined;
        self.passwordNeedsDecryption = undefined;
    });
};