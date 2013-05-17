/**
 * High level storage api that handles all persistence on the device. If
 * SQLcipher/SQLite is available, all data is securely persisted there,
 * through transparent encryption. If not, the crypto API is
 * used to encrypt data on the fly before persisting via a JSON store.
 */
app.dao.DeviceStorage = function(util, crypto, jsonDao, sqlcipherDao) {
	'use strict';

	/**
	 * Stores a list of encrypted items in the object store
	 * @param list [Array] The list of items to be persisted
	 * @param type [String] The type of item to be persisted e.g. 'email'
	 */
	this.storeEcryptedList = function(list, type, callback) {
		var i, date, key, items = [];

		// format items for batch storing in dao
		for (i = 0; i < list.length; i++) {

			// put date in key if available... for easy querying
			if (list[i].sentDate) {
				date = util.parseDate(list[i].sentDate);
				key = crypto.emailAddress + '_' + type + '_' + date.getTime() + '_' + list[i].id;
			} else {
				key = crypto.emailAddress + '_' + type + '_' + list[i].id;
			}

			items.push({
				key: key,
				object: list[i]
			});
		}

		jsonDao.batch(items, function() {
			callback();
		});
	};

	/**
	 * Decrypts the stored items of a given type and returns them
	 * @param type [String] The type of item e.g. 'email'
	 * @param offset [Number] The offset of items to fetch (0 is the last stored item)
	 * @param num [Number] The number of items to fetch (null means fetch all)
	 */
	this.listItems = function(type, offset, num, callback) {

		// fetch all items of a certain type from the data-store
		jsonDao.list(crypto.emailAddress + '_' + type, offset, num, function(encryptedList) {

			// decrypt list
			crypto.decryptListForUser(encryptedList, null, function(err, decryptedList) {
				callback(err, decryptedList);
			});
		});
	};

	/**
	 * Clear the whole device data-store
	 */
	this.clear = function(callback) {
		jsonDao.clear(callback);
	};

};