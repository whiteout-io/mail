/**
 * Handles generic caching of JSON objects in LocalStorage
 */
app.dao.LocalStorageDAO = function(window) {
	'use strict';

	/**
	 * Stringifies an object literal to JSON and perists it
	 */
	this.persist = function(key, object) {
		var json = JSON.stringify(object);
		window.localStorage.setItem(key, json);
	};

	/**
	 * Fetches a json string from local storage by its key and parses it to an object literal
	 */
	this.read = function(key) {
		var json = window.localStorage.getItem(key);
		return JSON.parse(json);
	};

	/**
	 * List all the items of a certain type in local storage
	 * @param type [String] The type of item e.g. 'email'
	 */
	this.list = function(type) {
		var i, key, json, list = [];

		for (i = 0; i < window.localStorage.length; i++) {
			key = window.localStorage.key(i);
			if (key.indexOf(type) === 0) {
				json = window.localStorage.getItem(key);
				list.push(JSON.parse(json));
			}
		}

		return list;
	};

	/**
	 * Removes an object liter from local storage by its key (delete)
	 */
	this.remove = function(key) {
		window.localStorage.removeItem(key);
	};

	/**
	 * Clears the whole local storage cache
	 */
	this.clear = function() {
		window.localStorage.clear();
	};

};