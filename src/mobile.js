require(['jquery', 'backbone', 'js/app-controller', 'js/app-router',
		'js/app-config'
], function($, Backbone, controller, Router, app) {
	'use strict';

	var router;

	/**
	 * Load templates and start the application
	 */
	$(document).ready(function() {
		controller.init(function() {
			controller.start(startApp);
		});
	});

	function startApp() {
		// start backone.js router
		router = new Router();
		Backbone.history.start();
	}

	/**
	 * Helper method shim to ease message posting between sandbox and main window
	 */
	app.util.postMessage = function(cmd, args, callback) {
		// handle the workload in the main window
		controller.execute(cmd, args, callback);
	};

});