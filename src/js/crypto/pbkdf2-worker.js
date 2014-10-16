'use strict';

importScripts('forge.min.js');

var pbkdf2 = require('./pbkdf2');

/**
 * In the web worker thread context, 'this' and 'self' can be used as a global
 * variable namespace similar to the 'window' object in the main thread
 */
self.onmessage = function(e) {
    var i = e.data,
        key = null;

    if (i.password && i.salt && i.keySize) {
        // start deriving key
        key = pbkdf2.getKey(i.password, i.salt, i.keySize);

    } else {
        throw 'Not all arguments for web worker crypto are defined!';
    }

    // pass output back to main thread
    self.postMessage(key);
};