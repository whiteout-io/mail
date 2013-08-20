define(['jquery', 'underscore', 'backbone', 'js/app-config'], function($, _, Backbone, app) {
	'use strict';

	var FolderListItemView = Backbone.View.extend({

		tagName: "li",

		initialize: function() {
			this.template = _.template(app.util.tpl.get('folderlistitem'));
		},

		render: function() {
			var params = this.model;
			params.account = this.options.account;

			$(this.el).html(this.template(params));
			return this;
		}
	});

	return FolderListItemView;
});