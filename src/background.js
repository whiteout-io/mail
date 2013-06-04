'use strict';

chrome.app.runtime.onLaunched.addListener(function() {
	chrome.app.window.create('index.html', {
		'bounds': {
			'width': 805,
			'height': 620
		}
	});
});