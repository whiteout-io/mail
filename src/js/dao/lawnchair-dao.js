/**
 * Handles generic caching of JSON objects in a lawnchair adapter
 */
app.dao.LawnchairDAO = function(Lawnchair) {
	'use strict';

	var db;

	this.init = function(dbName) {
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
	this.persist = function(key, object, callback) {
		db.save({
			key: key,
			object: object
		}, callback);
	};

	/**
	 * Persist a bunch of items at once
	 */
	this.batch = function(list, callback) {
		db.batch(list, callback);
	};

	/**
	 * Read a single item by its key
	 */
	this.read = function(key, callback) {
		db.get(key, function(o) {
			if (o) {
				callback(o.object);
			} else {
				callback(null);
			}
		});
	};

	/**
	 * List all the items of a certain type
	 * @param type [String] The type of item e.g. 'email'
	 * @param offset [Number] The offset of items to fetch (0 is the last stored item)
	 * @param num [Number] The number of items to fetch (null means fetch all)
	 */
	this.list = function(type, offset, num, callback) {
		var i, list = [],
			matchingKeys = [],
			parts, timeStr, time;

		// get all keys
		db.keys(function(keys) {

			// check if key begins with type
			for (i = 0; i < keys.length; i++) {
				if (keys[i].indexOf(type) === 0) {
					matchingKeys.push(keys[i]);
				}
			}

			// sort keys
			matchingKeys.sort();

			// if num is null, list all items
			num = (num !== null) ? num : matchingKeys.length;

			// set window of items to fetch
			if (offset + num < matchingKeys.length) {
				matchingKeys = matchingKeys.splice(matchingKeys.length - offset - num, num);
			} else if (offset + num >= matchingKeys.length && offset < matchingKeys.length) {
				matchingKeys = matchingKeys.splice(0, matchingKeys.length - offset);
			} else {
				matchingKeys = [];
			}

			// return if there are no matching keys
			if (matchingKeys.length === 0) {
				callback(list);
				return;
			}

			// fetch all items from data-store with matching key
			db.get(matchingKeys, function(matchingList) {
				for (i = 0; i < matchingList.length; i++) {
					list.push(matchingList[i].object);
				}

				// return only the interval between offset and num
				callback(list);
			});

		});
	};

	/**
	 * Removes an object liter from local storage by its key (delete)
	 */
	this.remove = function(key, callback) {
		db.remove(key, callback);
	};

	/**
	 * Clears the whole local storage cache
	 */
	this.clear = function(callback) {
		db.nuke(callback);
	};

};