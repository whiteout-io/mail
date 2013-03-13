'use strict';

app.view.ReadView = Backbone.View.extend({

    initialize: function(args) {
        this.template = _.template(app.util.tpl.get('read'));
		this.model = args.dao.getItem(args.folder, args.messageId);
    },

    render: function(eventName) {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },

	renderBody: function() {
		var emailBody = this.model.get('body'),
			iframe = $('#idMailContent'),
			iframeDoc = iframe[0].contentDocument || iframe[0].contentWindow.document;

		iframe.load(function() {
			// resize
			var newheight = iframeDoc.body.scrollHeight;
			var newwidth = iframeDoc.body.scrollWidth;
			iframe[0].height = (newheight) + 'px';
		});
		
		iframeDoc.write(emailBody);
		iframeDoc.close();
	}
	
});