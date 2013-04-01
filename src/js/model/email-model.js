(function() {
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

		initialize: function() {
			// decode body
			try {
				var decodedBody = window.atob(this.get('body'));
				this.set('body', decodedBody);
			} catch (ex) {
				console.log(ex);
			}
		}

	});

	app.model.EmailCollection = Backbone.Collection.extend({

		model: app.model.Email,

		findByName: function(key) {}

	});

}());