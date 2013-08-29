define(['jquery', 'underscore', 'backbone', 'js/app-config'], function($, _, Backbone, app) {
	'use strict';

	var ReadView = Backbone.View.extend({

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
				self.model = resArgs.email;
				args.callback(self);
			});
		},

		render: function() {
			var params = this.model;
			params.account = this.account;
			params.folder = this.folder;
			params.id = encodeURIComponent(params.id);

			$(this.el).html(this.template(params));
			this.renderBody();

			// set download link for attachment button
			this.parseAttachments();

			return this;
		},

		parseAttachments: function() {
			var attachments = this.model.attachments;
			if (!attachments || attachments.length < 1) {
				// remove link if no attachments are present
				$(this.el).find('#attachmentItem').remove();
				return;
			}

			var attmt = attachments[0];
			var blob = new Blob([attmt.uint8Array], {
				type: attmt.contentType
			});
			var url = window.URL.createObjectURL(blob);

			// set download link
			$(this.el).find('#attachmentBtn').attr({
				href: url,
				download: attmt.fileName
			}).text(attmt.fileName);
		},

		renderBody: function(tryHtml) {
			var page = $(this.el),
				emailBody = this.model.body;

			if (!tryHtml && emailBody.indexOf('</') === -1) {
				// render text email
				page.find('#bodyItem').html('<textarea></textarea>');
				page.find('#bodyItem textarea').text(emailBody);

			} else if (tryHtml && emailBody.indexOf('</') !== -1) {
				// render html email inside a sandboxed iframe
				var iframe = page.find('#mailContentFrame');
				iframe.load(function() {
					// set listener for the answering call, which return the document height
					window.onmessage = function(e) {
						// resize
						var newheight = e.data;
						//var newwidth = iframeDoc.body.scrollWidth;
						iframe[0].height = (newheight) + 'px';
						//iframe[0].width = (newwidth) + 'px';
					};

					// send email body to content frame
					document.getElementById('mailContentFrame').contentWindow.postMessage(emailBody, '*');
				});
			}
		}

	});

	return ReadView;
});