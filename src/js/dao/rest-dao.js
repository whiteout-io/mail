define(function(require) {
    'use strict';

    var $ = require('jquery'),
        config = require('js/app-config').config;

    var RestDAO = function(options) {
        if (options && options.baseUri) {
            this._baseUri = options.baseUri;
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
        var acceptHeader;

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

        $.ajax({
            url: this._baseUri + options.uri,
            type: 'GET',
            dataType: options.type,
            headers: {
                'Accept': acceptHeader
            },
            success: function(res, textStatus, xhr) {
                callback(null, res, xhr.status);
            },
            error: function(xhr, textStatus, err) {
                callback({
                    code: xhr.status,
                    errMsg: xhr.statusText,
                    err: err
                });
            }
        });
    };

    /**
     * PUT (create/update) request
     */
    RestDAO.prototype.put = function(item, uri, callback) {
        $.ajax({
            url: this._baseUri + uri,
            type: 'PUT',
            data: JSON.stringify(item),
            contentType: 'application/json',
            success: function(res, textStatus, xhr) {
                callback(null, res, xhr.status);
            },
            error: function(xhr, textStatus, err) {
                callback({
                    code: xhr.status,
                    errMsg: xhr.statusText,
                    err: err
                });
            }
        });
    };

    /**
     * DELETE (remove) request
     */
    RestDAO.prototype.remove = function(uri, callback) {
        $.ajax({
            url: this._baseUri + uri,
            type: 'DELETE',
            success: function(res, textStatus, xhr) {
                callback(null, res, xhr.status);
            },
            error: function(xhr, textStatus, err) {
                callback({
                    code: xhr.status,
                    errMsg: xhr.statusText,
                    err: err
                });
            }
        });
    };

    return RestDAO;
});