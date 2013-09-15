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
		signature: 'Sent securely from whiteout mail'
	};

	return app;
});