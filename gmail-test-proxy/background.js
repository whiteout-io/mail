'use strict';

chrome.app.runtime.onLaunched.addListener(function() {
	chrome.app.window.create('foo.html', {
		'bounds': {
			'width': 1024,
			'height': 650
		}
	});
});