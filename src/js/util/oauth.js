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
    OAuth.prototype.getOAuthToken = function(callback) {
        // get OAuth Token from chrome
        chrome.identity.getAuthToken({
            'interactive': true
        }, function(token) {
            if ((chrome && chrome.runtime && chrome.runtime.lastError) || !token) {
                callback({
                    errMsg: 'Error fetching an OAuth token for the user!'
                });
                return;
            }

            callback(null, token);
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
            uri: '/oauth2/v1/tokeninfo?access_token=' + token
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