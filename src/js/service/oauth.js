'use strict';

var ngModule = angular.module('woServices');
ngModule.service('oauth', OAuth);
module.exports = OAuth;

function OAuth(restDao) {
    this._googleApi = restDao;
    this._googleApi.setBaseUri('https://www.googleapis.com');
}

/**
 * Check if chrome.identity api is supported
 * @return {Boolean} If is supported
 */
OAuth.prototype.isSupported = function() {
    return !!(window.chrome && chrome.identity);
};

/**
 * Request an OAuth token from chrome for gmail users
 * @param  {String}   emailAddress  The user's email address (optional)
 */
OAuth.prototype.getOAuthToken = function(emailAddress, callback) {
    var idOptions = {
        interactive: true
    };

    // check which runtime the app is running under
    chrome.runtime.getPlatformInfo(function(platformInfo) {
        if (chrome.runtime.lastError || !platformInfo) {
            callback(new Error('Error getting chrome platform info!'));
            return;
        }

        if (emailAddress && platformInfo.os.indexOf('android') !== -1) {
            // set accountHint so that native Android account picker does not show up each time
            idOptions.accountHint = emailAddress;
        }

        // get OAuth Token from chrome
        chrome.identity.getAuthToken(idOptions, function(token) {
            if (chrome.runtime.lastError || !token) {
                callback({
                    errMsg: 'Error fetching an OAuth token for the user!'
                });
                return;
            }

            callback(null, token);
        });
    });
};

/**
 * Remove an old OAuth token and get a new one.
 * @param  {String}   options.oldToken      The old token to be removed
 * @param  {String}   options.emailAddress  The user's email address (optional)
 */
OAuth.prototype.refreshToken = function(options, callback) {
    var self = this;

    if (!options.oldToken) {
        callback(new Error('oldToken option not set!'));
        return;
    }

    // remove cached token
    chrome.identity.removeCachedAuthToken({
        token: options.oldToken
    }, function() {
        // get a new token
        self.getOAuthToken(options.emailAddress, callback);
    });
};

/**
 * Get email address from google api
 * @param  {String}   token    The oauth token
 */
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