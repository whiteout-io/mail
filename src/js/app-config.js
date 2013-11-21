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
		cloudUrl: 'https://keys.whiteout.io',
		symKeySize: 128,
		symIvSize: 128,
		asymKeySize: 2048,
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
		},
		checkOutboxInterval: 30000,
		iconPath: '/img/icon.png',
		verificationUrl: '/verify/'
	};

	/**
	 * Strings are maintained here
	 */
	app.string = {
		subjectPrefix: '[whiteout] ',
		invitationSubject: 'Invitation to a private conversation',
		invitationMessage: 'I would like to invite you to a private conversation. To read my encrypted messages, simply install Whiteout Mail for Chrome. The app is really easy to use and automatically encrypts sent emails, so that only the two of us can read them: https://chrome.google.com/webstore/detail/jjgghafhamholjigjoghcfcekhkonijg',
		message: 'this is a private conversation. To read my encrypted message below, simply install Whiteout Mail for Chrome. The app is really easy to use and automatically encrypts sent emails, so that only the two of us can read them: https://chrome.google.com/webstore/detail/jjgghafhamholjigjoghcfcekhkonijg',
		cryptPrefix: '-----BEGIN PGP MESSAGE-----',
		cryptSuffix: '-----END PGP MESSAGE-----',
		signature: 'Sent securely from whiteout mail',
		webSite: 'http://whiteout.io',
		verificationSubject: 'New public key uploaded'
	};

	return app;
});