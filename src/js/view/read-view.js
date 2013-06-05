(function() {
	'use strict';

	app.view.ReadView = Backbone.View.extend({

		initialize: function(args) {
			var self = this;

			this.template = _.template(app.util.tpl.get('read'));
			this.account = args.account;
			this.folder = args.folder;

			app.util.postMessage('getEmail', {
				folder: args.folder,
				messageId: args.messageId
			}, function(resArgs) {
				var err = resArgs.err;
				if (err) {
					window.alert(JSON.stringify(err));
					return;
				}
				// set mail to reply to
				self.model = new app.model.Email(resArgs.email);
				args.callback(self);
			});
		},

		render: function() {
			var params = this.model.toJSON();
			params.account = this.account;
			params.folder = this.folder;
			params.id = encodeURIComponent(params.id);

			$(this.el).html(this.template(params));
			this.renderBody();

			return this;
		},

		renderBody: function(tryHtml) {
			var page = $(this.el),
				emailBody = this.model.get('body');

			if (!tryHtml && emailBody.indexOf('</') === -1) {
				// render text email
				page.find('#bodyItem').html('<textarea></textarea>');
				page.find('#bodyItem textarea').text(emailBody);

			} else if (tryHtml && emailBody.indexOf('</') !== -1) {
				// render html email inside a sandboxed iframe
				var iframe = page.find('#idMailContent'),
					iframeDoc = iframe[0].contentDocument || iframe[0].contentWindow.document;

				iframe.load(function() {
					// resize
					var newheight = iframeDoc.body.scrollHeight;
					var newwidth = iframeDoc.body.scrollWidth;
					iframe[0].height = (newheight) + 'px';
					iframe[0].width = (newwidth) + 'px';
				});

				iframeDoc.write(emailBody);
				iframeDoc.close();
			}
		}

	});

}());