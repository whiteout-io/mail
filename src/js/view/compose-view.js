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

			// prefill fields for reply
			if (this.replyTo) {
				self.fillFields();
			}

			page.find('#sendBtn').on('vmousedown', function() {
				self.sendEmail();
			});

			return this;
		},

		fillFields: function() {
			var page = $(this.el),
				re = this.replyTo,
				from = re.get('from')[0],
				subject = re.get('subject');

			// fill recipient field
			var replyToAddress = from.address;
			page.find('#toInput').val(replyToAddress);

			// fill subject
			subject = 'Re: ' + ((subject) ? subject.replace('Re: ', '') : '');
			page.find('#subjectInput').val(subject);

			// fill text body
			var body = '\n\n' + re.get('sentDate') + ' ' + from.name + ' <' + from.address + '>\n';
			var bodyRows = re.get('body').split('\n');
			var isHtml = false;
			_.each(bodyRows, function(row) {
				if (row.indexOf('</') !== -1) {
					isHtml = true;
				}
				body += (!isHtml) ? '> ' + row + '\n' : '';
			});
			page.find('#bodyTextarea').text(body);
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

			var signature = '\n\nSent with whiteout mail - get your free mailbox for end-2-end encrypted messaging!\nhttps://mail.whiteout.io';

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

				window.history.back();
			});
		}

	});

}());