define(['jquery', 'underscore', 'backbone', 'js/app-config',
		'js/view/messagelistitem-view'
], function($, _, Backbone, app, MessageListItemView) {
	'use strict';

	var MessageListView = Backbone.View.extend({

		initialize: function(args) {
			this.template = _.template(app.util.tpl.get('messagelist'));
			this.folder = args.folder;
		},

		render: function() {
			var self = this,
				page = $(this.el);

			page.html(this.template(this.options));

			page.find('#refreshBtn').on('vmousedown', function() {
				self.syncFolder();
			});

			return this;
		},

		/**
		 * Synchronize emails from the cloud
		 */
		syncFolder: function() {
			var self = this;

			$.mobile.loading('show', {
				text: 'Syncing...',
				textVisible: true
			});

			// post message to main window
			app.util.postMessage('syncEmails', {
				folder: self.folder
			}, function(resArgs) {
				var err = resArgs.err;

				$.mobile.loading('hide');

				// check for error
				if (err) {
					window.alert('Syncing failed!');
					return;
				}

				// read local storage and add to list view
				self.loadItems();
			});
		},

		/**
		 * Load items from local storage
		 */
		loadItems: function() {
			var self = this,
				page = $(this.el),
				list = page.find('#message-list'),
				listItemArgs, i, email;

			$.mobile.loading('show', {
				text: 'decrypting...',
				textVisible: true
			});

			// post message to main window
			app.util.postMessage('listEmails', {
				folder: self.folder,
				offset: 0,
				num: 10
			}, function(resArgs) {
				var err = resArgs.err;
				var emails = resArgs.emails;

				// check for error
				if (err) {
					$.mobile.loading('hide');
					window.alert('Loading items from storage failed!');
					return;
				}

				// clear list
				list.html('');

				// append items to list in reverse order so mails with the most recent date will be displayed first
				for (i = emails.length - 1; i >= 0; i--) {
					email = emails[i];
					listItemArgs = {
						account: self.options.account,
						folder: self.folder,
						model: email
					};
					list.append(new MessageListItemView(listItemArgs).render().el);
				}

				// refresh list view
				list.listview('refresh');
				$.mobile.loading('hide');
			});
		}

	});

	return MessageListView;
});