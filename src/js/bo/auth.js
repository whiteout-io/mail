define(function(require) {
    'use strict';

    var axe = require('axe'),
        str = require('js/app-config').string;

    var EMAIL_ADDR_DB_KEY = 'emailaddress';
    var USERNAME_DB_KEY = 'username';
    var REALNAME_DB_KEY = 'realname';
    var PASSWD_DB_KEY = 'password';
    var PROVIDER_DB_KEY = 'provider';
    var IMAP_DB_KEY = 'imap';
    var SMTP_DB_KEY = 'smtp';

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
    var Auth = function(appConfigStore, oauth, pgp) {
        this._appConfigStore = appConfigStore;
        this._oauth = oauth;
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
                self.getOAuthToken(function(err) {
                    if (err) {
                        return callback(err);
                    }

                    done();
                });
                return;
            }

            if (self.passwordNeedsDecryption) {
                // decrypt password
                self._pgp.decrypt(self.password, undefined, function(err, cleartext) {
                    if (err) {
                        return callback(err);
                    }

                    self.passwordNeedsDecryption = false;
                    self.password = cleartext;

                    done();
                });
                return;
            }

            done();
        }

        function done() {
            var credentials = {
                imap: {
                    secure: self.imap.secure,
                    port: self.imap.port,
                    host: self.imap.host,
                    ca: self.imap.ca,
                    pinned: self.imap.pinned,
                    auth: {
                        user: self.username,
                        xoauth2: self.oauthToken, // password or oauthToken is undefined
                        pass: self.password
                    }
                },
                smtp: {
                    secure: self.smtp.secure,
                    port: self.smtp.port,
                    host: self.smtp.host,
                    ca: self.smtp.ca,
                    pinned: self.smtp.pinned,
                    auth: {
                        user: self.username,
                        xoauth2: self.oauthToken,
                        pass: self.password // password or oauthToken is undefined
                    }
                }
            };

            callback(null, credentials);
        }
    };

    /**
     * Set the credentials
     *
     * @param {String} options.provider The service provider, e.g. 'gmail', 'yahoo', 'tonline'. Matches the entry in the app-config.
     * @param {String} options.emailAddress The email address
     * @param {String} options.username The user name
     * @param {String} options.realname The user's real name
     * @param {String} options.password The password, only in user/passwd setting
     * @param {String} options.smtp The smtp settings (host, port, secure)
     * @param {String} options.imap The imap settings (host, port, secure)
     */
    Auth.prototype.setCredentials = function(options) {
        this.credentialsDirty = true;
        this.provider = options.provider;
        this.emailAddress = options.emailAddress;
        this.username = options.username;
        this.realname = options.realname ? options.realname : '';
        this.password = options.password;
        this.smtp = options.smtp; // host, port, secure, ca, pinned
        this.imap = options.imap; // host, port, secure, ca, pinned
    };

    Auth.prototype.storeCredentials = function(callback) {
        var self = this;

        if (!self.credentialsDirty) {
            return callback();
        }

        // persist the provider
        self._appConfigStore.storeList([self.smtp], SMTP_DB_KEY, function(err) {
            if (err) {
                return callback(err);
            }

            self._appConfigStore.storeList([self.imap], IMAP_DB_KEY, function(err) {
                if (err) {
                    return callback(err);
                }

                self._appConfigStore.storeList([self.provider], PROVIDER_DB_KEY, function(err) {
                    if (err) {
                        return callback(err);
                    }

                    self._appConfigStore.storeList([self.emailAddress], EMAIL_ADDR_DB_KEY, function(err) {
                        if (err) {
                            return callback(err);
                        }

                        self._appConfigStore.storeList([self.username], USERNAME_DB_KEY, function(err) {
                            if (err) {
                                return callback(err);
                            }

                            self._appConfigStore.storeList([self.realname], REALNAME_DB_KEY, function(err) {
                                if (err) {
                                    return callback(err);
                                }

                                if (!self.password) {
                                    self.credentialsDirty = false;
                                    return callback();
                                }

                                if (self.passwordNeedsDecryption) {
                                    // password is not decrypted yet, so no need to re-encrypt it before storing...
                                    self._appConfigStore.storeList([self.password], PASSWD_DB_KEY, function(err) {
                                        if (err) {
                                            return callback(err);
                                        }

                                        self.credentialsDirty = false;
                                        callback();
                                    });
                                    return;
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
            return callback(null, {
                emailAddress: self.emailAddress,
                realname: self.realname
            });
        }

        self._loadCredentials(function(err) {
            if (err) {
                return callback(err);
            }

            callback(null, {
                emailAddress: self.emailAddress,
                realname: self.realname
            });
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
    Auth.prototype.getOAuthToken = function(callback) {
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
     * Loads email address, password, provider, ... from disk and sets them on `this`
     */
    Auth.prototype._loadCredentials = function(callback) {
        var self = this;

        if (self.initialized) {
            callback();
        }

        loadFromDB(SMTP_DB_KEY, function(err, smtp) {
            if (err) {
                return callback(err);
            }


            loadFromDB(IMAP_DB_KEY, function(err, imap) {
                if (err) {
                    return callback(err);
                }


                loadFromDB(USERNAME_DB_KEY, function(err, username) {
                    if (err) {
                        return callback(err);
                    }


                    loadFromDB(REALNAME_DB_KEY, function(err, realname) {
                        if (err) {
                            return callback(err);
                        }


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
                                    self.username = username;
                                    self.realname = realname;
                                    self.smtp = smtp;
                                    self.imap = imap;
                                    self.initialized = true;

                                    callback();
                                });
                            });
                        });
                    });
                });
            });
        });

        function loadFromDB(key, callback) {
            self._appConfigStore.listItems(key, 0, null, function(err, cachedItems) {
                callback(err, (!err && cachedItems && cachedItems[0]));
            });
        }
    };

    /**
     * Handles certificate updates and errors by notifying the user.
     * @param  {String}   component      Either imap or smtp
     * @param  {Function} callback       The error handler
     * @param  {[type]}   pemEncodedCert The PEM encoded SSL certificate
     */
    Auth.prototype.handleCertificateUpdate = function(component, onConnect, callback, pemEncodedCert) {
        var self = this;

        axe.debug('new ssl certificate received: ' + pemEncodedCert);

        if (!self[component].ca) {
            // no previous ssl cert, trust on first use
            self[component].ca = pemEncodedCert;
            self.credentialsDirty = true;
            self.storeCredentials(callback);
            return;
        }

        if (self[component].ca === pemEncodedCert) {
            // ignore multiple successive tls handshakes, e.g. for gmail
            return;
        }

        if (self[component].ca && self[component].pinned) {
            // do not update the pinned certificates!
            callback({
                title: str.outdatedCertificateTitle,
                message: str.outdatedCertificateMessage.replace('{0}', self[component].host)
            });
            return;
        }

        // previous ssl cert known, does not match: query user and certificate
        callback({
            title: str.updateCertificateTitle,
            message: str.updateCertificateMessage.replace('{0}', self[component].host),
            positiveBtnStr: str.updateCertificatePosBtn,
            negativeBtnStr: str.updateCertificateNegBtn,
            showNegativeBtn: true,
            showBugReporter: false,
            callback: function(granted) {
                if (!granted) {
                    return;
                }

                self[component].ca = pemEncodedCert;
                self.storeCredentials(function(err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    onConnect(callback);
                });
            }
        });
    };

    return Auth;
});