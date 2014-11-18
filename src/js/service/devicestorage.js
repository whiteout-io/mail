'use strict';

var ngModule = angular.module('woServices');
ngModule.service('deviceStorage', DeviceStorage);
module.exports = DeviceStorage;

/**
 * High level storage api that handles all persistence on the device.
 */
function DeviceStorage(localDbDao) {
    this._localDbDao = localDbDao;
}

DeviceStorage.prototype.init = function(emailAddress, callback) {
    this._localDbDao.init(emailAddress, callback);
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

    this._localDbDao.batch(items, callback);
};

/**
 *  Deletes items of a certain type from storage
 */
DeviceStorage.prototype.removeList = function(type, callback) {
    this._localDbDao.removeList(type, callback);
};

/**
 * List stored items of a given type
 * @param type [String] The type of item e.g. 'email'
 * @param offset [Number] The offset of items to fetch (0 is the last stored item)
 * @param num [Number] The number of items to fetch (null means fetch all)
 */
DeviceStorage.prototype.listItems = function(type, offset, num, callback) {
    // fetch all items of a certain type from the data-store
    this._localDbDao.list(type, offset, num, callback);
};

/**
 * Clear the whole device data-store
 */
DeviceStorage.prototype.clear = function(callback) {
    this._localDbDao.clear(callback);
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