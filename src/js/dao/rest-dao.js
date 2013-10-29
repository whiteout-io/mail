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
     */
    RestDAO.prototype.get = function(uri, callback) {
        $.ajax({
            url: this._baseUri + uri,
            type: 'GET',
            dataType: 'json',
            headers: {
                'Accept': 'application/json',
            },
            success: function(res) {
                callback(null, res);
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
            success: function() {
                callback();
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
            success: function() {
                callback();
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