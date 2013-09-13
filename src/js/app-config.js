define([], function() {
	'use strict';

	/**
	 * Create the application namespace
	 */
	var app = {
		util: {}
	};

	/**
	 * Global app configurations
	 */
	app.config = {
		cloudUrl: 'https://storage.whiteout.io',
		symKeySize: 128,
		symIvSize: 128,
		asymKeySize: 1024,
		workerPath: 'js'
	};

	app.string = {
		signature: 'Sent securely from whiteout mail'
	};

	return app;
});