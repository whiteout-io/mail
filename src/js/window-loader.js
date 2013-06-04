(function() {
	'use strict';

	var emailDao; // local variable for main DAO

	/**
	 * The Template Loader. Used to asynchronously load templates located in separate .html files
	 */
	app.util.tpl = {

		// Hash of preloaded templates for the app
		templates: {},

		// Recursively pre-load all the templates for the app.
		loadTemplates: function(names, callback) {
			var that = this;

			var loadTemplate = function(index) {
				var name = names[index];
				console.log('Loading template: ' + name);
				$.get('tpl/' + name + '.html', function(data) {
					that.templates[name] = data;
					index++;
					if (index < names.length) {
						loadTemplate(index);
					} else {
						callback();
					}
				});
			};

			loadTemplate(0);
		},

		// Get template by name from hash of preloaded templates
		get: function(name) {
			return this.templates[name];
		}

	};

	/**
	 * Load templates and start the application
	 */
	$(document).ready(function() {
		// are we running in native app or in browser?
		var isBrowser = false;
		if (document.URL.indexOf("http") === 0 || document.URL.indexOf("chrome") === 0) {
			isBrowser = true;
		}

		if (!isBrowser) {
			document.addEventListener("deviceready", onDeviceReady, false);
		} else {
			onDeviceReady();
		}

		function onDeviceReady() {
			console.log('Starting in Browser: ' + isBrowser);
			app.util.tpl.loadTemplates([
					'login',
					'compose',
					'folderlist',
					'messagelist',
					'messagelistitem',
					'read'
			], startApp);
		}
	});

	function startApp() {
		// init email dao and dependencies
		initDAO();

		// sandboxed ui in iframe
		var sandbox = document.getElementById('sandboxFrame').contentWindow;

		// set listener for events from sandbox
		window.onmessage = function(e) {
			var cmd = e.data.cmd;
			var args = e.data.args;

			if (cmd === 'login') {
				// login user
				login(args.userId, args.password, function(err) {
					sandbox.postMessage({
						cmd: 'login',
						args: {
							err: err
						}
					}, '*');
				});
			}
		};

		// init sandbox ui
		sandbox.postMessage({
			cmd: 'init',
			args: app.util.tpl.templates
		}, '*');
	}

	function initDAO() {
		var util = new cryptoLib.Util(window, uuid);
		var crypto = new app.crypto.Crypto(window, util);
		var cloudstorage = new app.dao.CloudStorage(window, $);
		var jsonDao = new app.dao.LawnchairDAO(Lawnchair);
		var devicestorage = new app.dao.DeviceStorage(util, crypto, jsonDao, null);
		var keychain = new app.dao.KeychainDAO(jsonDao, cloudstorage);
		emailDao = new app.dao.EmailDAO(jsonDao, crypto, devicestorage, cloudstorage, util, keychain);
	}

	function login(userId, password, callback) {
		var account = new app.model.Account({
			emailAddress: userId,
			symKeySize: app.config.symKeySize,
			symIvSize: app.config.symIvSize,
			asymKeySize: app.config.asymKeySize
		});

		emailDao.init(account, password, callback);
	}

}());