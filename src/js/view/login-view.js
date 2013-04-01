(function() {
	'use strict';

	app.view.LoginView = Backbone.View.extend({

		initialize: function(args) {
			this.template = _.template(app.util.tpl.get('login'));
			this.dao = args.dao;
		},

		render: function(eventName) {
			var self = this,
				page = $(this.el);

			page.html(this.template());
			page.attr('data-theme', 'a');

			page.find('#loginBtn').on('vmousedown', function() {
				self.login();
			});

			return this;
		},

		login: function() {
			var page = $(this.el),
				userId = page.find('#userId').val(),
				password = page.find('#password').val();

			var account = new app.model.Account({
				emailAddress: userId,
				symKeySize: app.config.symKeySize,
				symIvSize: app.config.symIvSize
			});

			// show loading msg during init
			$.mobile.loading('show', {
				text: 'Unlocking...',
				textVisible: true,
				theme: 'c'
			});
			this.dao.init(account, password, function() {
				$.mobile.loading('hide');
				window.location = '#accounts/' + account.get('emailAddress') + '/folders';
			});
		}
	});

}());