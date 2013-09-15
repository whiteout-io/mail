define([], function() {
	'use strict';

	/**
	 * Create the application namespace
	 */
	var app = {};

	/**
	 * Global app configurations
	 */
	app.config = {
		cloudUrl: 'https://storage.whiteout.io',
		symKeySize: 128,
		symIvSize: 128,
		asymKeySize: 1024,
		workerPath: 'js',
		gmail: {
			clientId: '440907777130.apps.googleusercontent.com',
			imap: {
				secure: true,
				port: 993,
				host: 'imap.gmail.com'
			},
			smtp: {
				secure: true,
				port: 465,
				host: 'smtp.gmail.com'
			}
		}
	};

	/**
	 * Strings are maintained here
	 */
	app.string = {
		subject: '[whiteout] Encrypted message',
		message: 'this is a private conversation. To read my encrypted message below, simply install Whiteout Mail for Chrome. The app is really easy to use and automatically encrypts sent emails, so that only the two of us can read them: https://chrome.google.com/webstore/detail/whiteout-mail/jjgghafhamholjigjoghcfcekhkonijg',
		cryptPrefix: '-----BEGIN ENCRYPTED MESSAGE-----',
		cryptSuffix: '-----END ENCRYPTED MESSAGE-----',
		signature: 'Sent securely from whiteout mail',
		webSite: 'http://whiteout.io'
	};

	return app;
});