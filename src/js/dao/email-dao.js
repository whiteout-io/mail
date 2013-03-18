'use strict';

/**
 * A high-level Data-Access Api for handling Email synchronization
 * between the cloud service and the device's local storage
 */
app.dao.EmailDAO = function(_, crypto, devicestorage, cloudstorage) {
	
	/**
	 * Inits all dependencies
	 */
	this.init = function(account, password, callback) {
		this.account = account;
		
		// sync user's cloud key with local storage
		cloudstorage.getUserSecretKey(account.get('emailAddress'), function(err) {
			if (err) {
				alert(err.status);
				return;
			}
			// init crypto
			initCrypto();
			
		}, function() {
			// replaced local key with cloud key... whipe local storage
			devicestorage.clear(function() {
				initCrypto();
			});
		});
		
		function initCrypto() {			
			crypto.init(account.get('emailAddress'), password, account.get('symKeySize'), account.get('symIvSize'), function() {
				callback();
			});
		}
	};
	
	/**
	 * Fetch an email with the following id
	 */
	this.getItem = function(folderName, itemId) {
		var folder = this.account.get('folders').where({name: folderName})[0];				
		var mail = _.find(folder.get('items').models, function(email) {
			return email.id+'' === itemId+'';
		});		
		return mail;
	};
	
	/**
	 * Fetch a list of emails from the device's local storage
	 * @param offset [Number] The offset of items to fetch (0 is the last stored item)
	 * @param num [Number] The number of items to fetch (null means fetch all)
	 */
	this.listItems = function(folderName, offset, num, callback) {
		var collection, folder, self = this;
		
		// check if items are in memory already (account.folders model)
		folder = this.account.get('folders').where({name: folderName})[0];
		
		if (!folder) {			
			// get items from storage
			devicestorage.listItems('email_' + folderName ,offset ,num, function(decryptedList) {
				// parse to backbone model collection
				collection = new app.model.EmailCollection(decryptedList);

				// cache collection in folder memory
				if (decryptedList.length > 0) {
					folder = new app.model.Folder({name: folderName});
					folder.set('items', collection);
					self.account.get('folders').add(folder);
				}			

				callback(collection);
			});
			
		} else {
			// read items from memory
			collection = folder.get('items');
			callback(collection);
		}
	};
	
	/**
	 * Synchronize a folder's items from the cloud to the device-storage
	 * @param folderName [String] The name of the folder e.g. 'inbox'
	 */
	this.syncFromCloud = function(folderName, callback) {
		var folder, self = this;
		
		cloudstorage.listEncryptedItems('email', this.account.get('emailAddress'), folderName, function(res) {
			if (res.status) {
				callback(res);	// error
				return;
			}
			
			// TODO: remove old folder items from devicestorage
						
			// persist encrypted list in device storage
			devicestorage.storeEcryptedList(res, 'email_' + folderName, function() {
				// remove cached folder in account model
				folder = self.account.get('folders').where({name: folderName})[0];					
				if (folder) {
					self.account.get('folders').remove(folder);
				}				
				callback();
			});			
		});
	};
	
};