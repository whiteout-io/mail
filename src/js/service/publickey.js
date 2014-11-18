'use strict';

var PublicKeyDAO = function(restDao) {
    this._restDao = restDao;
};

/**
 * Verify the public key behind the given uuid
 */
PublicKeyDAO.prototype.verify = function(uuid, callback) {
    var uri = '/verify/' + uuid;

    this._restDao.get({
        uri: uri,
        type: 'text'
    }, function(err, res, status) {
        if (err && err.code === 400) {
            // there was an attempt to verify a non-existing public key
            callback();
            return;
        }

        callback(err, res, status);
    });
};

/**
 * Find the user's corresponding public key
 */
PublicKeyDAO.prototype.get = function(keyId, callback) {
    var uri = '/publickey/key/' + keyId;

    this._restDao.get({
        uri: uri
    }, function(err, key) {
        if (err && err.code === 404) {
            callback();
            return;
        }

        if (err) {
            callback(err);
            return;
        }

        callback(null, (key && key._id) ? key : undefined);
    });
};

/**
 * Find the user's corresponding public key by email
 */
PublicKeyDAO.prototype.getByUserId = function(userId, callback) {
    var uri = '/publickey/user/' + userId;

    this._restDao.get({
        uri: uri
    }, function(err, keys) {
        // not found
        if (err && err.code === 404) {
            callback();
            return;
        }

        if (err) {
            callback(err);
            return;
        }

        if (!keys || keys.length < 1) {
            // 'No public key for that user!'
            callback();
            return;
        }

        if (keys.length > 1) {
            callback({
                errMsg: 'That user has multiple public keys!'
            });
            return;
        }

        callback(null, keys[0]);
    });
};

/**
 * Persist the user's publc key
 */
PublicKeyDAO.prototype.put = function(pubkey, callback) {
    var uri = '/publickey/user/' + pubkey.userId + '/key/' + pubkey._id;
    this._restDao.put(pubkey, uri, callback);
};

/**
 * Delete the public key from the cloud storage service
 */
PublicKeyDAO.prototype.remove = function(keyId, callback) {
    var uri = '/publickey/key/' + keyId;
    this._restDao.remove(uri, callback);
};

module.exports = PublicKeyDAO;