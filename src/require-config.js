(function() {
	'use strict';

	requirejs.config({
		nodeRequire: (typeof module !== 'undefined' && module.exports) ? require : undefined,
		baseUrl: 'lib',
		paths: {
			js: '../js',
			test: '../../test',
			jquery: 'jquery.min',
			underscore: 'underscore/underscore-min',
			lawnchair: 'lawnchair/lawnchair-git',
			lawnchairSQL: 'lawnchair/lawnchair-adapter-webkit-sqlite-git',
			lawnchairIDB: 'lawnchair/lawnchair-adapter-indexed-db-git',
			angular: 'angular/angular.min',
			angularRoute: 'angular/angular-route.min',
			angularAnimate: 'angular/angular-animate.min',
			ngInfiniteScroll: 'ng-infinite-scroll.min',
			ngTagsInput: 'ng-tags-input.min',
			uuid: 'uuid/uuid',
			forge: 'forge/forge.min',
			punycode: 'punycode.min',
			openpgp: 'openpgp/openpgp',
			fastclick: 'fastclick/fastclick'
		},
		shim: {
			forge: {
				exports: 'forge'
			},
			jquery: {
				exports: '$'
			},
			angular: {
				exports: 'angular',
				deps: ['jquery']
			},
			angularRoute: {
				exports: 'angular',
				deps: ['angular']
			},
			angularAnimate: {
				exports: 'angular',
				deps: ['angular']
			},
			ngInfiniteScroll: {
				exports: 'angular',
				deps: ['jquery', 'angular']
			},
			ngTagsInput: {
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