define(function(require) {
    'use strict';

    var config = require('js/app-config').config;

    var RestDAO = function(baseUri) {
        if (baseUri) {
            this._baseUri = baseUri;
        } else {
            this._baseUri = config.cloudUrl;
        }
    };

    /**
     * GET (read) request
     * @param {String} options.uri URI relative to the base uri to perform the GET request with.
     * @param {String} options.type (optional) The type of data that you're expecting back from the server: json, xml, text. Default: json.
     */
    RestDAO.prototype.get = function(options, callback) {
        var xhr, acceptHeader;

        if (typeof options.uri === 'undefined') {
            callback({
                code: 400,
                errMsg: 'Bad Request! URI is a mandatory parameter.'
            });
            return;
        }

        options.type = options.type || 'json';

        if (options.type === 'json') {
            acceptHeader = 'application/json';
        } else if (options.type === 'xml') {
            acceptHeader = 'application/xml';
        } else if (options.type === 'text') {
            acceptHeader = 'text/plain';
        } else {
            callback({
                code: 400,
                errMsg: 'Bad Request! Unhandled data type.'
            });
            return;
        }

        xhr = new XMLHttpRequest();
        xhr.open('GET', this._baseUri + options.uri);
        xhr.setRequestHeader('Accept', acceptHeader);

        xhr.onload = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var res;
                if (options.type === 'json') {
                    res = JSON.parse(xhr.responseText);
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
                errMsg: 'Error calling GET on ' + options.uri
            });
        };

        xhr.send();
    };

    /**
     * PUT (create/update) request
     */
    RestDAO.prototype.put = function(item, uri, callback) {
        var xhr;

        xhr = new XMLHttpRequest();
        xhr.open('PUT', this._baseUri + uri);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onload = function() {
            if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 201 || xhr.status === 304)) {
                callback(null, xhr.responseText, xhr.status);
                return;
            }

            callback({
                code: xhr.status,
                errMsg: xhr.statusText
            });
        };

        xhr.onerror = function() {
            callback({
                errMsg: 'Error calling PUT on ' + uri
            });
        };

        xhr.send(JSON.stringify(item));
    };

    /**
     * DELETE (remove) request
     */
    RestDAO.prototype.remove = function(uri, callback) {
        var xhr;

        xhr = new XMLHttpRequest();
        xhr.open('DELETE', this._baseUri + uri);

        xhr.onload = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                callback(null, xhr.responseText, xhr.status);
                return;
            }

            callback({
                code: xhr.status,
                errMsg: xhr.statusText
            });
        };

        xhr.onerror = function() {
            callback({
                errMsg: 'Error calling DELETE on ' + uri
            });
        };

        xhr.send();
    };

    return RestDAO;
});