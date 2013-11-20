define(function() {
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

        this._restDao.put(null, uri(options.recipient, options.sender), completed);

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

    /**
     * Checks if an invitation for the recipient by the sender is present in the invitation web service
     * @param {String} options.recipient User ID of the recipient
     * @param {String} options.sender User ID of the sender
     * @param {Function} callback(error, status) Returns information about the invitation status, either an invitation is already on place (INVITE_PENDING), or not (INVITE_MISSING), or information if an error occurred.
     */
    InvitationDAO.prototype.check = function(options, callback) {
        if (typeof options !== 'object' || typeof options.recipient !== 'string' || typeof options.recipient !== 'string') {
            callback({
                errMsg: 'erroneous usage of api: incorrect parameters!'
            });
            return;
        }

        this._restDao.get(null, uri(options.recipient, options.sender), completed);

        function completed(error, res, status) {
            // 404 is a meaningful return value from the web service
            if (error && error.code !== 404) {
                callback(error);
                return;
            }

            if (error && error.code === 404) {
                callback(null, InvitationDAO.INVITE_MISSING);
                return;
            } else if (status === 200) {
                callback(null, InvitationDAO.INVITE_PENDING);
                return;
            }

            callback({
                errMsg: 'unexpected invitation state'
            });
        }
    };

    //
    // Helper functions
    //

    function uri(a, b) {
        return '/invitation/recipient/' + a + '/sender/' + b;
    }

    return InvitationDAO;
});