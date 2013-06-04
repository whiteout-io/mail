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

			// set listener for event from main window
			window.onmessage = function(e) {
				if (e.data.cmd === 'login') {
					var err = e.data.args.err;

					$.mobile.loading('hide');
					if (err) {
						window.alert(err.errMsg);
						return;
					}

					window.location = '#accounts/' + userId + '/folders';
				}
			};

			// send message to main window
			window.mainWindow.postMessage({
				cmd: 'login',
				args: {
					userId: userId,
					password: password
				}
			}, window.mainWindowOrigin);
		}
	});

}());