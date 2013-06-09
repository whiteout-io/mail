(function() {
	'use strict';

	app.view.LoginView = Backbone.View.extend({

		initialize: function() {
			this.template = _.template(app.util.tpl.get('login'));
		},

		render: function() {
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

			// show loading msg during init
			$.mobile.loading('show', {
				text: 'Unlocking...',
				textVisible: true,
				theme: 'c'
			});

			// post message to main window
			app.util.postMessage('login', {
				userId: userId + '@mail.whiteout.io',
				password: password
			}, function(resArgs) {
				var err = resArgs.err;

				$.mobile.loading('hide');
				if (err) {
					window.alert(err.errMsg);
					return;
				}

				window.location = '#accounts/' + userId + '/folders';
			});
		}
	});

}());