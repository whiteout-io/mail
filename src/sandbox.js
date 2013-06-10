(function() {
	'use strict';

	var router,
		mainWindow,
		mainWindowOrigin;

	/**
	 * Load templates and start the application
	 */
	$(document).ready(function() {
		console.log('sandbox loaded');

		// set listener for event from main window
		window.onmessage = function(e) {
			if (e.data.cmd === 'init') {
				app.util.tpl.templates = e.data.args;

				// remember references to main window
				mainWindow = e.source;
				mainWindowOrigin = e.origin;

				// start backone.js router
				router = new app.Router();
				Backbone.history.start();
			}
		};
	});

	/**
	 * Helper method to ease message posting between sandbox and main window
	 */
	app.util.postMessage = function(cmd, args, callback) {
		// set listender
		window.onmessage = function(e) {
			if (e.data.cmd === cmd) {
				callback(e.data.args);
			}
		};

		// send message to main window
		mainWindow.postMessage({
			cmd: cmd,
			args: args
		}, mainWindowOrigin);
	};

}());