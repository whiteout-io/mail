define(function() {
    'use strict';

    var dl = {};

    dl.createDownload = function(options, callback) {
        var contentType = options.contentType || 'application/octet-stream';

        chrome.fileSystem.chooseEntry({
            type: 'saveFile',
            suggestedName: options.filename
        }, onEntry);

        function onEntry(file) {
            if (!file) {
                callback();
                return;
            }
            file.createWriter(onWriter, onError);
        }

        function onWriter(writer) {
            writer.onerror = onError;
            writer.onwriteend = onEnd;
            writer.write(new Blob([options.content], {
                type: contentType
            }));
        }

        function onError(e) {
            console.error(e);
            callback({
                errMsg: 'Error exporting keypair to file!'
            });
        }

        function onEnd() {
            callback();
        }
    };

    return dl;
});