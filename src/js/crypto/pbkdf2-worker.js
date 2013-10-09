(function() {
    'use strict';

    // import web worker dependencies
    importScripts('../../lib/require.js');

    /**
     * In the web worker thread context, 'this' and 'self' can be used as a global
     * variable namespace similar to the 'window' object in the main thread
     */
    self.onmessage = function(e) {
        // fetch dependencies via require.js
        require(['../../require-config'], function() {
            require.config({
                baseUrl: '../../lib'
            });

            require(['js/crypto/pbkdf2'], function(pbkdf2) {

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

            });
        });
    };

}());