'use strict';

/**
 * The InvitationDAO is a high level Data Access Object that access the invitation service REST endpoint.
 * @param {Object} restDao The REST Data Access Object abstraction
 */
var InvitationDAO = function(restDao) {
    this._restDao = restDao;
};

//
// Constants
//

InvitationDAO.INVITE_MISSING = 1;
InvitationDAO.INVITE_PENDING = 2;
InvitationDAO.INVITE_SUCCESS = 4;

//
// API
//

/**
 * Notes an invite for the recipient by the sender in the invitation web service
 * @param {String} options.recipient User ID of the recipient
 * @param {String} options.sender User ID of the sender
 * @param {Function} callback(error, status) Returns information if the invitation worked (INVITE_SUCCESS), if an invitation is already pendin (INVITE_PENDING), or information if an error occurred.
 */
InvitationDAO.prototype.invite = function(options, callback) {
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
            callback(null, InvitationDAO.INVITE_SUCCESS);
            return;
        } else if (status === 304) {
            callback(null, InvitationDAO.INVITE_PENDING);
            return;
        }

        callback({
            errMsg: 'unexpected invitation state'
        });
    }
};

module.exports = InvitationDAO;