'use strict';

var ngModule = angular.module('woUtil');
ngModule.service('dialog', Dialog);
module.exports = Dialog;

function Dialog() {}

Dialog.prototype.info = function(options) {
    this.displayInfo(options);
};

Dialog.prototype.error = function(options) {
    this.displayError(options);
};

Dialog.prototype.confirm = function(options) {
    this.displayConfirm(options);
};