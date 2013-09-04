'use strict';

angular.module('mail', ['ngRoute']).config(function($routeProvider) {
    $routeProvider.when('/', {
        templateUrl: 'tpl/message-list.html',
        controller: MessageListCtrl,
    });
});