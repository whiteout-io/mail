// hey Angular, we're bootstrapping manually!
window.name = 'NG_DEFER_BOOTSTRAP!';

require([
    'angular',
    'js/controller/login',
    'js/controller/message-list',
    'js/controller/write',
    'angularRoute',
    'angularTouch'
], function(angular, LoginCtrl, MessageListCtrl, WriteCtrl) {
    'use strict';

    var app = angular.module('mail', ['ngRoute', 'ngTouch', 'write']);
    app.config(function($routeProvider) {
        $routeProvider.when('/login', {
            templateUrl: 'tpl/login.html',
            controller: LoginCtrl
        });
        $routeProvider.when('/folders/:folder', {
            templateUrl: 'tpl/message-list-desktop.html',
            controller: MessageListCtrl
        });
        $routeProvider.when('/folders/:folder/messages/:messageId', {
            templateUrl: 'tpl/read.html',
            controller: MessageListCtrl
        });
        $routeProvider.when('/write/:replyToId', {
            templateUrl: 'tpl/write.html',
            controller: WriteCtrl
        });
        $routeProvider.otherwise({
            redirectTo: '/login'
        });
    });

    angular.element().ready(function() {
        angular.bootstrap(document, ['mail']);
    });
});