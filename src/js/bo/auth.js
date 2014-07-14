define(function(require) {
    'use strict';

    var config = require('js/app-config').config;

    var EMAIL_ADDR_DB_KEY = 'emailaddress';
    var PASSWD_DB_KEY = 'password';
    var PROVIDER_DB_KEY = 'provider';

    /**
     * The Auth BO handles the rough edges and gaps between user/password authentication
     * and OAuth via Chrome Identity API.
     * Typical usage:
     * var auth = new Auth(...);
     * auth.setCredentials(...); // during the account setup
     * auth.getEmailAddress(...); // called from the login controller to determine if there is already a user present on the device
     * auth.getCredentials(...); // called to gather all the information to connect to IMAP/SMTP, e.g. pinned intermediate certificates,
     *                              username, password / oauth token, IMAP/SMTP server host names, ...
     */
    var Auth = function(appConfigStore, oauth, ca, pgp) {
        this._appConfigStore = appConfigStore;
        this._oauth = oauth;
        this._ca = ca;
        this._pgp = pgp;
    };

    /**
     * Retrieves credentials and IMAP/SMTP settings:
     * 1) Fetches the credentials from disk, then...
     * 2 a) ... in an oauth setting, retrieves a fresh oauth token from the Chrome Identity API.
     * 2 b) ... in a user/passwd setting, does not need to do additional work.
     * 3) Loads the intermediate certs from the configuration.
     *
     * @param {Function} callback(err, credentials)
     */
    Auth.prototype.getCredentials = function(callback) {
        var self = this;

        if (!self.provider || !self.emailAddress) {
            // we're not yet initialized, so let's load our stuff from disk
            self._loadCredentials(function(err) {
                if (err) {
                    return callback(err);
                }

                chooseLogin();
            });
            return;
        }

        chooseLogin();

        function chooseLogin() {
            if (self.provider === 'gmail' && !self.password) {
                // oauth login for gmail
                self._getOAuthToken(function(err) {
                    if (err) {
                        return callback(err);
                    }

                    setPinnedCerts();
                });
                return;
            }

            // override settings with gmail certs
            if ((self.emailAddress.match(/@gmail.|@googlemail./))) {
                self.provider = 'gmail';
            }

            if (self.passwordNeedsDecryption) {
                // decrypt password
                self._pgp.decrypt(self.password, undefined, function(err, cleartext) {
                    if (err) {
                        return callback(err);
                    }

                    self.passwordNeedsDecryption = false;
                    self.password = cleartext;

                    setPinnedCerts();
                });
                return;
            }

            setPinnedCerts();
        }

        // recover the intermediate certs from the configuration
        function setPinnedCerts() {
            var serverConfig = config[self.provider];

            if (!serverConfig) {
                // custom domain
                return callback(new Error('Custom mail providers are not yet supported!'));
            }

            self._getCertificate(serverConfig.imap.sslCert, function(err, imapCertificate) {
                if (err) {
                    return callback(err);
                }

                self._getCertificate(serverConfig.smtp.sslCert, function(err, smtpCertificate) {
                    if (err) {
                        return callback(err);
                    }

                    var credentials = {
                        emailAddress: self.emailAddress,
                        oauthToken: self.oauthToken,
                        password: self.password,
                        imap: serverConfig.imap,
                        smtp: serverConfig.smtp
                    };

                    // set pinned cert
                    credentials.imap.ca = [imapCertificate];
                    credentials.smtp.ca = [smtpCertificate];

                    callback(null, credentials);
                });
            });
        }
    };

    /**
     * Set the credentials:
     * In a GMail OAuth use case, this would only be options.provider, then this method will go and fetch the email
     * address from the Chrome Identity API. In a user/password use case, this would only be options.provider,
     * options.emailAddress, and options.password.
     *
     * @param {String} options.provider The service provider, e.g. 'gmail', 'yahoo', 'tonline'. Matches the entry in the app-config.
     * @param {String} options.emailAddress The email address, only in user/passwd setting
     * @param {String} options.password The password, only in user/passwd setting
     * @param {Function} callback(err, email) Invoked with the email address, or information in case of an error
     */
    Auth.prototype.setCredentials = function(options, callback) {
        var self = this;

        self.credentialsDirty = true;
        self.emailAddress = options.emailAddress;
        self.password = options.password;
        self.provider = options.provider;

        if (self.provider === 'gmail') {
            // in case of gmail oauth login, we don't need to encrypt the password and can store the data right away
            self._getOAuthToken(function(err) {
                if (err) {
                    return callback(err);
                }

                self.storeCredentials(callback);
            });
            return;
        }

        callback();
    };

    Auth.prototype.storeCredentials = function(callback) {
        var self = this;

        if (!self.credentialsDirty) {
            return callback();
        }

        // persist the provider
        self._appConfigStore.storeList([self.provider], PROVIDER_DB_KEY, function(err) {
            if (err) {
                return callback(err);
            }

            self._appConfigStore.storeList([self.emailAddress], EMAIL_ADDR_DB_KEY, function(err) {
                if (err) {
                    return callback(err);
                }

                if (!self.password) {
                    self.credentialsDirty = false;
                    return callback();
                }

                self._pgp.encrypt(self.password, undefined, function(err, ciphertext) {
                    if (err) {
                        return callback(err);
                    }

                    self._appConfigStore.storeList([ciphertext], PASSWD_DB_KEY, function(err) {
                        if (err) {
                            return callback(err);
                        }

                        self.credentialsDirty = false;
                        callback();
                    });
                });
            });
        });
    };

    /**
     * Returns the email address. Loads it from disk, if necessary
     */
    Auth.prototype.getEmailAddress = function(callback) {
        var self = this;

        if (self.emailAddress) {
            return callback(null, self.emailAddress);
        }

        self._loadCredentials(function(err) {
            if (err) {
                return callback(err);
            }

            callback(null, self.emailAddress);
        });
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
    Auth.prototype._getOAuthToken = function(callback) {
        var self = this;

        // get a fresh oauth token
        self._oauth.getOAuthToken(self.emailAddress, function(err, oauthToken) {
            if (err) {
                return callback(err);
            }

            // shortcut if the email address is already known
            if (self.emailAddress) {
                self.oauthToken = oauthToken;
                return callback();
            }

            // query the email address
            self._oauth.queryEmailAddress(oauthToken, function(err, emailAddress) {
                if (err) {
                    return callback(err);
                }

                self.oauthToken = oauthToken;
                self.emailAddress = emailAddress;
                callback();
            });
        });
    };

    /**
     * Get the pinned ssl certificate for the corresponding mail server.
     */
    Auth.prototype._getCertificate = function(filename, callback) {
        this._ca.get({
            uri: '/' + filename,
            type: 'text'
        }, function(err, cert) {
            if (err || !cert) {
                callback({
                    errMsg: 'Could not fetch pinned certificate!'
                });
                return;
            }

            callback(null, cert);
        });
    };

    /**
     * Loads email address, password, and provider from disk and sets them on `this`
     */
    Auth.prototype._loadCredentials = function(callback) {
        var self = this;

        loadFromDB(EMAIL_ADDR_DB_KEY, function(err, emailAddress) {
            if (err) {
                return callback(err);
            }

            loadFromDB(PASSWD_DB_KEY, function(err, password) {
                if (err) {
                    return callback(err);
                }

                loadFromDB(PROVIDER_DB_KEY, function(err, provider) {
                    if (err) {
                        return callback(err);
                    }

                    self.emailAddress = emailAddress;
                    self.password = password;
                    self.passwordNeedsDecryption = !!password;
                    self.provider = provider;
                    callback();
                });
            });
        });

        function loadFromDB(key, callback) {
            self._appConfigStore.listItems(key, 0, null, function(err, cachedItems) {
                callback(err, (!err && cachedItems && cachedItems[0]));
            });
        }
    };

    return Auth;
});