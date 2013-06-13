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

	/**
	 * The Template Loader. Used to asynchronously load templates located in separate .html files
	 */
	app.util.tpl = {
		templates: {},

		get: function(name) {
			return this.templates[name];
		}
	};

	return app;
});