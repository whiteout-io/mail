'use strict';

var axe = require('axe-logger');

var ngModule = angular.module('woUtil');
ngModule.factory('axe', function() {
    return axe;
});