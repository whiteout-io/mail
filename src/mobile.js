(function() {
	'use strict';

	var controller,
		router;

	/**
	 * Load templates and start the application
	 */
	$(document).ready(function() {
		controller = new app.Controller();
		controller.init(function() {
			controller.start(startApp);
		});
	});

	function startApp() {
		// start backone.js router
		router = new app.Router();
		Backbone.history.start();
	}

	/**
	 * Helper method shim to ease message posting between sandbox and main window
	 */
	app.util.postMessage = function(cmd, args, callback) {
		// handle the workload in the main window
		controller.execute(cmd, args, callback);
	};

}());