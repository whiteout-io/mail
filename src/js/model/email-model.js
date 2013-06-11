define(['backbone', 'js/app-config'], function(Backbone, app) {
	'use strict';

	app.model.Email = Backbone.Model.extend({

		defaults: {
			id: null,
			from: null,
			to: [],
			cc: [],
			bcc: [],
			subject: null,
			body: null,
			sentDate: null
		},

		initialize: function() {}

	});

	app.model.EmailCollection = Backbone.Collection.extend({

		model: app.model.Email

	});

});