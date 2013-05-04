(function() {
	'use strict';

	app.view.ComposeView = Backbone.View.extend({

		initialize: function(args) {
			this.template = _.template(app.util.tpl.get('compose'));
			this.dao = args.dao;
			if (args.folder && args.messageId) {
				// fetch reply-to email model
				this.replyTo = args.dao.getItem(args.folder, args.messageId);
			}
		},

		render: function(eventName) {
			var self = this,
				page = $(this.el);

			page.html(this.template());

			page.find('#sendBtn').on('vmousedown', function() {
				self.sendEmail();
			});

			return this;
		},

		/**
		 * Send an email via the email dao
		 */
		sendEmail: function() {
			var self = this,
				page = $(this.el);

			$.mobile.loading('show', {
				text: 'sending...',
				textVisible: true
			});

			// validate recipients
			var to = page.find('#toInput').val().replace(/\s/g, '').split(/[,;]/);
			if (!to || to.length < 1) {
				window.alert('Seperate recipients with a comma!');
				return;
			}

			var signature = '\n\nSent with whiteout.io - get your mailbox for end-2-end encrypted messaging!\nhttps://mail.whiteout.io';

			var email = new app.model.Email({
				from: self.dao.account.get('emailAddress'),
				to: to,
				subject: page.find('#subjectInput').val(),
				body: page.find('#bodyTextarea').val() + signature
			});

			self.dao.sendEmail(email, function(err) {
				$.mobile.loading('hide');
				if (err) {
					window.alert(JSON.stringify(err));
					return;
				}

				//window.history.back();
			});
		}

	});

}());