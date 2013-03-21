'use strict';

/**
 * Handles generic caching of JSON objects in a lawnchair adapter
 */
app.dao.LawnchairDAO = function(window) {
	
	/**
	 * Create or update an object
	 */
	this.persist = function(key, object, callback) {
		Lawnchair(function() {
			this.save({ key:key, object:object }, callback);
		});
	};
	
	/**
	 * Persist a bunch of items at once
	 */
	this.batch = function(list, callback) {
		Lawnchair(function() {
			this.batch(list, callback);
		});
	};
	
	/**
	 * Read a single item by its key
	 */
	this.read = function(key, callback) {
		Lawnchair(function() {
			this.get(key, function(o) {
				if (o) {
					callback(o.object);
				} else {
					callback(null);
				}
			});
		});
	};
	
	/**
	 * List all the items of a certain type
	 * @param type [String] The type of item e.g. 'email'
	 * @param offset [Number] The offset of items to fetch (0 is the last stored item)
	 * @param num [Number] The number of items to fetch (null means fetch all)
	 */
	this.list = function(type, offset, num, callback) {	
		var i, list = [], matchingKeys =[];
		
		Lawnchair(function() {
			var self = this;
			
			// get all keys
			this.keys(function(keys) {
				
				// check if key begins with type
				for (i = 0; i < keys.length; i++) {
					if (keys[i].indexOf(type) === 0) {
						matchingKeys.push(keys[i]);
					}
				}				
				
				// return if there are no matching keys
				if (matchingKeys.length === 0) {
					callback(list);
					return;
				}
				
				// fetch all items from data-store with matching key
				self.get(matchingKeys, function(matchingList) {
					for (i = 0; i < matchingList.length; i++) {
						list.push(matchingList[i].object);
					}
					
					// sort items by date
					if (list[0].sentDate) {						
						list = _.sortBy(list, function(item) {
							var parts = item.sentDate.match(/(\d+)/g);
							var date = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
							return date.getTime();
						});
					}			
					
					// if num is null, list all items
					num = (num !== null) ? num : list.length;

					// set window of items to fetch
					if (offset + num < list.length) {
						list = list.splice(list.length - offset - num, num);
					} else if (offset + num >= list.length && offset < list.length) {
						list = list.splice(0, list.length - offset);
					} else {
						list = [];
					}					
					
					// return only the interval between offset and num
					callback(list);
				});			
					
			});
		});
	};
	
	/**
	 * Removes an object liter from local storage by its key (delete)
	 */
	this.remove = function(key, callback) {
		Lawnchair(function() {
			this.remove(key, callback);
		});
	};
	
	/**
	 * Clears the whole local storage cache
	 */
	this.clear = function(callback) {
		Lawnchair(function() {
			this.nuke(callback);
		});
	};
	
};