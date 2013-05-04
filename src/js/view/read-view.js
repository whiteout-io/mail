(function() {
	'use strict';

	app.view.ReadView = Backbone.View.extend({

		initialize: function(args) {
			this.template = _.template(app.util.tpl.get('read'));
			this.model = args.dao.getItem(args.folder, args.messageId);
		},

		render: function(eventName) {
			$(this.el).html(this.template(this.model.toJSON()));
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