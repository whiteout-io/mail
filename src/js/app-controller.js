/**
 * The main application controller
 */
app.Controller = function() {
	'use strict';

	var emailDao; // local variable for the main email data access object

	/**
	 * Initializes modules through dependecy injection
	 */
	this.init = function(callback) {
		var util = new cryptoLib.Util(window, uuid);
		var crypto = new app.crypto.Crypto(window, util);
		var cloudstorage = new app.dao.CloudStorage(window, $);
		var jsonDao = new app.dao.LawnchairDAO(Lawnchair);
		var devicestorage = new app.dao.DeviceStorage(util, crypto, jsonDao, null);
		var keychain = new app.dao.KeychainDAO(jsonDao, cloudstorage);
		emailDao = new app.dao.EmailDAO(jsonDao, crypto, devicestorage, cloudstorage, util, keychain);

		callback();
	};

	/**
	 * Executes a number of commands
	 */
	this.execute = function(cmd, args, callback) {
		if (cmd === 'login') {
			// login user
			login(args.userId, args.password, function(err) {
				callback({
					err: err
				});
			});

		} else if (cmd === 'syncEmails') {
			// list emails from folder
			emailDao.syncFromCloud(args.folder, function(err) {
				callback({
					err: err
				});
			});

		} else if (cmd === 'listEmails') {
			// list emails from folder
			emailDao.listItems(args.folder, args.offset, args.num, function(err, collection) {
				callback({
					err: err,
					collection: collection.toJSON()
				});
			});

		} else if (cmd === 'getEmail') {
			// list emails from folder
			var mail = emailDao.getItem(args.folder, args.messageId);
			callback({
				err: null,
				email: mail.toJSON()
			});

		} else if (cmd === 'sendEmail') {
			// list emails from folder
			sendEmail(args.email, function(err) {
				callback({
					err: err
				});
			});

		} else {
			// error: invalid message from sandbox
			callback({
				err: {
					errMsg: 'Invalid message posted from sandbox!'
				}
			});
		}
	};

	//
	// Helper methods
	//

	function login(userId, password, callback) {
		var account = new app.model.Account({
			emailAddress: userId,
			symKeySize: app.config.symKeySize,
			symIvSize: app.config.symIvSize,
			asymKeySize: app.config.asymKeySize
		});
		emailDao.init(account, password, callback);
	}

	function sendEmail(email, callback) {
		var em = new app.model.Email(email);
		emailDao.sendEmail(em, callback);
	}

};