'use strict';

var PgpBuilder = require('pgpbuilder');

var ngModule = angular.module('woEmail');
ngModule.factory('pgpbuilder', function() {
    return new PgpBuilder();
});