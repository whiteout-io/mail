'use strict';

// Mozilla bind polyfill because phantomjs is stupid
if (!Function.prototype.bind) {
	Function.prototype.bind = function(oThis) {
		if (typeof this !== "function") {
			// closest thing possible to the ECMAScript 5 internal IsCallable function
			throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
		}

		var aArgs = Array.prototype.slice.call(arguments, 1),
			fToBind = this,
			FNOP = function() {},
			fBound = function() {
				return fToBind.apply(this instanceof FNOP && oThis ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
			};

		FNOP.prototype = this.prototype;
		fBound.prototype = new FNOP();

		return fBound;
	};
}

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
	require(['js/app-config', 'axe'], function(app, axe) {
		app.config.workerPath = '../../src/js';

		// turn off logging in the test
		axe.removeAppender(axe.defaultAppender);

		startTests();
	});
});

function startTests() {
	mocha.setup('bdd');

	require(
		[
			'test/unit/oauth-test',
			'test/unit/auth-test',
			'test/unit/email-dao-test',
			'test/unit/app-controller-test',
			'test/unit/pgp-test',
			'test/unit/crypto-test',
			'test/unit/rest-dao-test',
			'test/unit/publickey-dao-test',
			'test/unit/privatekey-dao-test',
			'test/unit/lawnchair-dao-test',
			'test/unit/keychain-dao-test',
			'test/unit/devicestorage-dao-test',
			'test/unit/dialog-ctrl-test',
			'test/unit/add-account-ctrl-test',
			'test/unit/account-ctrl-test',
			'test/unit/set-passphrase-ctrl-test',
			'test/unit/contacts-ctrl-test',
			'test/unit/login-existing-ctrl-test',
			'test/unit/login-initial-ctrl-test',
			'test/unit/login-new-device-ctrl-test',
			'test/unit/login-privatekey-download-ctrl-test',
			'test/unit/login-set-credentials-ctrl-test',
			'test/unit/privatekey-upload-ctrl-test',
			'test/unit/login-ctrl-test',
			'test/unit/read-ctrl-test',
			'test/unit/navigation-ctrl-test',
			'test/unit/mail-list-ctrl-test',
			'test/unit/write-ctrl-test',
			'test/unit/outbox-bo-test',
			'test/unit/invitation-dao-test',
			'test/unit/update-handler-test'
		], function() {
			//Tests loaded, run tests
			mocha.run();
		}
	);
}