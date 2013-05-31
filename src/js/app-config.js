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
		cloudUrl: 'http://storage.whiteout.io',
		symKeySize: 128,
		symIvSize: 128,
		asymKeySize: 1024,
		workerPath: 'js'
	};

}());