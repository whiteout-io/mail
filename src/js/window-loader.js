require(['../require-config'], function() {
	'use strict';

	// Start the main app logic.
	require(['jquery', 'js/app-controller', 'js/app-config'], function($, controller) {

		/**
		 * Load templates and start the application
		 */
		$(document).ready(function() {
			controller.init(function() {
				controller.start(startApp);
			});
		});

		function startApp() {
			// sandboxed ui in iframe
			var sandbox = document.getElementById('sandboxFrame').contentWindow;

			// set global listener for events from sandbox
			window.onmessage = function(e) {
				var cmd = e.data.cmd;
				var args = e.data.args;

				// handle the workload in the main window
				controller.execute(cmd, args, function(resArgs) {
					// send reponse to sandbox
					sandbox.postMessage({
						cmd: cmd,
						args: resArgs
					}, '*');
				});
			};

			// init sandbox ui
			sandbox.postMessage({
				cmd: 'init',
				args: app.util.tpl.templates
			}, '*');
		}

	});
});