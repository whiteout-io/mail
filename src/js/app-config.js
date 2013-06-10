(function() {
	'use strict';

	/**
	 * Create the application namespace
	 */
	var app = {
		model: {},
		view: {},
		dao: {},
		crypto: {},
		util: {}
	};

	/**
	 * Global app configurations
	 */
	app.config = {
		cloudUrl: 'http://storage.whiteout.io',
		symKeySize: 128,
		symIvSize: 128,
		asymKeySize: 1024,
		workerPath: 'js'
	};

	/**
	 * The Template Loader. Used to asynchronously load templates located in separate .html files
	 */
	app.util.tpl = {
		templates: {},

		get: function(name) {
			return this.templates[name];
		},

		loadTemplates: function(names, callback) {
			var that = this;

			var loadTemplate = function(index) {
				var name = names[index];
				console.log('Loading template: ' + name);
				$.get('tpl/' + name + '.html', function(data) {
					that.templates[name] = data;
					index++;
					if (index < names.length) {
						loadTemplate(index);
					} else {
						callback();
					}
				});
			};
			loadTemplate(0);
		}
	};

	window.app = app;

}());