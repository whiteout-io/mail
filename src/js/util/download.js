'use strict';

var ngModule = angular.module('woUtil');
ngModule.service('download', Download);
module.exports = Download;

var util = require('crypto-lib').util;

/**
 * A download helper to abstract platform specific behavior
 */
function Download() {}

/**
 * Create download link and click on it.
 */
Download.prototype.createDownload = function(options) {
    var contentType = options.contentType || 'application/octet-stream';
    var filename = options.filename || 'file';
    var content = options.content;
    var a = document.createElement('a');
    var supportsBlob;

    try {
        supportsBlob = !!new Blob();
    } catch (e) {}

    if (typeof a.download !== 'undefined' && supportsBlob) {
        // ff 30+, chrome 27+ (android: 37+)
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = window.URL.createObjectURL(new Blob([content], {
            type: contentType
        }));
        a.download = filename;
        a.click();
        setTimeout(function() {
            window.URL.revokeObjectURL(a.href);
            document.body.removeChild(a);
        }, 10); // arbitrary, just get it off the main thread
    } else if (window.navigator.msSaveBlob) {
        // ie 10+
        window.navigator.msSaveBlob(new Blob([content], {
            type: contentType
        }), filename);
    } else if (supportsBlob) {
        // safari actually makes no sense:
        // - you can't open a new window
        // - the file system api is dead
        // - download attribute doesn't work
        // - behaves randomly (opens a new tab or doesn't, downloads stuff or doesn't, ...)
        var url = window.URL.createObjectURL(new Blob([content], {
            type: contentType
        }));
        var newTab = window.open(url, '_blank');
        if (!newTab) {
            window.location.href = url;
        }
    } else {
        // anything else, where anything at all is better than nothing
        if (typeof content !== 'string' && content.buffer) {
            content = util.arrBuf2BinStr(content.buffer);
        }
        window.open('data:' + contentType + ';base64,' + btoa(content), '_blank');
    }
};