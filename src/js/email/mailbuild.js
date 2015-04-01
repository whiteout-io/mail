'use strict';

var Mailbuild = require('mailbuild');

var ngModule = angular.module('woEmail');
ngModule.factory('mailbuild', function() {
    return Mailbuild;
});