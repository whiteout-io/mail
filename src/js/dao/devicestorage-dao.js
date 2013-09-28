/**
 * High level storage api that handles all persistence on the device. If
 * SQLcipher/SQLite is available, all data is securely persisted there,
 * through transparent encryption. If not, the crypto API is
 * used to encrypt data on the fly before persisting via a JSON store.
 */
define(function(require) {
    'use strict';

    var jsonDao = require('js/dao/lawnchair-dao');

    var DeviceStorageDAO = function() {

    };

    DeviceStorageDAO.prototype.init = function(emailAddress, callback) {
        jsonDao.init(emailAddress, callback);
    };

    /**
     * Stores a list of encrypted items in the object store
     * @param list [Array] The list of items to be persisted
     * @param type [String] The type of item to be persisted e.g. 'email'
     */
    DeviceStorageDAO.prototype.storeList = function(list, type, callback) {
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

        jsonDao.batch(items, function() {
            callback();
        });
    };

    /**
     *  Deletes items of a certain type from storage
     */
    DeviceStorageDAO.prototype.removeList = function(type, callback) {
        // validate type
        if (!type) {
            callback({
                errMsg: 'Type is not set!'
            });
            return;
        }

        jsonDao.removeList(type, function() {
            callback();
        });
    };

    /**
     * List stored items of a given type
     * @param type [String] The type of item e.g. 'email'
     * @param offset [Number] The offset of items to fetch (0 is the last stored item)
     * @param num [Number] The number of items to fetch (null means fetch all)
     */
    DeviceStorageDAO.prototype.listItems = function(type, offset, num, callback) {

        // validate type
        if (!type || typeof offset === 'undefined' || typeof num === 'undefined') {
            callback({
                errMsg: 'Args not is not set!'
            });
            return;
        }

        // fetch all items of a certain type from the data-store
        jsonDao.list(type, offset, num, function(matchingList) {
            callback(null, matchingList);
        });
    };

    /**
     * Clear the whole device data-store
     */
    DeviceStorageDAO.prototype.clear = function(callback) {
        jsonDao.clear(callback);
    };

    //
    // helper functions
    //

    function createKey(i, type) {
        var key;

        // put uid in key if available... for easy querying
        if (i.uid) {
            key = type + '_' + i.uid;
        } else if (i.sentDate && i.id) {
            key = type + '_' + i.sentDate + '_' + i.id;
        } else if (i.id) {
            key = type + '_' + i.id;
        } else {
            key = type;
        }

        return key;
    }

    return DeviceStorageDAO;
});