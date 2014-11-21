'use strict';

var ngModule = angular.module('woUtil');
ngModule.service('updateHandler', UpdateHandler);
module.exports = UpdateHandler;

var axe = require('axe-logger'),
    cfg = require('../../app-config').config,
    updateV1 = require('./update-v1'),
    updateV2 = require('./update-v2'),
    updateV3 = require('./update-v3'),
    updateV4 = require('./update-v4'),
    updateV5 = require('./update-v5');

/**
 * Handles database migration
 */
function UpdateHandler(appConfigStore, accountStore, auth, dialog) {
    this._appConfigStorage = appConfigStore;
    this._userStorage = accountStore;
    this._updateScripts = [updateV1, updateV2, updateV3, updateV4, updateV5];
    this._auth = auth;
    this._dialog = dialog;
}

/**
 * Executes all the necessary updates
 * @param  {Function} callback(error) Invoked when all the database updates were executed, or if an error occurred
 */
UpdateHandler.prototype.update = function(callback) {
    var self = this,
        currentVersion = 0,
        targetVersion = cfg.dbVersion,
        versionDbType = 'dbVersion';

    self._appConfigStorage.listItems(versionDbType, 0, null, function(err, items) {
        if (err) {
            callback(err);
            return;
        }

        // parse the database version number
        if (items && items.length > 0) {
            currentVersion = parseInt(items[0], 10);
        }

        self._applyUpdate({
            currentVersion: currentVersion,
            targetVersion: targetVersion
        }, callback);
    });
};

/**
 * Schedules necessary updates and executes thom in order
 */
UpdateHandler.prototype._applyUpdate = function(options, callback) {
    var self = this,
        scriptOptions,
        queue = [];

    if (options.currentVersion >= options.targetVersion) {
        // the current database version is up to date
        callback();
        return;
    }

    scriptOptions = {
        appConfigStorage: self._appConfigStorage,
        userStorage: self._userStorage,
        auth: self._auth
    };

    // add all the necessary database updates to the queue
    for (var i = options.currentVersion; i < options.targetVersion; i++) {
        queue.push(self._updateScripts[i]);
    }

    // takes the next update from the queue and executes it
    function executeNextUpdate(err) {
        if (err) {
            callback(err);
            return;
        }

        if (queue.length < 1) {
            // we're done
            callback();
            return;
        }

        // process next update
        var script = queue.shift();
        script(scriptOptions, executeNextUpdate);
    }

    executeNextUpdate();
};

/**
 * Check application version and update correspondingly
 */
UpdateHandler.prototype.checkForUpdate = function() {
    var self = this;

    // Chrome Packaged App
    if (typeof window.chrome !== 'undefined' && chrome.runtime && chrome.runtime.onUpdateAvailable) {
        // check for Chrome app update and restart
        chrome.runtime.onUpdateAvailable.addListener(function(details) {
            axe.debug('New Chrome App update... requesting reload.');
            // Chrome downloaded a new app version
            self._dialog.confirm({
                title: 'Update available',
                message: 'A new version ' + details.version + ' of the app is available. Restart the app to update?',
                positiveBtnStr: 'Restart',
                negativeBtnStr: 'Not now',
                showNegativeBtn: true,
                callback: function(agree) {
                    if (agree) {
                        chrome.runtime.reload();
                    }
                }
            });
        });
        chrome.runtime.requestUpdateCheck(function(status) {
            if (status === "update_found") {
                axe.debug("Update pending...");
            } else if (status === "no_update") {
                axe.debug("No update found.");
            } else if (status === "throttled") {
                axe.debug("Checking updates too frequently.");
            }
        });
    }
};