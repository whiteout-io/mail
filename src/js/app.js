// hey Angular, we're bootstrapping manually!
window.name = 'NG_DEFER_BOOTSTRAP!';

require(['angular', 'js/controller/message-list', 'angularRoute', 'angularTouch', 'js/app-config'], function(angular, MessageListCtrl) {
    'use strict';

    var app = angular.module('mail', ['ngRoute', 'ngTouch']);
    app.config(function($routeProvider) {
        $routeProvider.when('/folders/:folder', {
            templateUrl: 'tpl/message-list-desktop.html',
            controller: MessageListCtrl
        });
        $routeProvider.when('/folders/:folder/messages/:messageId', {
            templateUrl: 'tpl/read.html',
            controller: MessageListCtrl
        });
        $routeProvider.otherwise({
            redirectTo: '/folders/Inbox'
        });
    });

    angular.element().ready(function() {
        angular.bootstrap(document, ['mail']);
    });
});