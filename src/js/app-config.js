define([], function() {
	'use strict';

	/**
	 * Create the application namespace
	 */
	var app = {
		model: {},
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

	return app;
});