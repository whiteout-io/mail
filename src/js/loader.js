'use strict';

/**
 * The Template Loader. Used to asynchronously load templates located in separate .html files
 */
app.util.tpl = {

	// Hash of preloaded templates for the app
	templates:{},

	// Recursively pre-load all the templates for the app.
	loadTemplates:function (names, callback) {
		var that = this;

		var loadTemplate = function (index) {
			var name = names[index];
			console.log('Loading template: ' + name);
			$.get('tpl/' + name + '.html', function (data) {
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
	},

	// Get template by name from hash of preloaded templates
	get:function (name) {
		return this.templates[name];
	}

};

/**
 * Load templates and start the application
 */
$(document).ready(function() {	
	// are we running in native app or in browser?
	var isBrowser = false;
	if(document.URL.indexOf("http://") !== -1) {
		isBrowser = true;
	}

	if(!isBrowser) {
		document.addEventListener("deviceready", onDeviceReady, false);
	} else {
		onDeviceReady();
	}	
	
	function onDeviceReady() {
		console.log('Starting in Browser: ' + isBrowser);
		app.util.tpl.loadTemplates([
			'login',
			'compose',
			'folderlist',
			'messagelist',
			'messagelistitem',
			'read'
		], function () {
			var router = new AppRouter();
			Backbone.history.start();
		});
	};
});