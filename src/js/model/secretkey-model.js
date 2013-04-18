(function() {
	'use strict';

	app.model.SecretKey = Backbone.Model.extend({

		defaults: {
			_id: null,
			userId: null,
			encryptedKey: null,
			keyIV: null
		},

		initialize: function() {}

	});

	app.model.SecretKeyCollection = Backbone.Collection.extend({

		model: app.model.SecretKey,

		findByName: function(key) {}

	});

}());