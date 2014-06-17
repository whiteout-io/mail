'use strict';

require(['src/require-config'], function() {
	require.config({
		baseUrl: 'src/lib',
		paths: {
			'browsercrow': '../../../lib/browsercrow',
			'browsercrow-envelope': '../../../lib/browsercrow-envelope',
			'browsercrow-bodystructure': '../../../lib/browsercrow-bodystructure',
			'browsercrow-mimeparser': '../../../lib/browsercrow-mimeparser',
			'browsersmtp': '../../../lib/browsersmtp'
		}
	});

	// Start the main app logic.
	require(['js/app-config'], function(app) {
		window.Worker = undefined; // disable web workers since mocha doesn't support them

		app.config.workerPath = '../../src/js';
		//app.config.cloudUrl = 'http://localhost:8888';

		startTests();
	});
});

function startTests() {
	mocha.setup('bdd');

	require(
		[
			'../../email-dao-test'
		], function() {
			//Tests loaded, run tests
			mocha.run();
		}
	);
}