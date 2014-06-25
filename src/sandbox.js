(function() {
    'use strict';

    // set listener for event from main window
    window.addEventListener('message', function(e) {
        document.body.innerHTML = e.data.replace(/<a /g, '<a target="_blank" ');
    }, false);
})();