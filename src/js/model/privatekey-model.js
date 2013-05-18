(function() {
	'use strict';

	app.model.PrivateKey = Backbone.Model.extend({

		defaults: {
			_id: null,
			userId: null,
			encryptedKey: null,
			iv: null
		},

		initialize: function() {}

	});

	app.model.PrivateKeyCollection = Backbone.Collection.extend({

		model: app.model.PrivateKey

	});

}());