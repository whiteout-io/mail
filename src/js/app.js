// hey Angular, we're bootstrapping manually!
window.name = 'NG_DEFER_BOOTSTRAP!';

require([
    'angular',
    'js/controller/login',
    'js/controller/mail-list',
    'js/controller/write',
    'js/controller/navigation',
    'angularRoute',
    'angularTouch'
], function(angular, LoginCtrl, MailListCtrl, WriteCtrl, NavigationCtrl) {
    'use strict';

    var app = angular.module('mail', ['ngRoute', 'ngTouch', 'write', 'read']);

    // set router paths
    app.config(function($routeProvider) {
        $routeProvider.when('/login', {
            templateUrl: 'tpl/login.html',
            controller: LoginCtrl
        });
        $routeProvider.when('/write/:replyToId', {
            templateUrl: 'tpl/write.html',
            controller: WriteCtrl
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
    app.controller('MailListCtrl', MailListCtrl);

    // manually bootstrap angular due to require.js
    angular.element().ready(function() {
        angular.bootstrap(document, ['mail']);
    });
});