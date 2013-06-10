'use strict';

require(['../../src/require-config'], function() {

	require.config({
		baseUrl: '../../src/lib'
	});

	// Start the main app logic.
	require(['js/app-config'], function() {
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
			'test/unit/forge-test',
			'test/unit/aes-test'
	], function() {

		QUnit.start(); //Tests loaded, run tests
	});
}