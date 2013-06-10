/**
 * The main application controller
 */
define(['js/dao/email-dao'], function(emailDao) {
	'use strict';

	var self = {};

	/**
	 * Initializes modules through dependecy injection
	 */
	self.init = function(callback) {
		// var crypto = new app.crypto.Crypto(window, util);
		// var cloudstorage = new app.dao.CloudStorage(window, $);
		// var jsonDao = new app.dao.LawnchairDAO(Lawnchair);
		// var devicestorage = new app.dao.DeviceStorage(util, crypto, jsonDao, null);
		// var keychain = new app.dao.KeychainDAO(jsonDao, cloudstorage);
		// emailDao = new app.dao.EmailDAO(jsonDao, crypto, devicestorage, cloudstorage, util, keychain);
		callback();
	};

	/**
	 * Start the application by loading the view templates
	 */
	self.start = function(callback) {
		// the views to load
		var views = [
				'login',
				'compose',
				'folderlist',
				'messagelist',
				'messagelistitem',
				'read'
		];

		// are we running in native app or in browser?
		if (document.URL.indexOf("http") === 0 || document.URL.indexOf("chrome") === 0) {
			console.log('Assuming Browser environment...');
			onDeviceReady();
		} else {
			console.log('Assuming Cordova environment...');
			document.addEventListener("deviceready", onDeviceReady, false);
		}

		function onDeviceReady() {
			console.log('Starting app.');
			app.util.tpl.loadTemplates(views, callback);
		}
	};

	/**
	 * Executes a number of commands
	 */
	self.execute = function(cmd, args, callback) {
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
			emailDao.listItems(args.folder, args.offset, args.num, function(err, emails) {
				callback({
					err: err,
					emails: emails
				});
			});

		} else if (cmd === 'getEmail') {
			// list emails from folder
			var mail = emailDao.getItem(args.folder, args.messageId);
			callback({
				err: null,
				email: mail
			});

		} else if (cmd === 'sendEmail') {
			// list emails from folder
			emailDao.sendEmail(args.email, function(err) {
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

	return self;
});