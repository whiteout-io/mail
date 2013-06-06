(function() {
	'use strict';

	var views = [
			'login',
			'compose',
			'folderlist',
			'messagelist',
			'messagelistitem',
			'read'
	];

	/**
	 * Load templates and start the application
	 */
	$(document).ready(function() {
		// are we running in native app or in browser?
		var isBrowser = false;
		if (document.URL.indexOf("http") === 0 || document.URL.indexOf("chrome") === 0) {
			isBrowser = true;
		}

		if (!isBrowser) {
			document.addEventListener("deviceready", onDeviceReady, false);
		} else {
			onDeviceReady();
		}

		function onDeviceReady() {
			console.log('Starting in Browser: ' + isBrowser);
			app.util.tpl.loadTemplates(views, startApp);
		}
	});

	function startApp() {
		// sandboxed ui in iframe
		var sandbox = document.getElementById('sandboxFrame').contentWindow;
		var controller = new app.Controller();

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

		// init controller
		controller.init(function() {
			// init sandbox ui
			sandbox.postMessage({
				cmd: 'init',
				args: app.util.tpl.templates
			}, '*');
		});
	}

}());