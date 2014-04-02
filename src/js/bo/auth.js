define(function() {
    'use strict';

    var emailItemKey = 'emailaddress';

    var Auth = function(appConfigStore, oauth, ca) {
        this._appConfigStore = appConfigStore;
        this._oauth = oauth;
        this._ca = ca;
    };

    Auth.prototype.getCredentials = function(options, callback) {
        var self = this;

        // fetch pinned local ssl certificate
        self.getCertificate(function(err, certificate) {
            if (err) {
                callback(err);
                return;
            }

            // get a fresh oauth token
            self._oauth.getOAuthToken(function(err, token) {
                if (err) {
                    callback(err);
                    return;
                }

                // get email address for the token
                self.queryEmailAddress(token, function(err, emailAddress) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    callback(null, {
                        emailAddress: emailAddress,
                        oauthToken: token,
                        sslCert: certificate
                    });
                });
            });
        });
    };

    /**
     * Get the pinned ssl certificate for the corresponding mail server.
     */
    Auth.prototype.getCertificate = function(callback) {
        this._ca.get({
            uri: '/Google_Internet_Authority_G2.pem',
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
     * Gracefully try to fetch the user's email address from local storage.
     * If not yet stored, handle online/offline cases on first use.
     */
    Auth.prototype.getEmailAddress = function(callback) {
        // try to fetch email address from local storage
        this.getEmailAddressFromConfig(function(err, cachedEmailAddress) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, cachedEmailAddress);
        });
    };

    /**
     * Get the user's email address from local storage
     */
    Auth.prototype.getEmailAddressFromConfig = function(callback) {
        this._appConfigStore.listItems(emailItemKey, 0, null, function(err, cachedItems) {
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
    Auth.prototype.queryEmailAddress = function(token, callback) {
        var self = this;

        self.getEmailAddressFromConfig(function(err, cachedEmailAddress) {
            if (err) {
                callback(err);
                return;
            }

            // do roundtrip to google api if no email address is cached yet
            if (!cachedEmailAddress) {
                queryOAuthApi();
                return;
            }

            callback(null, cachedEmailAddress);
        });

        function queryOAuthApi() {
            self._oauth.queryEmailAddress(token, function(err, emailAddress) {
                if (err) {
                    callback(err);
                    return;
                }

                // cache the email address on the device
                self._appConfigStore.storeList([emailAddress], emailItemKey, function(err) {
                    callback(err, emailAddress);
                });
            });
        }
    };

    return Auth;
});