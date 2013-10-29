'use strict';

require(['../../src/require-config'], function() {
	require.config({
		baseUrl: '../../src/lib'
	});

	// Start the main app logic.
	require(['js/app-config', 'cordova'], function(app) {
		window.Worker = undefined; // disable web workers since mocha doesn't support them

		app.config.workerPath = '../../src/js';

		startTests();
	});
});

function startTests() {
	mocha.setup('bdd');

	require(
		[
			'test/new-unit/email-dao-test',
			'test/new-unit/app-controller-test',
			'test/new-unit/pgp-test',
			'test/new-unit/rest-dao-test',
			'test/new-unit/publickey-dao-test',
			'test/new-unit/lawnchair-dao-test',
			'test/new-unit/keychain-dao-test',
			'test/new-unit/devicestorage-dao-test'
		], function() {
			//Tests loaded, run tests
			mocha.run();
		}
	);
}