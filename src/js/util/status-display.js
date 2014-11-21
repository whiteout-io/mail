'use strict';

var ngModule = angular.module('woUtil');
ngModule.service('statusDisplay', StatusDisplay);
module.exports = StatusDisplay;

/**
 * A central service to display status updates to the user
 */
function StatusDisplay($q, axe) {
    this._q = $q;
    this._axe = axe;
}

/**
 * Update the status disply in the lower left of the screen
 * @param  {String} msg     The status message that is to be displayed to the user
 * @param  {Date} time		The time of the last update
 */
StatusDisplay.prototype.update = function(msg, time) {
    var self = this;
    self._axe.info('status display', msg);
    return self._q(function(resolve, reject) {
        if (self.showStatus) {
            self.showStatus(msg, time);
            resolve();
        } else {
            reject(new Error('Status display service showStatus not set!'));
        }
    });
};

/**
 * Update the searching status to show a spinner while searching
 * @param {Boolean} state	If the spinner should be displayed or not
 */
StatusDisplay.prototype.setSearching = function(state) {
    var self = this;
    return self._q(function(resolve, reject) {
        if (self.showSearching) {
            self.showSearching(state);
            resolve();
        } else {
            reject(new Error('Status display service showSearching not set!'));
        }
    });
};