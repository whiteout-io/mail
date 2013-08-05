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

		startTests();
	});
});

function startTests() {
	require(['test/unit/forge-test',
		'test/unit/aes-test',
		'test/unit/rsa-test',
		'test/unit/lawnchair-dao-test',
		'test/unit/keychain-dao-test',
		'test/unit/crypto-test',
		'test/unit/devicestorage-dao-test',
		'test/unit/email-dao-test'
	], function() {
		//Tests loaded, run tests
		QUnit.start();
	});
}