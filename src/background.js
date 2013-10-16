'use strict';

chrome.app.runtime.onLaunched.addListener(function() {
    chrome.app.window.create('chrome.html', {
        'bounds': {
            'width': 1024,
            'height': 768
        }
    });
});