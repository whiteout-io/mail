(function() {
	'use strict';

	app.view.AccountsView = Backbone.View.extend({

		initialize: function() {
			this.template = _.template(app.util.tpl.get('accounts'));
		},

		render: function(eventName) {
			$(this.el).html(this.template());
			return this;
		}
	});

}());