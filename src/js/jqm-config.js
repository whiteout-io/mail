define(['jquery'], function($) {
	'use strict';

	$(document).on('mobileinit', function() {
		console.log('mobileinit');
		$.mobile.ajaxEnabled = false;
		$.mobile.linkBindingEnabled = false;
		$.mobile.hashListeningEnabled = false;
		$.mobile.pushStateEnabled = false;
		$.mobile.defaultPageTransition = 'none';

		// Remove page from DOM when it's being replaced
		$(document).on('pagehide', 'div[data-role="page"]', function(event) {
			$(event.currentTarget).remove();
		});
	});

});