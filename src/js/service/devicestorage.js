'use strict';

var ngModule = angular.module('woServices');

// expose an instance with the static dbName 'app-config' to store configuration data
ngModule.factory('appConfigStore', function(appConfigLawnchair) {
    return new DeviceStorage(appConfigLawnchair);
});

// expose a singleton instance of DeviceStorage called 'accountStore' to persist user data
ngModule.factory('accountStore', function(accountLawnchair) {
    return new DeviceStorage(accountLawnchair);
});

module.exports = DeviceStorage;

//
// Implementation
//

/**
 * High level storage api that handles all persistence of a user's data on the device.
 */
function DeviceStorage(lawnchairDAO) {
    this._lawnchairDAO = lawnchairDAO;
}

/**
 * Initialize the lawnchair database
 * @param  {String}   dbName   The name of the database
 * @return {Promise}
 */
DeviceStorage.prototype.init = function(dbName) {
    return this._lawnchairDAO.init(dbName);
};

/**
 * Stores a list of encrypted items in the object store
 * @param list [Array] The list of items to be persisted
 * @param type [String] The type of item to be persisted e.g. 'email'
 * @return {Promise}
 */
DeviceStorage.prototype.storeList = function(list, type) {
    var self = this;
    return new Promise(function(resolve) {
        var key, items = [];
        list = list || [];

        // validate type
        if (!type) {
            throw new Error('Type is not set!');
        }

        // format items for batch storing in dao
        list.forEach(function(i) {
            key = createKey(i, type);

            items.push({
                key: key,
                object: i
            });
        });

        resolve(items);

    }).then(function(items) {
        // nothing to store
        if (items.length === 0) {
            return;
        }

        return self._lawnchairDAO.batch(items);
    });
};

/**
 * Deletes items of a certain type from storage
 * @return {Promise}
 */
DeviceStorage.prototype.removeList = function(type) {
    return this._lawnchairDAO.removeList(type);
};

/**
 * List stored items of a given type
 * @param {String/Array} query The type of item e.g. 'email'
 * @param {Boolean} exactMatchOnly Specifies if only exact matches are extracted from the DB as opposed to keys that start with the query
 * @return {Promise}
 */
DeviceStorage.prototype.listItems = function(query, exactMatchOnly) {
    // fetch all items of a certain query from the data-store
    return this._lawnchairDAO.list(query, exactMatchOnly);
};

/**
 * Clear the whole device data-store
 * @return {Promise}
 */
DeviceStorage.prototype.clear = function() {
    return this._lawnchairDAO.clear();
};

//
// helper functions
//

function createKey(i, type) {
    var key;

    // put uid in key if available... for easy querying
    if (i.uid) {
        key = type + '_' + i.uid;
    } else if (i.id) {
        key = type + '_' + i.id;
    } else {
        key = type;
    }

    return key;
}