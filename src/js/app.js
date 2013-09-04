// hey Angular, we're bootstrapping manually!
window.name = 'NG_DEFER_BOOTSTRAP!';

require(['angular', 'js/controller/message-list', 'angularRoute', 'js/app-config'], function(angular, MessageListCtrl) {
    'use strict';

    var app = angular.module('mail', ['ngRoute']);
    app.config(function($routeProvider) {
        $routeProvider.when('/', {
            templateUrl: 'tpl/message-list.html',
            controller: MessageListCtrl
        });
    });

    angular.element().ready(function() {
        angular.bootstrap(document, ['mail']);
    });
});