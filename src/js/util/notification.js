'use strict';

var ngModule = angular.module('woUtil');
ngModule.service('notification', Notif);
module.exports = Notif;

function Notif(appConfig, axe) {
    this._appConfig = appConfig;
    this._axe = axe;

    if (window.Notification) {
        this.hasPermission = Notification.permission === "granted";
    }
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
Notif.prototype.create = function(options) {
    var self = this;

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

    var notification;
    try {
        notification = new Notification(options.title, {
            body: options.message,
            icon: self._appConfig.config.iconPath
        });
    } catch (err) {
        self._axe.error('Displaying notification failed: ' + err.message);
        return;
    }

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

Notif.prototype.close = function(notification) {
    if (notification) {
        notification.close();
    }
};