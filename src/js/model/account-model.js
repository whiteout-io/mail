(function() {
	'use strict';

	app.model.Account = Backbone.Model.extend({

		defaults: {
			emailAddress: null,
			symKeySize: null,
			symIvSize: null,
			folders: null
		},

		initialize: function() {
			this.set('folders', new app.model.FolderCollection());
		}

	});

	app.model.AccountCollection = Backbone.Collection.extend({

		model: app.model.Account,

		findByName: function(key) {}

	});

}());