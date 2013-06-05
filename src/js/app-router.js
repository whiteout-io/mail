(function() {
	'use strict';

	app.Router = Backbone.Router.extend({

		routes: {
			'': 'login',
			'compose/:userId': 'compose',
			'compose/:userId/folders/:folder': 'compose',
			'accounts/:userId/folders': 'folders',
			'accounts/:userId/folders/:folder': 'messagelist',
			'accounts/:userId/folders/:folder/read/:messageId': 'read',
			'accounts/:userId/folders/:folder/reply/:messageId': 'compose'
		},

		initialize: function() {},

		login: function() {
			var loginView = new app.view.LoginView();
			this.changePage(loginView);
		},

		compose: function(userId, folder, messageId) {
			var self = this,
				composeView;

			composeView = new app.view.ComposeView({
				account: userId,
				folder: folder,
				messageId: (messageId) ? decodeURIComponent(messageId) : null,
				callback: function(view) {
					self.changePage(view);
				}
			});
		},

		folders: function(userId) {
			var folderListView = new app.view.FolderListView({
				account: userId
			});
			this.changePage(folderListView);
		},

		messagelist: function(userId, folder) {
			var self = this;
			var messageListView = new app.view.MessageListView({
				account: userId,
				folder: folder
			});
			self.changePage(messageListView);
			messageListView.loadItems();
		},

		read: function(userId, folder, messageId) {
			var readView = new app.view.ReadView({
				folder: folder,
				messageId: decodeURIComponent(messageId)
			});
			this.changePage(readView);
			readView.renderBody(true);
		},

		changePage: function(page) {
			// render the page and append it to the DOM
			var pageEl = $(page.el);
			pageEl.attr('data-role', 'page');
			page.render();
			$('body').append(pageEl);

			// change page for link buttons on vmousedown instead of waiting on vmouseup
			pageEl.on('vmousedown', 'a[data-role="button"]', function(e) {
				e.preventDefault();
				var href = $(e.currentTarget).attr('href');
				window.location = href;
			});

			$.mobile.changePage(pageEl, {
				changeHash: false,
				reverse: false
			});
		}

	});

}());