(function() {
	'use strict';

	require.config({
		baseUrl: 'lib',
		paths: {
			js: '../js',
			test: '../../test',
			'node-forge': 'forge',
			'setimmediate': 'setImmediate',
			cryptoLib: '../js/crypto',
			jquery: 'jquery-1.8.2.min',
			underscore: 'underscore-1.4.4.min',
			lawnchair: 'lawnchair/lawnchair-git',
			lawnchairSQL: 'lawnchair/lawnchair-adapter-webkit-sqlite-git',
			lawnchairIDB: 'lawnchair/lawnchair-adapter-indexed-db-git',
			cordova: 'cordova-2.5.0',
			'smtp-client': 'smtp-client-browserified',
			angular: 'angular/angular.min',
			angularRoute: 'angular/angular-route.min',
			angularTouch: 'angular/angular-touch.min',
			moment: 'moment.min'
		},
		shim: {
			angular: {
				exports: 'angular'
			},
			angularRoute: {
				exports: 'angular',
				deps: ['angular']
			},
			angularTouch: {
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
			underscore: {
				exports: '_'
			}
		}
	});

}());