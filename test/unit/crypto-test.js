define(function(require) {
    'use strict';

    var Crypto = require('js/crypto/crypto'),
        util = require('js/crypto/util'),
        expect = chai.expect;

    describe('Crypto unit tests', function() {
        this.timeout(20000);

        var crypto,
            password = 'password',
            keySize = 128,
            ivSize = 128;

        beforeEach(function() {
            crypto = new Crypto();
        });

        afterEach(function() {});

        describe('AES encrypt/decrypt', function() {
            it('should work', function(done) {
                var plaintext = 'Hello, World!';
                var key = util.random(keySize);
                var iv = util.random(ivSize);

                crypto.encrypt(plaintext, key, iv, function(err, ciphertext) {
                    expect(err).to.not.exist;
                    expect(ciphertext).to.exist;

                    crypto.decrypt(ciphertext, key, iv, function(err, decrypted) {
                        expect(err).to.not.exist;
                        expect(decrypted).to.equal(plaintext);

                        done();
                    });
                });
            });
        });

        describe("PBKDF2 (Async/Worker)", function() {
            it('should work', function(done) {
                var salt = util.random(keySize);

                crypto.deriveKey(password, salt, keySize, function(err, key) {
                    expect(err).to.not.exist;
                    expect(util.base642Str(key).length * 8).to.equal(keySize);

                    done();
                });
            });

        });

    });
});