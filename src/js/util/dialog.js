'use strict';

var ngModule = angular.module('woUtil');
ngModule.service('dialog', Dialog);
module.exports = Dialog;

/**
 * A central service to display messages to the user in a dialog
 */
function Dialog($q, axe) {
    this._q = $q;
    this._axe = axe;

    // binds the methods to the instance of the dialog service so that we can e.g.
    // pass dialog.error as a callback to asynchronous functions without having to
    // do dialog.error.bind(dialog) every time
    this.info = this.info.bind(this);
    this.error = this.error.bind(this);
    this.confirm = this.confirm.bind(this);
}

/**
 * Show an information dialog
 * @param  {String} options.title       The title of the displayed dialog
 * @param  {String} options.message     The message to be displayed
 * @return {Promise}
 */
Dialog.prototype.info = function(options) {
    return this._handle(options, this.displayInfo.bind(this), 'displayInfo');
};

/**
 * Show an error dialog
 * @param  {String} options.title       (optional) The title of the displayed dialog
 * @param  {String} options.message     The message to be displayed
 * @return {Promise}
 */
Dialog.prototype.error = function(options) {
    // log the error
    if (options) {
        this._axe.error((options.errMsg || options.message) + (options.stack ? ('\n' + options.stack) : ''));
    }
    return this._handle(options, this.displayError.bind(this), 'displayError');
};

/**
 * Show an confirm dialog
 * @param  {String} options.title       The title of the displayed dialog
 * @param  {String} options.message     The message to be displayed
 * @param  {String} options.callback    The callback that is called after the confirmation has been granted or denied
 * @return {Promise}
 */
Dialog.prototype.confirm = function(options) {
    return this._handle(options, this.displayConfirm.bind(this), 'displayConfirm');
};

/**
 * Helper function which returns a promise
 */
Dialog.prototype._handle = function(options, fn, errMsg) {
    return this._q(function(resolve, reject) {
        if (fn) {
            fn(options);
            resolve();
        } else {
            reject(new Error('Dialog service ' + errMsg + ' not set!'));
        }
    });
};