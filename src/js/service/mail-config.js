'use strict';

var ngModule = angular.module('woServices');
ngModule.service('mailConfig', MailConfig);

var cfg = require('../app-config').config;

function MailConfig($http, $q) {
    this._http = $http;
    this._q = $q;
}

/**
 * Get the mail server IMAP and SMTP configuration for an email address
 */
MailConfig.prototype.get = function(emailAddress) {
    if (emailAddress.indexOf('@') < 0) {
        return this._q(function(resolve, reject) {
            reject(new Error('Invalid email address!'));
        });
    }

    var url = cfg.settingsUrl + emailAddress.split('@')[1];
    return this._http.get(url).then(function(res) {
        return res.data;
    });
};