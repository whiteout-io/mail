define(function(require) {
    'use strict';

    var cfg = require('js/app-config').config,
        updateV1 = require('js/util/update/update-v1'),
        updateV2 = require('js/util/update/update-v2');

    /**
     * Handles database migration
     */
    var UpdateHandler = function(appConfigStorage, userStorage) {
        this._appConfigStorage = appConfigStorage;
        this._userStorage = userStorage;
        this._updateScripts = [updateV1, updateV2];
    };

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
            storage,
            queue = [];

        if (options.currentVersion >= options.targetVersion) {
            // the current database version is up to date
            callback();
            return;
        }

        storage = {
            appConfigStorage: self._appConfigStorage,
            userStorage: self._userStorage
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
            script(storage, executeNextUpdate);
        }

        executeNextUpdate();
    };

    return UpdateHandler;
});