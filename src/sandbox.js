(function() {
    'use strict';

    // set listener for event from main window
    window.addEventListener('message', function(e) {
        var html = e.data.html;

        // make links open in a new window
        html = html.replace(/<a /g, '<a target="_blank" ');

        // remove sources where necessary
        if (e.data.removeImages) {
            html = html.replace(/(<img[^>]+\b)src=['"][^'">]+['"]/ig, function(match, prefix) {
                return prefix;
            });
        }

        document.body.innerHTML = html;
    }, false);
})();