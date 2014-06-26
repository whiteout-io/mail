define(function() {
    'use strict';

    var OAuth = function(googleApi) {
        this._googleApi = googleApi;
    };

    OAuth.prototype.isSupported = function() {
        return !!(window.chrome && chrome.identity);
    };

    /**
     * Request an OAuth token from chrome for gmail users
     */
    OAuth.prototype.getOAuthToken = function(emailAddress, callback) {
        var idOptions = {
            interactive: true
        };

        // check which runtime the app is running under
        chrome.runtime.getPlatformInfo(function(platformInfo) {
            if ((chrome && chrome.runtime && chrome.runtime.lastError) || !platformInfo) {
                callback(new Error('Error getting chrome platform info!'));
                return;
            }

            if (emailAddress && platformInfo.os.indexOf('android') !== -1) {
                // set accountHint so that native Android account picker does not show up each time
                idOptions.accountHint = emailAddress;
            }

            // get OAuth Token from chrome
            chrome.identity.getAuthToken(idOptions, function(token) {
                if ((chrome && chrome.runtime && chrome.runtime.lastError) || !token) {
                    callback({
                        errMsg: 'Error fetching an OAuth token for the user!'
                    });
                    return;
                }

                callback(null, token);
            });
        });
    };

    OAuth.prototype.queryEmailAddress = function(token, callback) {
        if (!token) {
            callback({
                errMsg: 'Invalid OAuth token!'
            });
            return;
        }

        // fetch gmail user's email address from the Google Authorization Server
        this._googleApi.get({
            uri: '/oauth2/v3/userinfo?access_token=' + token
        }, function(err, info) {
            if (err || !info || !info.email) {
                callback({
                    errMsg: 'Error looking up email address on google api!'
                });
                return;
            }

            callback(null, info.email);
        });
    };

    return OAuth;
});