'use strict';

app.model.Folder = Backbone.Model.extend({
	
	defaults: {
		name: null,
		items: null
	},

    initialize: function () {
    }

});

app.model.FolderCollection = Backbone.Collection.extend({

    model: app.model.Folder,

    findByName: function (key) {
    }

});