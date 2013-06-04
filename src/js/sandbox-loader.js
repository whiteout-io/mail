(function() {
	'use strict';

	/**
	 * The Template Loader. Used to asynchronously load templates located in separate .html files
	 */
	app.util.tpl = {

		// Hash of preloaded templates for the app
		templates: {},

		// Get template by name from hash of preloaded templates
		get: function(name) {
			return this.templates[name];
		}

	};

	/**
	 * Load templates and start the application
	 */
	$(document).ready(function() {
		console.log('sandbox loaded');

		window.onmessage = function(e) {
			app.util.tpl.templates = e.data;

			// remember references to main window
			window.mainWindow = e.source;
			window.mainWindowOrigin = e.origin;

			var router = new app.Router();
			Backbone.history.start();
		};
	});

}());