(function() {
	'use strict';

	app.view.MessageListItemView = Backbone.View.extend({

		tagName: "li",

		initialize: function() {
			this.template = _.template(app.util.tpl.get('messagelistitem'));
		},

		render: function(eventName) {
			var params = this.model.toJSON();
			params.account = this.options.account;
			params.folder = this.options.folder;
			params.id = encodeURIComponent(params.id);

			var util = new app.crypto.Util(window, null);
			var date = util.parseDate(params.sentDate);
			params.displayDate = date.getDate() + '.' + (date.getMonth() + 1) + '. ' + date.getHours() + ':' + date.getMinutes();

			$(this.el).html(this.template(params));
			return this;
		}
	});

}());