'use strict';

chrome.app.runtime.onLaunched.addListener(function() {
    chrome.app.window.create('ui/index.html', {
        'bounds': {
            'width': 1024,
            'height': 768
        }
    });
});