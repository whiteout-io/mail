(function() {
	'use strict';

	require.config({
		baseUrl: 'lib',
		paths: {
			js: '../js',
			test: '../../test',
			cryptoLib: '../js/crypto',
			jquery: 'jquery-1.8.2.min',
			jquerymobile: 'jquery.mobile-1.2.0.min',
			underscore: 'underscore-1.4.4.min',
			backbone: 'backbone-1.0.0.min',
			lawnchair: 'lawnchair/lawnchair-git',
			lawnchairSQL: 'lawnchair/lawnchair-adapter-webkit-sqlite-git',
			lawnchairIDB: 'lawnchair/lawnchair-adapter-indexed-db-git',
			cordova: 'cordova-2.5.0',
			ImapClient: 'imap-client-browserified',
			SmtpClient: 'smtp-client-browserified',
			angular: 'angular/angular.min',
			angularRoute: 'angular/angular-route.min'
		},
		shim: {
			angular: {
				exports: 'angular'
			},
			angularRoute: {
				exports: 'angular',
				deps: ['angular']
			},
			lawnchair: {
				exports: 'Lawnchair'
			},
			lawnchairSQL: {
				deps: ['lawnchair']
			},
			lawnchairIDB: {
				deps: ['lawnchair', 'lawnchairSQL']
			},
			backbone: {
				deps: ['underscore', 'jquery'],
				exports: 'Backbone'
			},
			underscore: {
				exports: '_'
			},
			jquerymobile: {
				deps: ['jquery', 'js/jqm-config']
			}
		},
		priority: [
			"angular"
		]
	});

}());