define(function(require) {
    'use strict';

    var axe = require('axe'),
        DEBUG_TAG = 'backbutton handler';

    /**
     * The back button handler introduces meaningful behavior fo rthe back button:
     * if there's an open lightbox, close it;
     * if the reader is open in mobile mode, close it;
     * if the navigation is open, close it;
     * if there's nothing else open, shut down the app;
     *
     * @type {Object}
     */
    var backBtnHandler = {
        attachHandler: function(scope) {
            this.scope = scope;
        },
        start: function() {
            document.addEventListener("backbutton", handleBackButton, false);
        },
        stop: function() {
            document.removeEventListener("backbutton", handleBackButton, false);
        }
    };

    function handleBackButton(event) {
        axe.debug(DEBUG_TAG, 'back button pressed');

        // this disarms the default behavior which we NEVER want
        event.preventDefault();
        event.stopPropagation();

        if (backBtnHandler.scope.state.lightbox) {
            // closes the lightbox (error msgs, writer, ...)
            backBtnHandler.scope.$apply(function() {
                backBtnHandler.scope.state.lightbox = undefined;
            });
            axe.debug(DEBUG_TAG, 'lightbox closed');

        } else if (backBtnHandler.scope.state.read && backBtnHandler.scope.state.read.open) {
            // closes the reader
            backBtnHandler.scope.$apply(function() {
                backBtnHandler.scope.state.read.toggle(false);
            });
            axe.debug(DEBUG_TAG, 'reader closed');

        } else if (backBtnHandler.scope.state.nav && backBtnHandler.scope.state.nav.open) {
            // closes the navigation
            backBtnHandler.scope.$apply(function() {
                backBtnHandler.scope.state.nav.toggle(false);
            });
            axe.debug(DEBUG_TAG, 'navigation closed');

        } else {
            // exits the app
            navigator.app.exitApp();
        }
    }

    return backBtnHandler;
});