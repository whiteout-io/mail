define(['jquery', 'underscore', 'backbone', 'js/app-config'], function($, _, Backbone, app) {
	'use strict';

	var FolderListView = Backbone.View.extend({

		initialize: function() {
			this.template = _.template(app.util.tpl.get('folderlist'));
		},

		render: function() {
			var page = $(this.el);

			page.html(this.template(this.options));

			// change page for folder links on vmousedown instead of waiting on vmouseup
			page.on('vmousedown', 'li a', function(e) {
				e.preventDefault();
				var href = $(e.currentTarget).attr('href');
				window.location = href;
			});

			return this;
		},

		listFolder: function() {
			// var page = $(this.el);

			// show loading msg during init
			$.mobile.loading('show', {
				text: 'Fetching folders...',
				textVisible: true,
				theme: 'c'
			});

			// post message to main window
			app.util.postMessage('listFolders', {}, function(resArgs) {
				var err = resArgs.err;

				$.mobile.loading('hide');
				if (err) {
					window.alert(err.errMsg);
					return;
				}

				console.log(resArgs);
			});
		}
	});

	return FolderListView;
});