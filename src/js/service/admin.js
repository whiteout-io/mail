'use strict';

var ngModule = angular.module('woServices');
ngModule.service('admin', Admin);
module.exports = Admin;

function Admin(adminRestDao) {
    this._restDao = adminRestDao;
}

/**
 * Create a new email account.
 * @param  {String}   options.emailAddress  The desired email address
 * @param  {String}   options.password      The password to be used for the account.
 * @param  {String}   options.phone         The user's mobile phone number (required for verification and password reset).
 */
Admin.prototype.createUser = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        if (!options.emailAddress || !options.password || !options.phone) {
            throw new Error('Incomplete arguments!');
        }
        resolve();

    }).then(function() {
        return self._restDao.post(options, '/user');

    }).catch(function(err) {
        if (err && err.code === 409) {
            throw new Error('User name is already taken!');
        }

        throw new Error('Error creating new user! Reason: ' + err.message);
    });
};

/**
 * Verify a user's phone number by confirming a token to the server.
 * @param  {String}   options.emailAddress  The desired email address
 * @param  {String}   options.token         The validation token.
 */
Admin.prototype.validateUser = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        if (!options.emailAddress || !options.token) {
            throw new Error('Incomplete arguments!');
        }
        resolve();

    }).then(function() {
        var uri = '/user/validate';
        return self._restDao.post(options, uri);

    }).catch(function(err) {
        if (err && err.code === 202) {
            // success
            return;
        }

        throw new Error('Validation failed! Reason: ' + err.message);
    });
};