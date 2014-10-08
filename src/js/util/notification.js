'use strict';

var cfg = require('../app-config').config;

var self = {};

if (window.Notification) {
    self.hasPermission = Notification.permission === "granted";
}

/**
 * Creates a notification. Requests permission if not already granted
 *
 * @param {String} options.title The notification title
 * @param {String} options.message The notification message
 * @param {Number} options.timeout (optional) Timeout when the notification is closed in milliseconds
 * @param {Function} options.onClick (optional) callback when the notification is clicked
 * @returns {Notification} A notification instance
 */
self.create = function(options) {
    options.onClick = options.onClick || function() {};

    if (!window.Notification) {
        return;
    }

    if (!self.hasPermission) {
        // don't wait until callback returns
        Notification.requestPermission(function(permission) {
            if (permission === "granted") {
                self.hasPermission = true;
            }
        });
    }

    var notification = new Notification(options.title, {
        body: options.message,
        icon: cfg.iconPath
    });
    notification.onclick = function() {
        window.focus();
        options.onClick();
    };

    if (options.timeout > 0) {
        setTimeout(function() {
            notification.close();
        }, options.timeout);
    }

    return notification;
};

self.close = function(notification) {
    notification.close();
};

module.exports = self;