define(function(require) {
    'use strict';

    var PGP = require('js/crypto/pgp'),
        expect = chai.expect;

    describe('PGP Crypto Api unit tests', function() {
        this.timeout(20000);

        var pgp,
            user = 'whiteout.test@t-online.de',
            passphrase = 'asdf',
            keySize = 512,
            keyId = 'F6F60E9B42CDFF4C',
            pubkey = '-----BEGIN PGP PUBLIC KEY BLOCK-----\r\n' +
            'Version: OpenPGP.js v0.6.0\r\n' +
            'Comment: http://openpgpjs.org\r\n' +
            '\r\n' +
            'xk0EUlhMvAEB/2MZtCUOAYvyLFjDp3OBMGn3Ev8FwjzyPbIF0JUw+L7y2XR5\r\n' +
            'RVGvbK88unV3cU/1tOYdNsXI6pSp/Ztjyv7vbBUAEQEAAc0pV2hpdGVvdXQg\r\n' +
            'VXNlciA8d2hpdGVvdXQudGVzdEB0LW9ubGluZS5kZT7CXAQQAQgAEAUCUlhM\r\n' +
            'vQkQ9vYOm0LN/0wAAAW4Af9C+kYW1AvNWmivdtr0M0iYCUjM9DNOQH1fcvXq\r\n' +
            'IiN602mWrkd8jcEzLsW5IUNzVPLhrFIuKyBDTpLnC07Loce1\r\n' +
            '=6XMW\r\n' +
            '-----END PGP PUBLIC KEY BLOCK-----\r\n\r\n',
            privkey = '-----BEGIN PGP PRIVATE KEY BLOCK-----\r\n' +
            'Version: OpenPGP.js v0.6.0\r\n' +
            'Comment: http://openpgpjs.org\r\n' +
            '\r\n' +
            'xcBeBFJYTLwBAf9jGbQlDgGL8ixYw6dzgTBp9xL/BcI88j2yBdCVMPi+8tl0\r\n' +
            'eUVRr2yvPLp1d3FP9bTmHTbFyOqUqf2bY8r+72wVABEBAAH+AwMIhNB4ivtv\r\n' +
            'Y2xg6VeMcjjHxZayESHACV+nQx5Tx6ev6xzIF1Qh72fNPDppLhFSFOuTTMsU\r\n' +
            'kTN4c+BVYt29spH+cA1jcDAxQ2ULrNAXo+hheOqhpedTs8aCbcLFkJAS16hk\r\n' +
            'YSk4OnJgp/z24rVju1SHRSFbgundPzmNgXeX9e8IkviGhhQ11Wc5YwVkx03t\r\n' +
            'Z3MdDMF0jyhopbPIoBdyJB0dhvBh98w3JmwpYh9wjUA9MBHD1tvHpRmSZ3BM\r\n' +
            'UCmATn2ZLWBRWiYqFbgDnL1GM80pV2hpdGVvdXQgVXNlciA8d2hpdGVvdXQu\r\n' +
            'dGVzdEB0LW9ubGluZS5kZT7CXAQQAQgAEAUCUlhMvQkQ9vYOm0LN/0wAAAW4\r\n' +
            'Af9C+kYW1AvNWmivdtr0M0iYCUjM9DNOQH1fcvXqIiN602mWrkd8jcEzLsW5\r\n' +
            'IUNzVPLhrFIuKyBDTpLnC07Loce1\r\n' +
            '=ULta\r\n' +
            '-----END PGP PRIVATE KEY BLOCK-----\r\n';

        beforeEach(function() {
            pgp = new PGP();
        });

        afterEach(function() {});

        describe('Generate key pair', function() {
            it('should fail', function(done) {
                pgp.generateKeys({
                    emailAddress: 'whiteout.test@t-onlinede',
                    keySize: keySize,
                    passphrase: passphrase
                }, function(err, keys) {
                    expect(err).to.exist;
                    expect(keys).to.not.exist;
                    done();
                });
            });
            it('should fail', function(done) {
                pgp.generateKeys({
                    emailAddress: 'whiteout.testt-online.de',
                    keySize: keySize,
                    passphrase: passphrase
                }, function(err, keys) {
                    expect(err).to.exist;
                    expect(keys).to.not.exist;
                    done();
                });
            });
            it('should work', function(done) {
                pgp.generateKeys({
                    emailAddress: user,
                    keySize: keySize,
                    passphrase: passphrase
                }, function(err, keys) {
                    expect(err).to.not.exist;
                    expect(keys.keyId).to.exist;
                    expect(keys.privateKeyArmored).to.exist;
                    expect(keys.publicKeyArmored).to.exist;
                    done();
                });
            });
        });

        describe('Import/Export key pair', function() {
            it('should fail', function(done) {
                pgp.importKeys({
                    passphrase: 'asd',
                    privateKeyArmored: privkey,
                    publicKeyArmored: pubkey
                }, function(err) {
                    expect(err).to.exist;
                    expect(err.message).to.equal('Incorrect passphrase!');

                    pgp.exportKeys(function(err, keys) {
                        expect(err).to.exist;
                        expect(keys).to.not.exist;
                        done();
                    });
                });
            });
            it('should work', function(done) {
                pgp.importKeys({
                    passphrase: passphrase,
                    privateKeyArmored: privkey,
                    publicKeyArmored: pubkey
                }, function(err) {
                    expect(err).to.not.exist;

                    pgp.exportKeys(function(err, keys) {
                        expect(err).to.not.exist;
                        expect(keys.keyId).to.equal(keyId);
                        expect(keys.privateKeyArmored.replace(/\r/g, '')).to.equal(privkey.replace(/\r/g, ''));
                        expect(keys.publicKeyArmored.replace(/\r/g, '')).to.equal(pubkey.replace(/\r/g, ''));
                        done();
                    });
                });
            });
        });

        describe('Change passphrase of private key', function() {
            it('should work', function(done) {
                pgp.changePassphrase({
                    privateKeyArmored: privkey,
                    oldPassphrase: passphrase,
                    newPassphrase: 'yxcv'
                }, function(err, reEncryptedKey) {
                    expect(err).to.not.exist;
                    expect(reEncryptedKey).to.exist;

                    pgp.importKeys({
                        passphrase: 'yxcv',
                        privateKeyArmored: reEncryptedKey,
                        publicKeyArmored: pubkey
                    }, function(err) {
                        expect(err).to.not.exist;
                        done();
                    });
                });
            });

            it('should fail when passphrases are equal', function(done) {
                pgp.changePassphrase({
                    privateKeyArmored: privkey,
                    oldPassphrase: passphrase,
                    newPassphrase: passphrase
                }, function(err, reEncryptedKey) {
                    expect(err).to.exist;
                    expect(reEncryptedKey).to.not.exist;
                    done();
                });
            });

            it('should fail when old passphrase is incorrect', function(done) {
                pgp.changePassphrase({
                    privateKeyArmored: privkey,
                    oldPassphrase: 'asd',
                    newPassphrase: 'yxcv'
                }, function(err, reEncryptedKey) {
                    expect(err).to.exist;
                    expect(reEncryptedKey).to.not.exist;
                    done();
                });
            });
        });

        describe('Encrypt/Sign/Decrypt/Verify', function() {
            var message = 'asdfs\n\nThursday, Nov 21, 2013 7:38 PM asdf@example.com wrote:\n' +
                '> asdf\n' +
                '> \n' +
                '> Thursday, Nov 21, 2013 7:32 PM asdf@example.com wrote:\n' +
                '> > secret 3';

            beforeEach(function(done) {
                pgp.importKeys({
                    passphrase: passphrase,
                    privateKeyArmored: privkey,
                    publicKeyArmored: pubkey
                }, function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });

            describe('Get KeyId', function() {
                it('should work without param', function() {
                    var keyId = pgp.getKeyId();
                    expect(keyId).to.equal('F6F60E9B42CDFF4C');
                });

                it('should work with param', function() {
                    var keyId = pgp.getKeyId(pubkey);
                    expect(keyId).to.equal('F6F60E9B42CDFF4C');
                });
            });

            describe('Get Fingerprint', function() {
                it('should work without param', function() {
                    var fingerprint = pgp.getFingerprint();
                    expect(fingerprint).to.equal('5856CEF789C3A307E8A1B976F6F60E9B42CDFF4C');
                });

                it('should work with param', function() {
                    var fingerprint = pgp.getFingerprint(pubkey);
                    expect(fingerprint).to.equal('5856CEF789C3A307E8A1B976F6F60E9B42CDFF4C');
                });
            });

            describe('getKeyParams', function() {
                it('should work with param', function() {
                    var params = pgp.getKeyParams(pubkey);
                    expect(params.fingerprint).to.equal('5856CEF789C3A307E8A1B976F6F60E9B42CDFF4C');
                    expect(params._id).to.equal("F6F60E9B42CDFF4C");
                    expect(params.bitSize).to.equal(keySize);
                    expect(params.userId).to.equal("whiteout.test@t-online.de");
                    expect(params.userIds[0].name).to.equal("Whiteout User");
                    expect(params.userIds[0].emailAddress).to.equal("whiteout.test@t-online.de");
                    expect(params.algorithm).to.equal("rsa_encrypt_sign");
                });

                it('should work without param', function() {
                    var params = pgp.getKeyParams();
                    expect(params.fingerprint).to.equal('5856CEF789C3A307E8A1B976F6F60E9B42CDFF4C');
                    expect(params._id).to.equal("F6F60E9B42CDFF4C");
                    expect(params.bitSize).to.equal(keySize);
                    expect(params.userId).to.equal("whiteout.test@t-online.de");
                    expect(params.userIds[0].name).to.equal("Whiteout User");
                    expect(params.userIds[0].emailAddress).to.equal("whiteout.test@t-online.de");
                    expect(params.algorithm).to.equal("rsa_encrypt_sign");
                });
            });

            describe('Encrypt and sign', function() {
                it('should fail', function(done) {
                    var input = null;

                    pgp.encrypt(input, [pubkey], function(err, ct) {
                        expect(err).to.exist;
                        expect(ct).to.not.exist;
                        done();
                    });
                });

                it('should work', function(done) {
                    pgp.encrypt(message, [pubkey], function(err, ct) {
                        expect(err).to.not.exist;
                        expect(ct).to.exist;
                        done();
                    });
                });
            });

            describe('Decrypt and verify', function() {
                var ciphertext;

                beforeEach(function(done) {
                    pgp.encrypt(message, [pubkey], function(err, ct) {
                        expect(err).to.not.exist;
                        expect(ct).to.exist;
                        ciphertext = ct;
                        done();
                    });
                });

                it('should fail', function(done) {
                    var input = 'asdfa\rsdf';

                    pgp.decrypt(input, pubkey, function(err, pt) {
                        expect(err).to.exist;
                        expect(pt).to.not.exist;
                        done();
                    });
                });

                it('should work', function(done) {
                    pgp.decrypt(ciphertext, pubkey, function(err, pt) {
                        expect(err).to.not.exist;
                        expect(pt).to.equal(message);
                        done();
                    });
                });
            });

        });

    });
});