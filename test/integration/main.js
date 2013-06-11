'use strict';

require(['../../src/require-config'], function() {

	require.config({
		baseUrl: '../../src/lib'
	});

	// Start the main app logic.
	require(['js/app-config', 'cordova'], function(app) {
		// clear session storage of failed tests, so async order is correct after fail & refresh
		window.sessionStorage.clear();
		window.Worker = undefined;

		app.config.workerPath = '../../src/js';
		app.config.cloudUrl = 'http://localhost:8888';

		startTests();
	});
});

function startTests() {
	require([
			'test/integration/cloudstorage-dao-test'
	], function() {
		//Tests loaded, run tests
		QUnit.start();
	});
}