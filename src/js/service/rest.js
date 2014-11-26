'use strict';

var ngModule = angular.module('woServices');

// rest dao for use in the public key service
ngModule.factory('publicKeyRestDao', function(appConfig) {
    var dao = new RestDAO();
    dao.setBaseUri(appConfig.config.cloudUrl);
    return dao;
});

// rest dao for use in the private key service
ngModule.factory('privateKeyRestDao', function(appConfig) {
    var dao = new RestDAO();
    dao.setBaseUri(appConfig.config.privkeyServerUrl);
    return dao;
});

// rest dao for use in the invitation service
ngModule.factory('invitationRestDao', function(appConfig) {
    var dao = new RestDAO();
    dao.setBaseUri(appConfig.config.cloudUrl);
    return dao;
});

// rest dao for use in the admin service
ngModule.factory('adminRestDao', function(appConfig) {
    var dao = new RestDAO();
    dao.setBaseUri(appConfig.config.adminUrl);
    return dao;
});

// rest dao for use in the oauth service
ngModule.factory('oauthRestDao', function() {
    var dao = new RestDAO();
    dao.setBaseUri('https://www.googleapis.com');
    return dao;
});

module.exports = RestDAO;

function RestDAO() {}

/**
 * Set the REST DAO's base url
 * @param {String} baseUri The base url e.g. https://api.example.com
 */
RestDAO.prototype.setBaseUri = function(baseUri) {
    this._baseUri = baseUri;
};

/**
 * GET (read) request
 * @param {String} options.uri URI relative to the base uri to perform the GET request with.
 * @param {String} options.type (optional) The type of data that you're expecting back from the server: json, xml, text. Default: json.
 */
RestDAO.prototype.get = function(options, callback) {
    options.method = 'GET';
    this._processRequest(options, callback);
};

/**
 * POST (create) request
 */
RestDAO.prototype.post = function(item, uri, callback) {
    this._processRequest({
        method: 'POST',
        payload: item,
        uri: uri
    }, callback);
};

/**
 * PUT (update) request
 */
RestDAO.prototype.put = function(item, uri, callback) {
    this._processRequest({
        method: 'PUT',
        payload: item,
        uri: uri
    }, callback);
};

/**
 * DELETE (remove) request
 */
RestDAO.prototype.remove = function(uri, callback) {
    this._processRequest({
        method: 'DELETE',
        uri: uri
    }, callback);
};

//
// helper functions
//

RestDAO.prototype._processRequest = function(options, callback) {
    var xhr, format;

    if (typeof options.uri === 'undefined') {
        callback({
            code: 400,
            errMsg: 'Bad Request! URI is a mandatory parameter.'
        });
        return;
    }

    options.type = options.type || 'json';

    if (options.type === 'json') {
        format = 'application/json';
    } else if (options.type === 'xml') {
        format = 'application/xml';
    } else if (options.type === 'text') {
        format = 'text/plain';
    } else {
        callback({
            code: 400,
            errMsg: 'Bad Request! Unhandled data type.'
        });
        return;
    }

    xhr = new XMLHttpRequest();
    xhr.open(options.method, this._baseUri + options.uri);
    xhr.setRequestHeader('Accept', format);
    xhr.setRequestHeader('Content-Type', format);

    xhr.onload = function() {
        var res;

        if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 201 || xhr.status === 304)) {
            if (options.type === 'json') {
                res = xhr.responseText ? JSON.parse(xhr.responseText) : xhr.responseText;
            } else {
                res = xhr.responseText;
            }

            callback(null, res, xhr.status);
            return;
        }

        callback({
            code: xhr.status,
            errMsg: xhr.statusText
        });
    };

    xhr.onerror = function() {
        callback({
            code: 42,
            errMsg: 'Error calling ' + options.method + ' on ' + options.uri
        });
    };

    xhr.send(options.payload ? JSON.stringify(options.payload) : undefined);
};