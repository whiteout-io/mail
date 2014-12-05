'use strict';

var ngModule = angular.module('woUtil');
ngModule.service('status', Status);
module.exports = Status;

/**
 * A central service to display status updates to the user
 */
function Status($rootScope, axe) {
    this._rootScope = $rootScope;
    this._axe = axe;
}

/**
 * Update the status disply in the lower left of the screen
 * @param  {String} text     The status message that is to be displayed to the user
 * @param  {Date} time		The time of the last update
 */
Status.prototype.update = function(text, time) {
    this._axe.info('status display', text);
    this._rootScope.$broadcast('status', text, time);
};

/**
 * Update the searching status to show a spinner while searching
 * @param {Boolean} state	If the spinner should be displayed or not
 */
Status.prototype.setSearching = function(state) {
    this._rootScope.$broadcast('searching', state);
};

/**
 * Update the reading status to communicate between controllers, if we're in read mode.
 * @param {Boolean} state   If the reade mode should be open or not
 */
Status.prototype.setReading = function(state) {
    this._rootScope.$broadcast('read', state);
};