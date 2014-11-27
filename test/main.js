'use strict';

//
// Polyfills
//

// Mozilla bind polyfill because phantomjs is stupid
if (!Function.prototype.bind) {
    Function.prototype.bind = function(oThis) {
        if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5 internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }

        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            FNOP = function() {},
            fBound = function() {
                return fToBind.apply(this instanceof FNOP && oThis ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        FNOP.prototype = this.prototype;
        fBound.prototype = new FNOP();

        return fBound;
    };
}

// a warm round of applause for phantomjs for missing events
(function() {
    if (!window.CustomEvent) {
        var CustomEvent = function(event, params) {
            params = params || {
                bubbles: false,
                cancelable: false,
                detail: undefined
            };
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        };

        CustomEvent.prototype = window.Event.prototype;

        window.CustomEvent = CustomEvent;
    }
})();

//
// Test setup
//

chai.config.includeStack = true;

// set worker path for tests
require('../src/js/app-config').config.workerPath = '../lib';

var axe = require('axe-logger');
axe.removeAppender(axe.defaultAppender);

// include angular modules
require('../src/js/app-config');
require('../src/js/util');
require('../src/js/crypto');
require('../src/js/service');
require('../src/js/email');