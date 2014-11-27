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
 * @param  {Function} callback(error, ciphertext)
 * @return {String} The base64 encoded ciphertext
 */
Crypto.prototype.encrypt = function(plaintext, key, iv, callback) {
    var ct;

    try {
        ct = aes.encrypt(plaintext, key, iv);
    } catch (err) {
        callback(err);
        return;
    }

    callback(null, ct);
};

/**
 * Decrypt ciphertext suing AES-GCM
 * @param  {String}   ciphertext The base64 encoded ciphertext
 * @param  {String}   key The base64 encoded key
 * @param  {String}   iv The base64 encoded IV
 * @param  {Function} callback(error, plaintext)
 * @return {String} The decrypted plaintext in UTF-16
 */
Crypto.prototype.decrypt = function(ciphertext, key, iv, callback) {
    var pt;

    try {
        pt = aes.decrypt(ciphertext, key, iv);
    } catch (err) {
        callback(err);
        return;
    }

    callback(null, pt);
};

/**
 * Do PBKDF2 key derivation in a WebWorker thread
 */
Crypto.prototype.deriveKey = function(password, salt, keySize, callback) {
    startWorker({
        script: config.workerPath + '/pbkdf2-worker.min.js',
        args: {
            password: password,
            salt: salt,
            keySize: keySize
        },
        callback: callback,
        noWorker: function() {
            return pbkdf2.getKey(password, salt, keySize);
        }
    });
};

//
// helper functions
//

function startWorker(options) {
    // check for WebWorker support
    if (window.Worker) {
        // init webworker thread
        var worker = new Worker(options.script);
        worker.onmessage = function(e) {
            if (e.data.err) {
                options.callback(e.data.err);
                return;
            }
            // return result from the worker
            options.callback(null, e.data);
        };
        worker.onerror = function(e) {
            // show error message in logger
            axe.error('Error handling web worker: Line ' + e.lineno + ' in ' + e.filename + ': ' + e.message);
            // return error
            options.callback({
                errMsg: (e.message) ? e.message : e
            });
            return;
        };
        // send data to the worker
        worker.postMessage(options.args);
        return;
    }

    // no WebWorker support... do synchronous call
    var result;
    try {
        result = options.noWorker();
    } catch (e) {
        // return error
        options.callback({
            errMsg: (e.message) ? e.message : e
        });
        return;
    }
    options.callback(null, result);
}