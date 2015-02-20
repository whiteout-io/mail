'use strict';

var ngModule = angular.module('woServices');
ngModule.service('invitation', Invitation);
module.exports = Invitation;

/**
 * The Invitation is a high level Data Access Object that access the invitation service REST endpoint.
 * @param {Object} restDao The REST Data Access Object abstraction
 */
function Invitation(invitationRestDao, appConfig) {
    this._restDao = invitationRestDao;
    this._appConfig = appConfig;
}

/**
 * Create the invitation mail object
 * @param  {String} options.sender      The sender's email address
 * @param  {String} options.recipient   The recipient's email address
 * @return {Object}                     The mail object
 */
Invitation.prototype.createMail = function(options) {
    var str = this._appConfig.string;

    return {
        from: [{
            address: options.sender
        }],
        to: [{
            address: options.recipient
        }],
        cc: [],
        bcc: [],
        subject: str.invitationSubject,
        body: str.invitationMessage
    };
};

/**
 * Notes an invite for the recipient by the sender in the invitation web service
 * @param {String} options.recipient User ID of the recipient
 * @param {String} options.sender User ID of the sender
 * @return {Promise}
 */
Invitation.prototype.invite = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        if (typeof options !== 'object' || typeof options.recipient !== 'string' || typeof options.sender !== 'string') {
            throw new Error('erroneous usage of api: incorrect parameters!');
        }
        resolve();

    }).then(function() {
        var uri = '/invitation/recipient/' + options.recipient + '/sender/' + options.sender;
        return self._restDao.put({}, uri);
    });
};