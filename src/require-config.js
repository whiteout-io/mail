(function() {
	'use strict';

	require.config({
		baseUrl: 'lib',
		paths: {
			js: '../js',
			test: '../../test',
			'node-forge': 'forge',
			cryptoLib: '../js/crypto',
			'setimmediate': 'setImmediate',
			underscore: 'underscore/underscore-min',
			cordova: 'cordova/cordova-2.5.0',
			lawnchair: 'lawnchair/lawnchair-git',
			lawnchairSQL: 'lawnchair/lawnchair-adapter-webkit-sqlite-git',
			lawnchairIDB: 'lawnchair/lawnchair-adapter-indexed-db-git',
			jquery: 'jquery/jquery-2.0.3.min',
			angular: 'angular/angular.min',
			angularRoute: 'angular/angular-route.min',
			angularTouch: 'angular/angular-touch.min',
			moment: 'moment/moment.min',
			uuid: 'uuid/uuid'
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