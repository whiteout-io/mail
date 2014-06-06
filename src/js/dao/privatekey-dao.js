define(function() {
    'use strict';

    var PrivateKeyDAO = function(restDao) {
        this._restDao = restDao;
    };

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
    PrivateKeyDAO.prototype.requestDeviceRegistration = function(options, callback) {
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
     * @param  {String}   options.userId      The user's email address
     * @param  {String}   options.deviceName  The device's memorable name
     * @param  {Object}   options.encryptedDeviceSecret     {encryptedDeviceSecret:[base64 encoded]}
     * @param  {Function} callback(error)
     */
    PrivateKeyDAO.prototype.uploadDeviceSecret = function(options, callback) {
        var uri;

        if (!options.userId || !options.deviceName || !options.encryptedDeviceSecret) {
            callback(new Error('Incomplete arguments!'));
            return;
        }

        uri = '/device/user/' + options.userId + '/devicename/' + options.deviceName;
        this._restDao.put(options.encryptedDeviceSecret, uri, callback);
    };

    //
    // Private key functions
    //

    /**
     * Request authSessionKeys required for upload the encrypted private PGP key.
     * @param  {String}   options.userId    The user's email address
     * @param  {Function} callback(error, authSessionKey)
     * @return {Object} {sessionId, encryptedAuthSessionKeys:[base64 encoded], encryptedChallenge:[base64 encoded]}
     */
    PrivateKeyDAO.prototype.requestAuthSessionKeys = function(options, callback) {
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
     * @param  {String}   options.userId    The user's email address
     * @param  {Object}   options.encryptedChallenge  The server's challenge encrypted using the authSessionKey {encryptedChallenge:[base64 encoded], encryptedDeviceSecret:[base64 encoded], iv}
     * @param  {Function} callback(error)
     */
    PrivateKeyDAO.prototype.verifyAuthentication = function(options, callback) {
        var uri;

        if (!options.userId || !options.sessionId || !options.encryptedChallenge) {
            callback(new Error('Incomplete arguments!'));
            return;
        }

        uri = '/auth/user/' + options.userId + '/session/' + options.sessionId;
        this._restDao.put(options.encryptedChallenge, uri, callback);
    };

    /**
     * Upload the encrypted private PGP key.
     * @param  {String}   options.encryptedPrivateKey {_id:[hex encoded capital 16 char key id], encryptedPrivateKey:[base64 encoded], sessionId: [base64 encoded]}
     * @param  {Function} callback(error)
     */
    PrivateKeyDAO.prototype.upload = function(options, callback) {
        var uri,
            key = options.encryptedPrivateKey;

        if (!options.userId || !key || !key._id) {
            callback(new Error('Incomplete arguments!'));
            return;
        }

        uri = '/privatekey/user/' + options.userId + '/key/' + key._id;
        this._restDao.post(key, uri, callback);
    };

    /**
     * Request download for the encrypted private PGP key.
     * @param  {[type]}   options.userId The user's email address
     * @param  {Function} callback(error)
     */
    PrivateKeyDAO.prototype.requestDownload = function(options, callback) {
        var uri;

        if (!options.userId || !options.keyId) {
            callback(new Error('Incomplete arguments!'));
            return;
        }

        uri = '/privatekey/user/' + options.userId + '/key/' + options.keyId;
        this._restDao.get({
            uri: uri
        }, callback);
    };

    /**
     * Verify the download request for the private PGP key using the recovery token sent via email. This downloads the actual encrypted private key.
     * @param  {String}   options.userId The user's email address
     * @param  {String}   options.keyId The private key id
     * @param  {String}   options.recoveryToken The token proving the user own the email account
     * @param  {Function} callback(error, encryptedPrivateKey)
     * @return {Object} {_id:[hex encoded capital 16 char key id], encryptedPrivateKey:[base64 encoded], encryptedUserId: [base64 encoded]}
     */
    PrivateKeyDAO.prototype.download = function(options, callback) {
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

    return PrivateKeyDAO;
});