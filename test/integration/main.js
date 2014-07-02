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
	require(['js/app-config', 'axe'], function(app, axe) {
		window.Worker = undefined; // disable web workers since mocha doesn't support them

		app.config.workerPath = '../../src/js';
		//app.config.cloudUrl = 'http://localhost:8888';

		axe.removeAppender(axe.defaultAppender);

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