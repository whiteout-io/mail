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
 * @return {Object} {encryptedRegSessionKey:[base64]}
 */
PrivateKey.prototype.requestDeviceRegistration = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        if (!options.userId || !options.deviceName) {
            throw new Error('Incomplete arguments!');
        }
        resolve();

    }).then(function() {
        var uri = '/device/user/' + options.userId + '/devicename/' + options.deviceName;
        return self._restDao.post(undefined, uri);
    });
};

/**
 * Authenticate device registration by uploading the deviceSecret encrypted with the regSessionKeys.
 * @param  {String}   options.userId                The user's email address
 * @param  {String}   options.deviceName            The device's memorable name
 * @param  {String}   options.encryptedDeviceSecret The base64 encoded encrypted device secret
 * @param  {String}   options.iv                    The iv used for encryption
 */
PrivateKey.prototype.uploadDeviceSecret = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        if (!options.userId || !options.deviceName || !options.encryptedDeviceSecret || !options.iv) {
            throw new Error('Incomplete arguments!');
        }
        resolve();

    }).then(function() {
        var uri = '/device/user/' + options.userId + '/devicename/' + options.deviceName;
        return self._restDao.put(options, uri);
    });
};

//
// Private key functions
//

/**
 * Request authSessionKeys required for upload the encrypted private PGP key.
 * @param  {String}   options.userId    The user's email address
 * @return {Object} {sessionId, encryptedAuthSessionKey:[base64 encoded], encryptedChallenge:[base64 encoded]}
 */
PrivateKey.prototype.requestAuthSessionKey = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        if (!options.userId) {
            throw new Error('Incomplete arguments!');
        }
        resolve();

    }).then(function() {
        var uri = '/auth/user/' + options.userId;
        return self._restDao.post(undefined, uri);
    });
};

/**
 * Verifiy authentication by uploading the challenge and deviceSecret encrypted with the authSessionKeys as a response.
 * @param  {String}   options.userId                    The user's email address
 * @param  {String}   options.encryptedChallenge        The server's base64 encoded challenge encrypted using the authSessionKey
 * @param  {String}   options.encryptedDeviceSecret     The server's base64 encoded deviceSecret encrypted using the authSessionKey
 * @param  {String}   options.iv                        The iv used for encryption
 */
PrivateKey.prototype.verifyAuthentication = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        if (!options.userId || !options.sessionId || !options.encryptedChallenge || !options.encryptedDeviceSecret || !options.iv) {
            throw new Error('Incomplete arguments!');
        }
        resolve();

    }).then(function() {
        var uri = '/auth/user/' + options.userId + '/session/' + options.sessionId;
        return self._restDao.put(options, uri);
    });
};

/**
 * Upload the encrypted private PGP key.
 * @param  {String}   options._id                   The hex encoded capital 16 char key id
 * @param  {String}   options.userId                The user's email address
 * @param  {String}   options.encryptedPrivateKey   The base64 encoded encrypted private PGP key
 * @param  {String}   options.sessionId             The session id
 */
PrivateKey.prototype.upload = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        if (!options._id || !options.userId || !options.encryptedPrivateKey || !options.sessionId || !options.salt || !options.iv) {
            throw new Error('Incomplete arguments!');
        }
        resolve();

    }).then(function() {
        var uri = '/privatekey/user/' + options.userId + '/session/' + options.sessionId;
        return self._restDao.post(options, uri);
    });
};

/**
 * Query if an encrypted private PGP key exists on the server without initializing the recovery procedure.
 * @param  {String}   options.userId    The user's email address
 * @param  {String}   options.keyId     The private PGP key id
 * @return {Boolean} whether the key was found on the server or not.
 */
PrivateKey.prototype.hasPrivateKey = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        if (!options.userId || !options.keyId) {
            throw new Error('Incomplete arguments!');
        }
        resolve();

    }).then(function() {
        return self._restDao.get({
            uri: '/privatekey/user/' + options.userId + '/key/' + options.keyId + '?ignoreRecovery=true',
        });

    }).then(function() {
        return true;

    }).catch(function(err) {
        // 404: there is no encrypted private key on the server
        if (err.code && err.code !== 200) {
            return false;
        }

        throw err;
    });
};

/**
 * Request download for the encrypted private PGP key.
 * @param  {String}   options.userId    The user's email address
 * @param  {String}   options.keyId     The private PGP key id
 * @return {Boolean} whether the key was found on the server or not.
 */
PrivateKey.prototype.requestDownload = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        if (!options.userId || !options.keyId) {
            throw new Error('Incomplete arguments!');
        }
        resolve();

    }).then(function() {
        return self._restDao.get({
            uri: '/privatekey/user/' + options.userId + '/key/' + options.keyId
        });

    }).then(function() {
        return true;

    }).catch(function(err) {
        // 404: there is no encrypted private key on the server
        if (err.code && err.code !== 200) {
            return false;
        }

        throw err;
    });
};

/**
 * Verify the download request for the private PGP key using the recovery token sent via email. This downloads the actual encrypted private key.
 * @param  {String}   options.userId The user's email address
 * @param  {String}   options.keyId The private key id
 * @param  {String}   options.recoveryToken The token proving the user own the email account
 * @return {Object} {_id:[hex encoded capital 16 char key id], encryptedPrivateKey:[base64 encoded], encryptedUserId: [base64 encoded]}
 */
PrivateKey.prototype.download = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        if (!options.userId || !options.keyId || !options.recoveryToken) {
            throw new Error('Incomplete arguments!');
        }
        resolve();

    }).then(function() {
        return self._restDao.get({
            uri: '/privatekey/user/' + options.userId + '/key/' + options.keyId + '/recovery/' + options.recoveryToken
        });
    });
};