'use strict';

var ngModule = angular.module('woServices');
ngModule.service('account', Account);

var Email = require('./email');

function Account() {
    this._emailDAOs = [];
}

/**
 * Lists all of the current accounts connected to the app
 * @return {Array<Object>} The account objects containing folder and message objects
 */
Account.prototype.all = function() {
    return this._emailDAOs.map(function(emailDao) {
        return emailDao._account;
    });
};

/**
 * Login to an existing email account. This creates a new email data access object instance for that account and logs in via IMAP.
 * @param  {String} options.emailAddress	The account's email address
 */
Account.prototype.login = function(options) {
    var emailDao = new Email();
    this._emailDAOs.push(emailDao);
};

/**
 * Create a new whiteout account. This creates a new email data access object instance for that account and logs in via IMAP.
 * @param  {String} options.emailAddress	The account's email address
 */
Account.prototype.create = function(options) {};

/**
 * Logout of an email account. This creates a new email data access object instance for that account and logs in via IMAP.
 * @param  {String} options.emailAddress	The account's email address
 */
Account.prototype.logout = function(options) {};