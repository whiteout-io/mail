define(['jquery', 'underscore', 'backbone', 'js/app-config',
	'js/view/folderlistitem-view'
], function($, _, Backbone, app, FolderListItemView) {
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
			var self = this,
				page = $(this.el),
				list = page.find('#folder-list'),
				listItemArgs;

			// show loading msg during init
			$.mobile.loading('show', {
				text: 'Fetching folders...',
				textVisible: true,
				theme: 'c'
			});

			// post message to main window
			app.util.postMessage('listFolders', {}, function(resArgs) {
				var err = resArgs.err;

				if (err || !resArgs.folders) {
					$.mobile.loading('hide');
					window.alert('Error listing folders: ' + err.errMsg);
					return;
				}

				// clear list
				list.html('');

				// append folder to list
				resArgs.folders.forEach(function(folder) {
					listItemArgs = {
						account: self.options.account,
						model: folder
					};
					list.append(new FolderListItemView(listItemArgs).render().el);
				});

				// refresh list view
				list.listview('refresh');
				$.mobile.loading('hide');
			});
		}
	});

	return FolderListView;
});