'use strict';

var ngModule = angular.module('woServices');
ngModule.service('privateKey', PrivateKey);
module.exports = PrivateKey;

function PrivateKey(privateKeyRestDao) {
    this._restDao = privateKeyRestDao;
}

//
// Device registration functions
//

/**
 * Request registration of a new device by fetching registration session key.
 * @param  {String}   options.userId      The user's email address
 * @param  {String}   options.deviceName  The device's memorable name
 * @param  {Function} callback(error, regSessionKey)
 * @return {Object} {encryptedRegSessionKey:[base64]}
 */
PrivateKey.prototype.requestDeviceRegistration = function(options, callback) {
    var uri;

    if (!options.userId || !options.deviceName) {
        callback(new Error('Incomplete arguments!'));
        return;
    }

    uri = '/device/user/' + options.userId + '/devicename/' + options.deviceName;
    this._restDao.post(undefined, uri, callback);
};

/**
 * Authenticate device registration by uploading the deviceSecret encrypted with the regSessionKeys.
 * @param  {String}   options.userId                The user's email address
 * @param  {String}   options.deviceName            The device's memorable name
 * @param  {String}   options.encryptedDeviceSecret The base64 encoded encrypted device secret
 * @param  {String}   options.iv                    The iv used for encryption
 * @param  {Function} callback(error)
 */
PrivateKey.prototype.uploadDeviceSecret = function(options, callback) {
    var uri;

    if (!options.userId || !options.deviceName || !options.encryptedDeviceSecret || !options.iv) {
        callback(new Error('Incomplete arguments!'));
        return;
    }

    uri = '/device/user/' + options.userId + '/devicename/' + options.deviceName;
    this._restDao.put(options, uri, callback);
};

//
// Private key functions
//

/**
 * Request authSessionKeys required for upload the encrypted private PGP key.
 * @param  {String}   options.userId    The user's email address
 * @param  {Function} callback(error, authSessionKey)
 * @return {Object} {sessionId, encryptedAuthSessionKey:[base64 encoded], encryptedChallenge:[base64 encoded]}
 */
PrivateKey.prototype.requestAuthSessionKey = function(options, callback) {
    var uri;

    if (!options.userId) {
        callback(new Error('Incomplete arguments!'));
        return;
    }

    uri = '/auth/user/' + options.userId;
    this._restDao.post(undefined, uri, callback);
};

/**
 * Verifiy authentication by uploading the challenge and deviceSecret encrypted with the authSessionKeys as a response.
 * @param  {String}   options.userId                    The user's email address
 * @param  {String}   options.encryptedChallenge        The server's base64 encoded challenge encrypted using the authSessionKey
 * @param  {String}   options.encryptedDeviceSecret     The server's base64 encoded deviceSecret encrypted using the authSessionKey
 * @param  {String}   options.iv                        The iv used for encryption
 * @param  {Function} callback(error)
 */
PrivateKey.prototype.verifyAuthentication = function(options, callback) {
    var uri;

    if (!options.userId || !options.sessionId || !options.encryptedChallenge || !options.encryptedDeviceSecret || !options.iv) {
        callback(new Error('Incomplete arguments!'));
        return;
    }

    uri = '/auth/user/' + options.userId + '/session/' + options.sessionId;
    this._restDao.put(options, uri, callback);
};

/**
 * Upload the encrypted private PGP key.
 * @param  {String}   options._id                   The hex encoded capital 16 char key id
 * @param  {String}   options.userId                The user's email address
 * @param  {String}   options.encryptedPrivateKey   The base64 encoded encrypted private PGP key
 * @param  {String}   options.sessionId             The session id
 * @param  {Function} callback(error)
 */
PrivateKey.prototype.upload = function(options, callback) {
    var uri;

    if (!options._id || !options.userId || !options.encryptedPrivateKey || !options.sessionId || !options.salt || !options.iv) {
        callback(new Error('Incomplete arguments!'));
        return;
    }

    uri = '/privatekey/user/' + options.userId + '/session/' + options.sessionId;
    this._restDao.post(options, uri, callback);
};

/**
 * Query if an encrypted private PGP key exists on the server without initializing the recovery procedure.
 * @param  {String}   options.userId    The user's email address
 * @param  {String}   options.keyId     The private PGP key id
 * @param  {Function} callback(error, found)
 * @return {Boolean} whether the key was found on the server or not.
 */
PrivateKey.prototype.hasPrivateKey = function(options, callback) {
    if (!options.userId || !options.keyId) {
        callback(new Error('Incomplete arguments!'));
        return;
    }

    this._restDao.get({
        uri: '/privatekey/user/' + options.userId + '/key/' + options.keyId + '?ignoreRecovery=true',
    }, function(err) {
        // 404: there is no encrypted private key on the server
        if (err && err.code !== 200) {
            callback(null, false);
            return;
        }

        if (err) {
            callback(err);
            return;
        }

        callback(null, true);
    });
};

/**
 * Request download for the encrypted private PGP key.
 * @param  {String}   options.userId    The user's email address
 * @param  {String}   options.keyId     The private PGP key id
 * @param  {Function} callback(error, found)
 * @return {Boolean} whether the key was found on the server or not.
 */
PrivateKey.prototype.requestDownload = function(options, callback) {
    if (!options.userId || !options.keyId) {
        callback(new Error('Incomplete arguments!'));
        return;
    }

    this._restDao.get({
        uri: '/privatekey/user/' + options.userId + '/key/' + options.keyId
    }, function(err) {
        // 404: there is no encrypted private key on the server
        if (err && err.code !== 200) {
            callback(null, false);
            return;
        }

        if (err) {
            callback(err);
            return;
        }

        callback(null, true);
    });
};

/**
 * Verify the download request for the private PGP key using the recovery token sent via email. This downloads the actual encrypted private key.
 * @param  {String}   options.userId The user's email address
 * @param  {String}   options.keyId The private key id
 * @param  {String}   options.recoveryToken The token proving the user own the email account
 * @param  {Function} callback(error, encryptedPrivateKey)
 * @return {Object} {_id:[hex encoded capital 16 char key id], encryptedPrivateKey:[base64 encoded], encryptedUserId: [base64 encoded]}
 */
PrivateKey.prototype.download = function(options, callback) {
    var uri;

    if (!options.userId || !options.keyId || !options.recoveryToken) {
        callback(new Error('Incomplete arguments!'));
        return;
    }

    uri = '/privatekey/user/' + options.userId + '/key/' + options.keyId + '/recovery/' + options.recoveryToken;
    this._restDao.get({
        uri: uri
    }, callback);
};