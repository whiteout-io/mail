'use strict';

var ngModule = angular.module('woServices');
ngModule.service('appConfigLawnchair', LawnchairDAO);
ngModule.service('accountLawnchair', LawnchairDAO);
module.exports = LawnchairDAO;

/**
 * Handles generic caching of JSON objects in a lawnchair adapter
 */
function LawnchairDAO($q) {
    this._q = $q;
}

/**
 * Initialize the lawnchair database
 * @param  {String}   dbName   The name of the database
 * @return {Promise}
 */
LawnchairDAO.prototype.init = function(dbName) {
    var self = this;
    return self._q(function(resolve, reject) {
        if (!dbName) {
            reject(new Error('Lawnchair DB name must be specified!'));
        }

        self._db = new Lawnchair({
            name: dbName
        }, function(success) {
            if (success) {
                resolve();
            } else {
                reject(new Error('Lawnchair initialization ' + dbName + ' failed!'));
            }
        });
    });
};

/**
 * Create or update an object
 * @return {Promise}
 */
LawnchairDAO.prototype.persist = function(key, object) {
    var self = this;
    return self._q(function(resolve, reject) {
        if (!key || !object) {
            reject(new Error('Key and Object must be set!'));
            return;
        }

        self._db.save({
            key: key,
            object: object
        }, function(persisted) {
            if (persisted.key !== key) {
                reject(new Error('Persisting failed!'));
                return;
            }

            resolve();
        });
    });
};

/**
 * Persist a bunch of items at once
 * @return {Promise}
 */
LawnchairDAO.prototype.batch = function(list) {
    var self = this;
    return self._q(function(resolve, reject) {
        if (!(list instanceof Array)) {
            reject(new Error('Input must be of type Array!'));
            return;
        }

        self._db.batch(list, function(res) {
            if (!res) {
                reject(new Error('Persisting batch failed!'));
                return;
            }

            resolve();
        });
    });
};

/**
 * Read a single item by its key
 * @return {Promise}
 */
LawnchairDAO.prototype.read = function(key) {
    var self = this;
    return self._q(function(resolve, reject) {
        if (!key) {
            reject(new Error('Key must be specified!'));
            return;
        }

        self._db.get(key, function(o) {
            if (o) {
                resolve(o.object);
            } else {
                resolve();
            }
        });
    });
};

/**
 * List all the items of a certain type
 * @param type [String] The type of item e.g. 'email'
 * @param offset [Number] The offset of items to fetch (0 is the last stored item)
 * @param num [Number] The number of items to fetch (null means fetch all)
 * @return {Promise}
 */
LawnchairDAO.prototype.list = function(type, offset, num) {
    var self = this;
    return self._q(function(resolve, reject) {
        var i, from, to,
            matchingKeys = [],
            intervalKeys = [],
            list = [];

        // validate input
        if (!type || typeof offset === 'undefined' || typeof num === 'undefined') {
            reject(new Error('Args not is not set!'));
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
                resolve(list);
                return;
            }

            // fetch all items from data-store with matching key
            self._db.get(intervalKeys, function(intervalList) {
                intervalList.forEach(function(item) {
                    list.push(item.object);
                });

                // return only the interval between offset and num
                resolve(list);
            });
        });
    });
};

/**
 * Removes an object liter from local storage by its key (delete)
 * @return {Promise}
 */
LawnchairDAO.prototype.remove = function(key) {
    var self = this;
    return self._q(function(resolve, reject) {
        self._db.remove(key, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

/**
 * Removes an object liter from local storage by its key (delete)
 * @return {Promise}
 */
LawnchairDAO.prototype.removeList = function(type) {
    var self = this;
    return self._q(function(resolve, reject) {
        var matchingKeys = [],
            after;

        // validate type
        if (!type) {
            reject(new Error('Type is not set!'));
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
                resolve();
                return;
            }

            // remove all matching keys
            after = _.after(matchingKeys.length, resolve);
            _.each(matchingKeys, function(key) {
                self._db.remove(key, after);
            });
        });
    });
};

/**
 * Clears the whole local storage cache
 * @return {Promise}
 */
LawnchairDAO.prototype.clear = function() {
    var self = this;
    return self._q(function(resolve, reject) {
        self._db.nuke(function(err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};