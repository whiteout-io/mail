'use strict';

var ngModule = angular.module('woServices');

// rest dao for use in the public key service
ngModule.factory('publicKeyRestDao', function(appConfig) {
    var dao = new RestDAO();
    dao.setBaseUri(appConfig.config.keyServerUrl);
    return dao;
});

// rest dao for use in the invitation service
ngModule.factory('invitationRestDao', function(appConfig) {
    var dao = new RestDAO();
    dao.setBaseUri(appConfig.config.keyServerUrl);
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
RestDAO.prototype.get = function(options) {
    options.method = 'GET';
    return this._processRequest(options);
};

/**
 * POST (create) request
 */
RestDAO.prototype.post = function(item, uri, type) {
    return this._processRequest({
        method: 'POST',
        payload: item,
        uri: uri,
        type: type
    });
};

/**
 * PUT (update) request
 */
RestDAO.prototype.put = function(item, uri) {
    return this._processRequest({
        method: 'PUT',
        payload: item,
        uri: uri
    });
};

/**
 * DELETE (remove) request
 */
RestDAO.prototype.remove = function(uri) {
    return this._processRequest({
        method: 'DELETE',
        uri: uri
    });
};

//
// helper functions
//

RestDAO.prototype._processRequest = function(options) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var xhr, format, accept, payload;

        if (typeof options.uri === 'undefined') {
            throw createError(400, 'Bad Request! URI is a mandatory parameter.');
        }

        options.type = options.type || 'json';
        payload = options.payload;

        if (options.type === 'json') {
            format = 'application/json';
            payload = payload ? JSON.stringify(payload) : undefined;
        } else if (options.type === 'xml') {
            format = 'application/xml';
        } else if (options.type === 'text') {
            format = 'text/plain';
        } else if (options.type === 'form') {
            format = 'application/x-www-form-urlencoded; charset=UTF-8';
            accept = 'text/html; charset=UTF-8';
        } else {
            throw createError(400, 'Bad Request! Unhandled data type.');
        }

        xhr = new XMLHttpRequest();
        xhr.open(options.method, self._baseUri + options.uri);
        xhr.setRequestHeader('Accept', accept || format);
        xhr.setRequestHeader('Content-Type', format);

        xhr.onload = function() {
            var res;

            if (options.type === 'json') {
                try {
                    res = JSON.parse(xhr.responseText);
                } catch (e) {
                    res = xhr.responseText;
                }
            } else {
                res = xhr.responseText;
            }

            if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 201 || xhr.status === 304)) {
                resolve(res);
                return;
            }

            reject(createError(xhr.status, (res && res.error) || xhr.statusText));
        };

        xhr.onerror = function() {
            reject(createError(42, 'Error calling ' + options.method + ' on ' + options.uri));
        };

        xhr.send(payload);
    });
};

function createError(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
}