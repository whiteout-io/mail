(function() {
	'use strict';

	app.view.FolderListView = Backbone.View.extend({

		initialize: function() {
			this.template = _.template(app.util.tpl.get('folderlist'));
		},

		render: function(eventName) {
			var page = $(this.el);

			page.html(this.template(this.options));

			// change page for folder links on vmousedown instead of waiting on vmouseup
			page.on('vmousedown', 'li a', function(e) {
				e.preventDefault();
				var href = $(e.currentTarget).attr('href');
				window.location = href;
			});

			return this;
		}
	});

}());