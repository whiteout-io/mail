/**
 * High level crypto api that invokes native crypto (if available) and
 * gracefully degrades to JS crypto (if unavailable)
 */
define(function(require) {
    'use strict';

    var util = require('cryptoLib/util'),
        aes = require('cryptoLib/aes-cbc'),
        rsa = require('cryptoLib/rsa'),
        cryptoBatch = require('cryptoLib/crypto-batch'),
        pbkdf2 = require('js/crypto/pbkdf2'),
        app = require('js/app-config');

    var self = {},
        passBasedKey,
        BATCH_WORKER = '/crypto/crypto-batch-worker.js',
        PBKDF2_WORKER = '/crypto/pbkdf2-worker.js';

    /**
     * Initializes the crypto modules by fetching the user's
     * encrypted secret key from storage and storing it in memory.
     */
    self.init = function(args, callback) {
        // valdiate input
        if (!args.emailAddress || !args.keySize || !args.rsaKeySize) {
            callback({
                errMsg: 'Crypto init failed. Not all args set!'
            });
            return;
        }

        self.emailAddress = args.emailAddress;
        self.keySize = args.keySize;
        self.ivSize = args.keySize;
        self.rsaKeySize = args.rsaKeySize;

        // derive PBKDF2 from password in web worker thread
        self.deriveKey(args.password, self.keySize, function(err, derivedKey) {
            if (err) {
                callback(err);
                return;
            }

            // remember pbkdf2 for later use
            passBasedKey = derivedKey;

            // check if key exists
            if (!args.storedKeypair) {
                // generate keys, encrypt and persist if none exists
                generateKeypair(derivedKey);
            } else {
                // decrypt key
                decryptKeypair(args.storedKeypair, derivedKey);
            }

        });

        function generateKeypair(derivedKey) {
            // generate RSA keypair in web worker
            rsa.generateKeypair(self.rsaKeySize, function(err, generatedKeypair) {
                if (err) {
                    callback(err);
                    return;
                }

                // encrypt keypair
                var iv = util.random(self.ivSize);
                var encryptedPrivateKey = aes.encrypt(generatedKeypair.privkeyPem, derivedKey, iv);

                // new encrypted keypair object
                var newKeypair = {
                    publicKey: {
                        _id: generatedKeypair._id,
                        userId: self.emailAddress,
                        publicKey: generatedKeypair.pubkeyPem
                    },
                    privateKey: {
                        _id: generatedKeypair._id,
                        userId: self.emailAddress,
                        encryptedKey: encryptedPrivateKey,
                        iv: iv
                    }
                };

                // return generated keypair for storage in keychain dao
                callback(null, newKeypair);
            });
        }

        function decryptKeypair(storedKeypair, derivedKey) {
            var decryptedPrivateKey;

            // validate input
            if (!storedKeypair || !storedKeypair.privateKey || !storedKeypair.privateKey.encryptedKey || !storedKeypair.privateKey.iv) {
                callback({
                    errMsg: 'Incomplete arguments for private key decryption!'
                });
                return;
            }

            // try to decrypt with derivedKey
            try {
                var prK = storedKeypair.privateKey;
                decryptedPrivateKey = aes.decrypt(prK.encryptedKey, derivedKey, prK.iv);
            } catch (ex) {
                callback({
                    errMsg: 'Wrong password!'
                });
                return;
            }
            // set rsa keys
            rsa.init(storedKeypair.publicKey.publicKey, decryptedPrivateKey, storedKeypair.publicKey._id);

            callback();
        }
    };

    /**
     * Do PBKDF2 key derivation in a WebWorker thread
     */
    self.deriveKey = function(password, keySize, callback) {
        startWorker({
            script: PBKDF2_WORKER,
            args: {
                password: password,
                keySize: keySize
            },
            callback: callback,
            noWorker: function() {
                return pbkdf2.getKey(password, keySize);
            }
        });
    };

    //
    // En/Decrypt a list of items with AES in a WebWorker thread
    //

    self.symEncryptList = function(list, callback) {
        var key, envelope, envelopes = [];

        // generate single secret key shared for all list items
        key = util.random(self.keySize);

        // package objects into batchable envelope format
        list.forEach(function(i) {
            envelope = {
                id: i.id,
                plaintext: i,
                key: key,
                iv: util.random(self.ivSize)
            };
            envelopes.push(envelope);
        });

        startWorker({
            script: BATCH_WORKER,
            args: {
                type: 'symEncrypt',
                list: envelopes
            },
            callback: function(err, encryptedList) {
                // return generated secret key
                callback(err, {
                    key: key,
                    list: encryptedList
                });
            },
            noWorker: function() {
                return cryptoBatch.authEncryptList(envelopes);
            }
        });
    };

    self.symDecryptList = function(list, keys, callback) {
        startWorker({
            script: BATCH_WORKER,
            args: {
                type: 'symDecrypt',
                list: list,
                keys: keys
            },
            callback: callback,
            noWorker: function() {
                return cryptoBatch.authDecryptList(list, keys);
            }
        });
    };

    //
    // En/Decrypt something speficially using the user's secret key
    //

    self.encryptListForUser = function(list, receiverPubkeys, callback) {
        var envelope, envelopes = [];

        if (!receiverPubkeys || receiverPubkeys.length !== 1) {
            callback({
                errMsg: 'Encryption is currently implemented for only one receiver!'
            });
            return;
        }

        var keypair = rsa.exportKeys();
        var senderPrivkey = {
            _id: keypair._id,
            privateKey: keypair.privkeyPem
        };

        // package objects into batchable envelope format
        list.forEach(function(i) {
            envelope = {
                id: i.id,
                plaintext: i,
                key: util.random(self.keySize),
                iv: util.random(self.ivSize),
                receiverPk: receiverPubkeys[0]._id
            };
            envelopes.push(envelope);
        });

        startWorker({
            script: BATCH_WORKER,
            args: {
                type: 'asymEncrypt',
                list: envelopes,
                senderPrivkey: senderPrivkey,
                receiverPubkeys: receiverPubkeys
            },
            callback: callback,
            noWorker: function() {
                return cryptoBatch.encryptListForUser(envelopes, receiverPubkeys, senderPrivkey);
            }
        });
    };

    self.decryptListForUser = function(list, senderPubkeys, callback) {
        if (!senderPubkeys || senderPubkeys < 1) {
            callback({
                errMsg: 'Sender public keys must be set!'
            });
            return;
        }

        var keypair = rsa.exportKeys();
        var receiverPrivkey = {
            _id: keypair._id,
            privateKey: keypair.privkeyPem
        };

        startWorker({
            script: BATCH_WORKER,
            args: {
                type: 'asymDecrypt',
                list: list,
                receiverPrivkey: receiverPrivkey,
                senderPubkeys: senderPubkeys
            },
            callback: callback,
            noWorker: function() {
                return cryptoBatch.decryptListForUser(list, senderPubkeys, receiverPrivkey);
            }
        });
    };

    //
    // Re-encrypt keys item and items seperately
    //

    self.reencryptListKeysForUser = function(list, senderPubkeys, callback) {
        var keypair = rsa.exportKeys();
        var receiverPrivkey = {
            _id: keypair._id,
            privateKey: keypair.privkeyPem
        };

        startWorker({
            script: BATCH_WORKER,
            args: {
                type: 'reencrypt',
                list: list,
                receiverPrivkey: receiverPrivkey,
                senderPubkeys: senderPubkeys,
                symKey: passBasedKey
            },
            callback: callback,
            noWorker: function() {
                return cryptoBatch.reencryptListKeysForUser(list, senderPubkeys, receiverPrivkey, passBasedKey);
            }
        });
    };

    self.decryptKeysAndList = function(list, callback) {
        startWorker({
            script: BATCH_WORKER,
            args: {
                type: 'decryptItems',
                list: list,
                symKey: passBasedKey
            },
            callback: callback,
            noWorker: function() {
                return cryptoBatch.decryptKeysAndList(list, passBasedKey);
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
            var worker = new Worker(app.config.workerPath + options.script);
            worker.onmessage = function(e) {
                if (e.data.err) {
                    options.callback(e.data.err);
                    return;
                }
                // return result from the worker
                options.callback(null, e.data);
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

    return self;
});