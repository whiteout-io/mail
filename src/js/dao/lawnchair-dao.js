/**
 * Handles generic caching of JSON objects in a lawnchair adapter
 */
define(['lawnchair', 'lawnchairSQL', 'lawnchairIDB'], function(Lawnchair) {
    'use strict';

    var self = {},
        db;

    self.init = function(dbName) {
        if (!dbName) {
            throw new Error('Lawnchair DB name must be specified!');
        }

        db = new Lawnchair({
            name: dbName
        }, function(lc) {
            if (!lc) {
                throw new Error('Lawnchair init failed!');
            }
        });
    };

    /**
     * Create or update an object
     */
    self.persist = function(key, object, callback) {
        db.save({
            key: key,
            object: object
        }, callback);
    };

    /**
     * Persist a bunch of items at once
     */
    self.batch = function(list, callback) {
        db.batch(list, callback);
    };

    /**
     * Read a single item by its key
     */
    self.read = function(key, callback) {
        db.get(key, function(o) {
            if (o) {
                callback(o.object);
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
    self.list = function(type, offset, num, callback) {
        var i, from, to,
            matchingKeys = [],
            intervalKeys = [],
            list = [];

        // get all keys
        db.keys(function(keys) {

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
                callback(list);
                return;
            }

            // fetch all items from data-store with matching key
            db.get(intervalKeys, function(intervalList) {
                intervalList.forEach(function(item) {
                    list.push(item.object);
                });

                // return only the interval between offset and num
                callback(list);
            });

        });
    };

    /**
     * Removes an object liter from local storage by its key (delete)
     */
    self.remove = function(key, callback) {
        db.remove(key, callback);
    };

    /**
     * Clears the whole local storage cache
     */
    self.clear = function(callback) {
        db.nuke(callback);
    };

    return self;
});