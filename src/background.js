'use strict';

chrome.app.runtime.onLaunched.addListener(function() {

    chrome.runtime.getPlatformInfo(function(info) {
        // don't render statusbar over app UI on iOS
        if (info.os === 'cordova-ios' && window.StatusBar) {
            window.StatusBar.overlaysWebView(false);
        }

        // open chrome app in new window
        chrome.app.window.create('index.html', {
            id: '0',
            innerBounds: {
                width: 1280,
                height: 800
            }
        });
    });

});