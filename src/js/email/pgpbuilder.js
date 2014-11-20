'use strict';

var PgpBuilder = require('pgpbuilder');
var instance = new PgpBuilder();

var ngModule = angular.module('woEmail');
ngModule.factory('pgpbuilder', function() {
    return instance;
});