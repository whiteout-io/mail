define(function() {
    'use strict';

    var PrivateKeyDAO = function(restDao) {
        this._restDao = restDao;
    };

    /**
     * Persist the user's private key on the server
     */
    PrivateKeyDAO.prototype.post = function(privkey, callback) {
        var uri = '/privatekey/user/' + privkey.userId + '/key/' + privkey._id;
        this._restDao.post(privkey, uri, callback);
    };

    return PrivateKeyDAO;
});