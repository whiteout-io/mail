define(function(require) {
    'use strict';

    var cfg = require('js/app-config').config;

    var self = {};

    self.create = function(options, callback) {
        callback = callback || function() {};
        if (window.chrome && chrome.notifications) {
            chrome.notifications.create(options.id, {
                type: 'basic',
                title: options.title,
                message: options.message,
                iconUrl: chrome.runtime.getURL(cfg.iconPath)
            }, callback);
        }
    };

    self.setOnClickedListener = function(listener) {
        if (window.chrome && chrome.notifications) {
            chrome.notifications.onClicked.addListener(listener);
        }
    };

    return self;
});