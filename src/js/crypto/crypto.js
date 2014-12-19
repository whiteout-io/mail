'use strict';

var ngModule = angular.module('woCrypto');
ngModule.service('crypto', Crypto);
module.exports = Crypto;

var aes = require('crypto-lib').aes,
    pbkdf2 = require('./pbkdf2'),
    config = require('../app-config').config,
    axe = require('axe-logger');

/**
 * High level crypto api that invokes native crypto (if available) and
 * gracefully degrades to JS crypto (if unavailable)
 */
function Crypto() {}

/**
 * Encrypt plaintext using AES-GCM.
 * @param  {String}   plaintext The input string in UTF-16
 * @param  {String}   key The base64 encoded key
 * @param  {String}   iv The base64 encoded IV
 * @return {String} The base64 encoded ciphertext
 */
Crypto.prototype.encrypt = function(plaintext, key, iv) {
    return new Promise(function(resolve) {
        var ct = aes.encrypt(plaintext, key, iv);
        resolve(ct);
    });
};

/**
 * Decrypt ciphertext suing AES-GCM
 * @param  {String}   ciphertext The base64 encoded ciphertext
 * @param  {String}   key The base64 encoded key
 * @param  {String}   iv The base64 encoded IV
 * @return {String} The decrypted plaintext in UTF-16
 */
Crypto.prototype.decrypt = function(ciphertext, key, iv) {
    return new Promise(function(resolve) {
        var pt = aes.decrypt(ciphertext, key, iv);
        resolve(pt);
    });
};

/**
 * Do PBKDF2 key derivation in a WebWorker thread
 */
Crypto.prototype.deriveKey = function(password, salt, keySize) {
    return this.startWorker({
        script: config.workerPath + '/pbkdf2-worker.min.js',
        args: {
            password: password,
            salt: salt,
            keySize: keySize
        },
        noWorker: function() {
            return pbkdf2.getKey(password, salt, keySize);
        }
    });
};

//
// helper functions
//

Crypto.prototype.startWorker = function(options) {
    return new Promise(function(resolve, reject) {
        // check for WebWorker support
        if (window.Worker) {
            // init webworker thread
            var worker = new Worker(options.script);
            worker.onmessage = function(e) {
                // return result from the worker
                if (e.data.err) {
                    reject(e.data.err);
                } else {
                    resolve(e.data);
                }
            };
            worker.onerror = function(e) {
                // show error message in logger
                axe.error('Error handling web worker: Line ' + e.lineno + ' in ' + e.filename + ': ' + e.message);
                // return error
                reject(e);
            };
            // send data to the worker
            worker.postMessage(options.args);
            return;
        }

        // no WebWorker support... do synchronous call
        var result = options.noWorker();
        resolve(result);
    });
};