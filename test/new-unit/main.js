'use strict';

require(['../../src/require-config'], function() {
	require.config({
		baseUrl: '../../src/lib',
		paths: {
			angularMocks: '../../test/lib/angular-mocks'
		},
		shim: {
			angularMocks: {
				exports: 'angular.mock',
				deps: ['angular']
			}
		}
	});


	// Start the main app logic.
	require(['js/app-config'], function(app) {
		app.config.workerPath = '../../src/js';

		startTests();
	});
});

function startTests() {
	mocha.setup('bdd');

	require(
		[
			'test/new-unit/email-dao-test',
			'test/new-unit/email-sync-test',
			'test/new-unit/app-controller-test',
			'test/new-unit/pgp-test',
			'test/new-unit/rest-dao-test',
			'test/new-unit/publickey-dao-test',
			'test/new-unit/lawnchair-dao-test',
			'test/new-unit/keychain-dao-test',
			'test/new-unit/devicestorage-dao-test',
			'test/new-unit/dialog-ctrl-test',
			'test/new-unit/add-account-ctrl-test',
			'test/new-unit/account-ctrl-test',
			'test/new-unit/contacts-ctrl-test',
			'test/new-unit/login-existing-ctrl-test',
			'test/new-unit/login-initial-ctrl-test',
			'test/new-unit/login-new-device-ctrl-test',
			'test/new-unit/login-ctrl-test',
			'test/new-unit/read-ctrl-test',
			'test/new-unit/navigation-ctrl-test',
			'test/new-unit/mail-list-ctrl-test',
			'test/new-unit/write-ctrl-test',
			'test/new-unit/outbox-bo-test',
			'test/new-unit/invitation-dao-test',
			'test/new-unit/update-handler-test'
		], function() {
			//Tests loaded, run tests
			mocha.run();
		}
	);
}