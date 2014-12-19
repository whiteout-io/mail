'use strict';

var ngModule = angular.module('woServices');
ngModule.service('oauth', OAuth);
module.exports = OAuth;

function OAuth(oauthRestDao) {
    this._googleApi = oauthRestDao;
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
OAuth.prototype.getOAuthToken = function(emailAddress) {
    return new Promise(function(resolve, reject) {
        var idOptions = {
            interactive: true
        };

        // check which runtime the app is running under
        chrome.runtime.getPlatformInfo(function(platformInfo) {
            if (chrome.runtime.lastError || !platformInfo) {
                reject(new Error('Error getting chrome platform info!'));
                return;
            }

            if (emailAddress && platformInfo.os.indexOf('android') !== -1) {
                // set accountHint so that native Android account picker does not show up each time
                idOptions.accountHint = emailAddress;
            }

            // get OAuth Token from chrome
            chrome.identity.getAuthToken(idOptions, function(token) {
                if (chrome.runtime.lastError || !token) {
                    reject(new Error('Error fetching an OAuth token for the user!'));
                    return;
                }

                resolve(token);
            });
        });
    });
};

/**
 * Remove an old OAuth token and get a new one.
 * @param  {String}   options.oldToken      The old token to be removed
 * @param  {String}   options.emailAddress  The user's email address (optional)
 */
OAuth.prototype.refreshToken = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        if (!options.oldToken) {
            throw new Error('oldToken option not set!');
        }

        // remove cached token
        chrome.identity.removeCachedAuthToken({
            token: options.oldToken
        }, function() {
            // get a new token
            self.getOAuthToken(options.emailAddress).then(resolve);
        });
    });
};

/**
 * Get email address from google api
 * @param  {String}   token    The oauth token
 */
OAuth.prototype.queryEmailAddress = function(token) {
    var self = this;
    return new Promise(function(resolve) {
        if (!token) {
            throw new Error('Invalid OAuth token!');
        }

        resolve();

    }).then(function() {
        // fetch gmail user's email address from the Google Authorization Server
        return self._googleApi.get({
            uri: '/oauth2/v3/userinfo?access_token=' + token
        });

    }).then(function(info) {
        if (!info || !info.email) {
            throw new Error('Error looking up email address on google api!');
        }

        return info.email;
    });
};