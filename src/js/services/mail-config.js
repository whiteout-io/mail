'use strict';

var cfg = require('../app-config').config;

var ngModule = angular.module('woServices', []);

ngModule.service('mailConfig', function($http, $q) {

    /**
     * Get the mail server IMAP and SMTP configuration for an email address
     */
    this.get = function(emailAddress) {
        if (emailAddress.indexOf('@') < 0) {
            return $q(function(resolve, reject) {
                reject(new Error('Invalid email address!'));
            });
        }

        var url = cfg.settingsUrl + emailAddress.split('@')[1];
        return $http.get(url).then(function(res) {
            return res.data;
        });
    };

});

module.exports = ngModule;