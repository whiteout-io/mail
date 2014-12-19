'use strict';

var ngModule = angular.module('woServices');
ngModule.service('publicKey', PublicKey);
module.exports = PublicKey;

function PublicKey(publicKeyRestDao) {
    this._restDao = publicKeyRestDao;
}

/**
 * Verify the public key behind the given uuid
 */
PublicKey.prototype.verify = function(uuid) {
    return this._restDao.get({
        uri: '/verify/' + uuid,
        type: 'text'
    }).catch(function(err) {
        if (err.code === 400) {
            // there was an attempt to verify a non-existing public key
            return;
        }

        throw err;
    });
};

/**
 * Find the user's corresponding public key
 */
PublicKey.prototype.get = function(keyId) {
    return this._restDao.get({
        uri: '/publickey/key/' + keyId
    }).catch(function(err) {
        if (err.code === 404) {
            return;
        }

        throw err;
    });
};

/**
 * Find the user's corresponding public key by email
 */
PublicKey.prototype.getByUserId = function(userId) {
    return this._restDao.get({
        uri: '/publickey/user/' + userId
    }).then(function(keys) {
        if (!keys || keys.length < 1) {
            // 'No public key for that user!'
            return;
        }

        if (keys.length > 1) {
            throw new Error('That user has multiple public keys!');
        }

        return keys[0];

    }).catch(function(err) {
        // not found
        if (err.code === 404) {
            return;
        }

        throw err;
    });
};

/**
 * Persist the user's publc key
 */
PublicKey.prototype.put = function(pubkey) {
    var uri = '/publickey/user/' + pubkey.userId + '/key/' + pubkey._id;
    return this._restDao.put(pubkey, uri);
};

/**
 * Delete the public key from the cloud storage service
 */
PublicKey.prototype.remove = function(keyId) {
    var uri = '/publickey/key/' + keyId;
    return this._restDao.remove(uri);
};