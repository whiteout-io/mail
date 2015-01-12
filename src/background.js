'use strict';

chrome.app.runtime.onLaunched.addListener(function() {

    // open chrome app in new window
    chrome.app.window.create('index.html', {
        id: '0',
        innerBounds: {
            width: 1280,
            height: 800
        }
    });

});