define(['backbone', 'js/app-config'], function(Backbone, app) {
	'use strict';

	app.model.PublicKey = Backbone.Model.extend({

		defaults: {
			_id: null,
			userId: null,
			publicKey: null
		},

		initialize: function() {}

	});

	app.model.PublicKeyCollection = Backbone.Collection.extend({

		model: app.model.PublicKey

	});

});