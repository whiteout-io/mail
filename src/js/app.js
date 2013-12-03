// hey Angular, we're bootstrapping manually!
window.name = 'NG_DEFER_BOOTSTRAP!';

require([
    'angular',
    'js/controller/dialog',
    'js/controller/popover',
    'js/controller/account',
    'js/controller/login',
    'js/controller/login-initial',
    'js/controller/login-new-device',
    'js/controller/login-existing',
    'js/controller/mail-list',
    'js/controller/read',
    'js/controller/write',
    'js/controller/navigation',
    'cryptoLib/util',
    'angularRoute',
    'angularTouch'
], function(angular, DialogCtrl, PopoverCtrl, AccountCtrl, LoginCtrl, LoginInitialCtrl, LoginNewDeviceCtrl, LoginExistingCtrl, MailListCtrl, ReadCtrl, WriteCtrl, NavigationCtrl, util) {
    'use strict';

    // reset window.name
    window.name = util.UUID();

    // init main angular module including dependencies
    var app = angular.module('mail', ['ngRoute', 'ngTouch', 'navigation', 'mail-list', 'write', 'read', 'login-new-device', 'popover']);

    // set router paths
    app.config(function($routeProvider) {
        $routeProvider.when('/login', {
            templateUrl: 'tpl/login.html',
            controller: LoginCtrl
        });
        $routeProvider.when('/login-existing', {
            templateUrl: 'tpl/login-existing.html',
            controller: LoginExistingCtrl
        });
        $routeProvider.when('/login-initial', {
            templateUrl: 'tpl/login-initial.html',
            controller: LoginInitialCtrl
        });
        $routeProvider.when('/login-new-device', {
            templateUrl: 'tpl/login-new-device.html',
            controller: LoginNewDeviceCtrl
        });
        $routeProvider.when('/desktop', {
            templateUrl: 'tpl/desktop.html',
            controller: NavigationCtrl
        });
        $routeProvider.otherwise({
            redirectTo: '/login'
        });
    });

    // inject controllers from ng-included view templates
    app.controller('ReadCtrl', ReadCtrl);
    app.controller('WriteCtrl', WriteCtrl);
    app.controller('MailListCtrl', MailListCtrl);
    app.controller('AccountCtrl', AccountCtrl);
    app.controller('DialogCtrl', DialogCtrl);
    app.controller('PopoverCtrl', PopoverCtrl);

    // manually bootstrap angular due to require.js
    angular.element().ready(function() {
        angular.bootstrap(document, ['mail']);
    });
});