(function() {
	'use strict';

	console.log('Mail content frame loaded');

	// set listender
	window.onmessage = function(e) {
		console.log('Mail content data loaded');
		// insert html into sandboxed iframe
		document.getElementById('mailContentDiv').innerHTML = e.data;

		// get new height and post message back to parent frame
		//var newHeight = document.body.scrollHeight;
		//e.source.postMessage(newHeight, e.origin);
	};

}());