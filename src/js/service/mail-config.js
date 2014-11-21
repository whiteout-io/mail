'use strict';

var ngModule = angular.module('woServices');
ngModule.service('mailConfig', MailConfig);
module.exports = MailConfig;

function MailConfig($http, $q, appConfig) {
    this._http = $http;
    this._q = $q;
    this._appConfig = appConfig;
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

    var url = this._appConfig.config.settingsUrl + emailAddress.split('@')[1];
    return this._http.get(url).then(function(res) {
        return res.data;
    });
};