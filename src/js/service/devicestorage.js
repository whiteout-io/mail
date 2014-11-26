'use strict';

var ngModule = angular.module('woServices');

// expose an instance with the static dbName 'app-config' to store configuration data
ngModule.factory('appConfigStore', function(appConfigLawnchair) {
    var deviceStorage = new DeviceStorage(appConfigLawnchair);
    deviceStorage.init('app-config');
    return deviceStorage;
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
 */
DeviceStorage.prototype.init = function(dbName) {
    this._lawnchairDAO.init(dbName);
};

/**
 * Stores a list of encrypted items in the object store
 * @param list [Array] The list of items to be persisted
 * @param type [String] The type of item to be persisted e.g. 'email'
 */
DeviceStorage.prototype.storeList = function(list, type, callback) {
    var key, items = [];

    // nothing to store
    if (!list || list.length === 0) {
        callback();
        return;
    }
    // validate type
    if (!type) {
        callback({
            errMsg: 'Type is not set!'
        });
        return;
    }

    // format items for batch storing in dao
    list.forEach(function(i) {
        key = createKey(i, type);

        items.push({
            key: key,
            object: i
        });
    });

    this._lawnchairDAO.batch(items, callback);
};

/**
 *  Deletes items of a certain type from storage
 */
DeviceStorage.prototype.removeList = function(type, callback) {
    this._lawnchairDAO.removeList(type, callback);
};

/**
 * List stored items of a given type
 * @param type [String] The type of item e.g. 'email'
 * @param offset [Number] The offset of items to fetch (0 is the last stored item)
 * @param num [Number] The number of items to fetch (null means fetch all)
 */
DeviceStorage.prototype.listItems = function(type, offset, num, callback) {
    // fetch all items of a certain type from the data-store
    this._lawnchairDAO.list(type, offset, num, callback);
};

/**
 * Clear the whole device data-store
 */
DeviceStorage.prototype.clear = function(callback) {
    this._lawnchairDAO.clear(callback);
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