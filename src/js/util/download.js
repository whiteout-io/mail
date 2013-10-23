define(function() {
    'use strict';

    var dl = {};

    dl.createDownload = function(content, filename, contentType) {
        contentType = contentType || 'application/octet-stream';
        chrome.fileSystem.chooseEntry({
            type: 'saveFile',
            suggestedName: filename
        }, function(file) {
            if (!file) {
                return;
            }
            file.createWriter(function(writer) {
                writer.onerror = console.error;
                writer.onwriteend = function() {};
                writer.write(new Blob([content], {
                    type: contentType
                }));
            }, console.error);
        });
    };

    return dl;
});