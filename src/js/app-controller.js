/**
 * The main application controller
 */
define(['jquery', 'ImapClient', 'SmtpClient', 'js/dao/email-dao', 'js/dao/keychain-dao',
	'js/dao/cloudstorage-dao', 'js/app-config', 'cordova'
], function($, ImapClient, SmtpClient, EmailDAO, KeychainDAO, cloudstorage, app) {
	'use strict';

	var self = {},
		emailDao;

	/**
	 * Start the application by loading the view templates
	 */
	self.start = function(callback) {
		// the views to load
		var views = ['login', 'compose', 'folderlist', 'messagelist',
			'messagelistitem', 'read'
		];

		// are we running in native app or in browser?
		if (document.URL.indexOf("http") === 0 || document.URL.indexOf("app") === 0 || document.URL.indexOf("chrome") === 0) {
			console.log('Assuming Browser environment...');
			onDeviceReady();
		} else {
			console.log('Assuming Cordova environment...');
			document.addEventListener("deviceready", onDeviceReady, false);
		}

		function onDeviceReady() {
			console.log('Starting app.');
			loadTemplates(views, callback);
		}
	};

	/**
	 * Executes a number of commands
	 */
	self.execute = function(cmd, args, callback) {
		if (cmd === 'login') {
			// login user
			fetchOAuthToken(args.userId, args.password, function(err) {
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

	function fetchOAuthToken(userId, password, callback) {
		// get OAuth Token from chrome
		chrome.identity.getAuthToken({
				'interactive': true
			},
			function(token) {
				login(userId, password, token, callback);
			}
		);
	}

	function login(userId, password, token, callback) {
		var auth, imapOptions, smtpOptions,
			keychain, imapClient, smtpClient;

		// create mail credentials objects for imap/smtp
		auth = {
			XOAuth2: {
				user: userId,
				clientId: '440907777130.apps.googleusercontent.com',
				accessToken: token
			}
		};
		imapOptions = {
			secure: true,
			port: 993,
			host: 'imap.gmail.com',
			auth: auth
		};
		smtpOptions = {
			secure: true,
			port: 465,
			host: 'smtp.gmail.com',
			auth: auth
		};

		// init objects and inject dependencies
		keychain = new KeychainDAO(cloudstorage);
		imapClient = new ImapClient(imapOptions);
		smtpClient = new SmtpClient(smtpOptions);
		emailDao = new EmailDAO(cloudstorage, keychain, imapClient, smtpClient);

		// init email dao
		var account = new app.model.Account({
			imapOptions: imapOptions,
			smtpOptions: smtpOptions,
			emailAddress: userId,
			symKeySize: app.config.symKeySize,
			symIvSize: app.config.symIvSize,
			asymKeySize: app.config.asymKeySize
		});
		emailDao.init(account, password, callback);
	}

	function loadTemplates(names, callback) {
		var loadTemplate = function(index) {
			var name = names[index];
			console.log('Loading template: ' + name);
			$.get('tpl/' + name + '.html', function(data) {
				app.util.tpl.templates[name] = data;
				index++;
				if (index < names.length) {
					loadTemplate(index);
				} else {
					callback();
				}
			});
		};
		loadTemplate(0);
	}

	return self;
});