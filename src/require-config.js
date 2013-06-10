(function() {
	'use strict';

	require.config({
		baseUrl: 'lib',
		paths: {
			js: '../js',
			test: '../../test',
			cryptoLib: '../js/crypto',
			jquery: 'jquery-1.8.2.min',
			underscore: 'underscore-1.4.4.min',
			backbone: 'backbone-1.0.0.min',
			lawnchair: 'lawnchair/lawnchair-git',
			lawnchairSQL: 'lawnchair/lawnchair-adapter-webkit-sqlite-git',
			lawnchairIDB: 'lawnchair/lawnchair-adapter-indexed-db-git',
			cordova: 'cordova-2.5.0'
		},
		shim: {
			lawnchair: {
				deps: ['lawnchairSQL', 'lawnchairIDB'],
				exports: 'Lawnchair'
			},
			backbone: {
				//These script dependencies should be loaded before loading
				//backbone.js
				deps: ['underscore', 'jquery'],
				//Once loaded, use the global 'Backbone' as the
				//module value.
				exports: 'Backbone'
			},
			underscore: {
				exports: '_'
			},
			cordova: {
				exports: 'cordova'
			}
		}
	});

}());