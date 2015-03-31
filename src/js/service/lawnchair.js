'use strict';

var ngModule = angular.module('woServices');
ngModule.service('appConfigLawnchair', LawnchairDAO);
ngModule.service('accountLawnchair', LawnchairDAO);
module.exports = LawnchairDAO;

/**
 * Handles generic caching of JSON objects in a lawnchair adapter
 */
function LawnchairDAO() {}

/**
 * Initialize the lawnchair database
 * @param  {String}   dbName   The name of the database
 * @return {Promise}
 */
LawnchairDAO.prototype.init = function(dbName) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if (!dbName) {
            throw new Error('Lawnchair DB name must be specified!');
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
    return new Promise(function(resolve, reject) {
        if (!key || !object) {
            throw new Error('Key and Object must be set!');
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
    return new Promise(function(resolve, reject) {
        if (!(list instanceof Array)) {
            throw new Error('Input must be of type Array!');
        }

        self._db.batch(list, function(res) {
            if (!res) {
                reject(new Error('Persisting batch failed!'));
            } else {
                resolve();
            }
        });
    });
};

/**
 * Read a single item by its key
 * @return {Promise}
 */
LawnchairDAO.prototype.read = function(key) {
    var self = this;
    return new Promise(function(resolve) {
        if (!key) {
            throw new Error('Key must be specified!');
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
 * @return {Promise}
 */
LawnchairDAO.prototype.list = function(query, exactMatchOnly) {
    var self = this;
    return new Promise(function(resolve) {
        var matchingKeys = [];

        // validate input
        if ((Array.isArray(query) && query.length === 0) || (!Array.isArray(query) && !query)) {
            throw new Error('Args not is not set!');
        }

        // this method operates on arrays of keys, so normalize input 'key' -> ['key']
        if (!Array.isArray(query)) {
            query = [query];
        }

        // get all keys
        self._db.keys(function(keys) {
            // check if there are keys in the db that start with the respective query
            matchingKeys = keys.filter(function(key) {
                return query.filter(function(type) {
                    if (exactMatchOnly) {
                        return key === type;
                    } else {
                        return key.indexOf(type) === 0;
                    }
                }).length > 0;
            });

            if (matchingKeys.length === 0) {
                // no matching keys, resolve
                resolve([]);
                return;
            }

            // fetch all items from data-store with matching keys
            self._db.get(matchingKeys, function(intervalList) {
                var result = intervalList.map(function(item) {
                    return item.object;
                });

                resolve(result);
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
    return new Promise(function(resolve, reject) {
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
    return new Promise(function(resolve) {
        var matchingKeys = [],
            after;

        // validate type
        if (!type) {
            throw new Error('Type is not set!');
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
    return new Promise(function(resolve, reject) {
        self._db.nuke(function(err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};