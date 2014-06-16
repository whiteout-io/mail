(function() {
	'use strict';

	requirejs.config({
		nodeRequire: (typeof module !== 'undefined' && module.exports) ? require : undefined,
		baseUrl: 'lib',
		paths: {
			js: '../js',
			test: '../../test',
			cryptoLib: '../js/crypto',
			underscore: 'underscore/underscore-min',
			lawnchair: 'lawnchair/lawnchair-git',
			lawnchairSQL: 'lawnchair/lawnchair-adapter-webkit-sqlite-git',
			lawnchairIDB: 'lawnchair/lawnchair-adapter-indexed-db-git',
			angular: 'angular/angular.min',
			angularRoute: 'angular/angular-route.min',
			angularTouch: 'angular/angular-touch.min',
			angularSanitize: 'angular/angular-sanitize.min',
			angularAnimate: 'angular/angular-animate.min',
			uuid: 'uuid/uuid',
			forge: 'forge/forge.min',
			punycode: 'punycode.min',
			openpgp: 'openpgp/openpgp.min'
		},
		shim: {
			forge: {
				exports: 'forge'
			},
			angular: {
				exports: 'angular'
			},
			angularSanitize: {
				exports: 'angular',
				deps: ['angular']
			},
			angularRoute: {
				exports: 'angular',
				deps: ['angular']
			},
			angularTouch: {
				exports: 'angular',
				deps: ['angular']
			},
			angularAnimate: {
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