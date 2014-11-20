'use strict';

var ngModule = angular.module('woUtil');
ngModule.service('statusDisplay', StatusDisplay);
module.exports = StatusDisplay;

function StatusDisplay() {}

/**
 * Update the status disply in the lower left of the screen
 * @param  {String} msg     The status message that is to be displayed to the user
 * @param  {Date} time		The time of the last update
 */
StatusDisplay.prototype.update = function(msg, time) {
	this.showStatus(msg, time);
};

/**
 * Update the searching status to show a spinner while searching
 * @param {Boolean} state	If the spinner should be displayed or not
 */
StatusDisplay.prototype.setSearching = function(state) {
	this.showSearching(state);
};