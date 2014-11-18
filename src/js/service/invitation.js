'use strict';

var ngModule = angular.module('woServices');
ngModule.service('invitation', Invitation);
module.exports = Invitation;

var config = require('../app-config').config;

/**
 * The Invitation is a high level Data Access Object that access the invitation service REST endpoint.
 * @param {Object} restDao The REST Data Access Object abstraction
 */
function Invitation(restDao) {
    this._restDao = restDao;
    this._restDao.setBaseUri(config.cloudUrl);
}

//
// Constants
//

Invitation.INVITE_MISSING = 1;
Invitation.INVITE_PENDING = 2;
Invitation.INVITE_SUCCESS = 4;

//
// API
//

/**
 * Notes an invite for the recipient by the sender in the invitation web service
 * @param {String} options.recipient User ID of the recipient
 * @param {String} options.sender User ID of the sender
 * @param {Function} callback(error, status) Returns information if the invitation worked (INVITE_SUCCESS), if an invitation is already pendin (INVITE_PENDING), or information if an error occurred.
 */
Invitation.prototype.invite = function(options, callback) {
    if (typeof options !== 'object' || typeof options.recipient !== 'string' || typeof options.recipient !== 'string') {
        callback({
            errMsg: 'erroneous usage of api: incorrect parameters!'
        });
        return;
    }

    var uri = '/invitation/recipient/' + options.recipient + '/sender/' + options.sender;
    this._restDao.put({}, uri, completed);

    function completed(error, res, status) {
        if (error) {
            callback(error);
            return;
        }

        if (status === 201) {
            callback(null, Invitation.INVITE_SUCCESS);
            return;
        } else if (status === 304) {
            callback(null, Invitation.INVITE_PENDING);
            return;
        }

        callback({
            errMsg: 'unexpected invitation state'
        });
    }
};