(function() {
	'use strict';

	app.Router = Backbone.Router.extend({

		routes: {
			'': 'login',
			'compose': 'compose',
			'accounts/:userId/folders': 'folders',
			'accounts/:userId/folders/:folder': 'messagelist',
			'accounts/:userId/folders/:folder/read/:messageId': 'read',
			'accounts/:userId/folders/:folder/reply/:messageId': 'compose'
		},

		initialize: function() {},

		login: function() {
			// init email dao and dependencies
			var util = new cryptoLib.Util(window, uuid);
			var crypto = new app.crypto.Crypto(window, util);
			var cloudstorage = new app.dao.CloudStorage(window, $);
			var jsonDao = new app.dao.LawnchairDAO(Lawnchair);
			var devicestorage = new app.dao.DeviceStorage(util, crypto, jsonDao, null);
			var keychain = new app.dao.KeychainDAO(jsonDao, cloudstorage);
			this.emailDao = new app.dao.EmailDAO(jsonDao, crypto, devicestorage, cloudstorage, util, keychain);

			var loginView = new app.view.LoginView({
				dao: this.emailDao
			});
			this.changePage(loginView);
		},

		compose: function(userId, folder, messageId) {
			var composeView = new app.view.ComposeView({
				folder: folder,
				messageId: decodeURIComponent(messageId),
				dao: this.emailDao
			});
			this.changePage(composeView);
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
				folder: folder,
				dao: this.emailDao
			});
			self.changePage(messageListView);
			messageListView.loadItems();
		},

		read: function(userId, folder, messageId) {
			var readView = new app.view.ReadView({
				folder: folder,
				messageId: decodeURIComponent(messageId),
				dao: this.emailDao
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

			// handle back click
			pageEl.on('vmousedown', '#backBtn', function(e) {
				e.preventDefault();
				window.history.back();
			});

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