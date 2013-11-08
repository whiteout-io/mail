'use strict';

// check for update and restart app automatically
chrome.runtime.onUpdateAvailable.addListener(function(details) {
    console.log("Updating to version " + details.version);
    chrome.runtime.reload();
});
chrome.runtime.requestUpdateCheck(function(status) {
    if (status === "update_found") {
        console.log("Update pending...");
    } else if (status === "no_update") {
        console.log("No update found.");
    } else if (status === "throttled") {
        console.log("Checking updates too frequently.");
    }
});

// open chrome app in new window
chrome.app.runtime.onLaunched.addListener(function() {
    chrome.app.window.create('chrome.html', {
        'bounds': {
            'width': 1024,
            'height': 768
        }
    });
});