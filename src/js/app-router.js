'use strict';

var AppRouter = Backbone.Router.extend({

	routes:{
		'': 'login',
		'compose': 'compose',
		'accounts/:userId/folders': 'folders',
		'accounts/:userId/folders/:folder': 'messagelist',
		'accounts/:userId/folders/:folder/read/:messageId': 'read'
	},

	initialize: function () {
		// handle back click
		var self = this;
		$(document).on('vmousedown', '#backBtn', function(e) {
			e.preventDefault();
			self.back = true;
			window.history.back();
		});
		this.firstPage = true;
	},
	
	login: function() {
		// init email dao and dependencies
		var util = new app.crypto.Util(window, null);
		var jsonDao = new app.dao.LawnchairDAO(window);
		var crypto = new app.crypto.Crypto(window, util);
		var cloudstorage = new app.dao.CloudStorage(window, $);
		var devicestorage = new app.dao.DeviceStorage(crypto, jsonDao, null);
		this.emailDao = new app.dao.EmailDAO(_, crypto, devicestorage, cloudstorage);
	
		var loginView = new app.view.LoginView({dao: this.emailDao});
		this.changePage(loginView);
	},
	
	compose: function() {
		// $.mobile.defaultPageTransition = 'slideup';
		var composeView = new app.view.ComposeView();
		this.changePage(composeView);
		// $.mobile.defaultPageTransition = 'slideup';
	},
	
	folders: function(userId) {
		var folderListView = new app.view.FolderListView({account: userId});
		this.changePage(folderListView);	
	},
	
	messagelist: function(userId, folder) {
		var self = this;		
		var messageListView = new app.view.MessageListView({account: userId, folder: folder, dao: this.emailDao});
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
		readView.renderBody();
	},

	changePage: function (page) {
		// render the page and append it to the DOM
		$(page.el).attr('data-role', 'page');
		page.render();
		$('body').append($(page.el));
		
		// change to the page using jQM transitions
		var transition = $.mobile.defaultPageTransition;
		// We don't want to slide the first page
		if (this.firstPage) {
			transition = 'none';
			this.firstPage = false;
		}
		$.mobile.changePage($(page.el), {changeHash:false, transition:transition, reverse:this.back});
		
		// change transition direction back after back button was pushed
		this.back = false;
		// $.mobile.defaultPageTransition = 'fade';
	}

});