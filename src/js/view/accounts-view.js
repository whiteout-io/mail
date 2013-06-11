define(['jquery', 'underscore', 'backbone', 'js/app-config'], function($, _, Backbone, app) {
	'use strict';

	var AccountsView = Backbone.View.extend({

		initialize: function() {
			this.template = _.template(app.util.tpl.get('accounts'));
		},

		render: function() {
			$(this.el).html(this.template());
			return this;
		}
	});

	return AccountsView;
});