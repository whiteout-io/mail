'use strict';

var ngModule = angular.module('woServices');
ngModule.factory('lawnchairDAO', function() {
    return new LawnchairDAO();
});
module.exports = LawnchairDAO;

/**
 * Handles generic caching of JSON objects in a lawnchair adapter
 */
function LawnchairDAO() {}

/**
 * Initialize the lawnchair database
 * @param  {String}   dbName   The name of the database
 */
LawnchairDAO.prototype.init = function(dbName) {
    if (!dbName) {
        throw new Error('Lawnchair DB name must be specified!');
    }

    this._db = new Lawnchair({
        name: dbName
    });
};

/**
 * Create or update an object
 */
LawnchairDAO.prototype.persist = function(key, object, callback) {
    if (!key || !object) {
        callback({
            errMsg: 'Key and Object must be set!'
        });
        return;
    }

    this._db.save({
        key: key,
        object: object
    }, function(persisted) {
        if (persisted.key !== key) {
            callback({
                errMsg: 'Persisting failed!'
            });
            return;
        }

        callback();
    });
};

/**
 * Persist a bunch of items at once
 */
LawnchairDAO.prototype.batch = function(list, callback) {
    if (!(list instanceof Array)) {
        callback({
            errMsg: 'Input must be of type Array!'
        });
        return;
    }

    this._db.batch(list, function(res) {
        if (!res) {
            callback({
                errMsg: 'Persisting batch failed!'
            });
            return;
        }

        callback();
    });
};

/**
 * Read a single item by its key
 */
LawnchairDAO.prototype.read = function(key, callback) {
    if (!key) {
        callback({
            errMsg: 'Key must be specified!'
        });
        return;
    }

    this._db.get(key, function(o) {
        if (o) {
            callback(null, o.object);
        } else {
            callback();
        }
    });
};

/**
 * List all the items of a certain type
 * @param type [String] The type of item e.g. 'email'
 * @param offset [Number] The offset of items to fetch (0 is the last stored item)
 * @param num [Number] The number of items to fetch (null means fetch all)
 */
LawnchairDAO.prototype.list = function(type, offset, num, callback) {
    var self = this,
        i, from, to,
        matchingKeys = [],
        intervalKeys = [],
        list = [];

    // validate input
    if (!type || typeof offset === 'undefined' || typeof num === 'undefined') {
        callback({
            errMsg: 'Args not is not set!'
        });
        return;
    }

    // get all keys
    self._db.keys(function(keys) {

        // check if key begins with type
        keys.forEach(function(key) {
            if (key.indexOf(type) === 0) {
                matchingKeys.push(key);
            }
        });

        // sort keys
        matchingKeys.sort();

        // set window of items to fetch
        // if num is null, list all items
        from = (num) ? matchingKeys.length - offset - num : 0;
        to = matchingKeys.length - 1 - offset;
        // filter items within requested interval
        for (i = 0; i < matchingKeys.length; i++) {
            if (i >= from && i <= to) {
                intervalKeys.push(matchingKeys[i]);
            }
        }

        // return if there are no matching keys
        if (intervalKeys.length === 0) {
            callback(null, list);
            return;
        }

        // fetch all items from data-store with matching key
        self._db.get(intervalKeys, function(intervalList) {
            intervalList.forEach(function(item) {
                list.push(item.object);
            });

            // return only the interval between offset and num
            callback(null, list);
        });

    });
};

/**
 * Removes an object liter from local storage by its key (delete)
 */
LawnchairDAO.prototype.remove = function(key, callback) {
    this._db.remove(key, callback);
};

/**
 * Removes an object liter from local storage by its key (delete)
 */
LawnchairDAO.prototype.removeList = function(type, callback) {
    var self = this,
        matchingKeys = [],
        after;

    // validate type
    if (!type) {
        callback({
            errMsg: 'Type is not set!'
        });
        return;
    }

    // get all keys
    self._db.keys(function(keys) {
        // check if key begins with type
        keys.forEach(function(key) {
            if (key.indexOf(type) === 0) {
                matchingKeys.push(key);
            }
        });

        if (matchingKeys.length < 1) {
            callback();
            return;
        }

        // remove all matching keys
        after = _.after(matchingKeys.length, callback);
        _.each(matchingKeys, function(key) {
            self._db.remove(key, after);
        });
    });
};

/**
 * Clears the whole local storage cache
 */
LawnchairDAO.prototype.clear = function(callback) {
    this._db.nuke(callback);
};