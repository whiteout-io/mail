var app; // container for the application namespace

(function() {
	'use strict';

	/**
	 * Create the application namespace
	 */
	app = {
		model: {},
		view: {},
		dao: {},
		crypto: {},
		util: {}
	};

	/**
	 * Global app configurations
	 */
	app.config = {
		cloudUrl: 'https://whiteout-io.appspot.com',
		symKeySize: 128,
		symIvSize: 104,
		asymKeySize: 2048,
		workerPath: 'js'
	};

}());