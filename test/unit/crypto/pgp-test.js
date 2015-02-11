'use strict';

var PGP = require('../../../src/js/crypto/pgp');

describe('PGP Crypto Api unit tests', function() {
    this.timeout(20000);

    var pgp,
        user = 'whiteout.test@t-online.de',
        passphrase = 'asdf',
        keySize = 512,
        keyId = 'F6F60E9B42CDFF4C',
        pubkey = '-----BEGIN PGP PUBLIC KEY BLOCK-----\r\n' +
        'Version: OpenPGP.js v0.9.0\r\n' +
        'Comment: Whiteout Mail - https://whiteout.io\r\n' +
        '\r\n' +
        'xk0EUlhMvAEB/2MZtCUOAYvyLFjDp3OBMGn3Ev8FwjzyPbIF0JUw+L7y2XR5\r\n' +
        'RVGvbK88unV3cU/1tOYdNsXI6pSp/Ztjyv7vbBUAEQEAAc0pV2hpdGVvdXQg\r\n' +
        'VXNlciA8d2hpdGVvdXQudGVzdEB0LW9ubGluZS5kZT7CXAQQAQgAEAUCUlhM\r\n' +
        'vQkQ9vYOm0LN/0wAAAW4Af9C+kYW1AvNWmivdtr0M0iYCUjM9DNOQH1fcvXq\r\n' +
        'IiN602mWrkd8jcEzLsW5IUNzVPLhrFIuKyBDTpLnC07Loce1\r\n' +
        '=6XMW\r\n' +
        '-----END PGP PUBLIC KEY BLOCK-----\r\n\r\n',
        privkey = '-----BEGIN PGP PRIVATE KEY BLOCK-----\r\n' +
        'Version: OpenPGP.js v0.9.0\r\n' +
        'Comment: Whiteout Mail - https://whiteout.io\r\n' +
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
            }).catch(function(err) {
                expect(err.message).to.match(/options/);
                done();
            });
        });
        it('should fail', function(done) {
            pgp.generateKeys({
                emailAddress: 'whiteout.testt-online.de',
                keySize: keySize,
                passphrase: passphrase
            }).catch(function(err) {
                expect(err.message).to.match(/options/);
                done();
            });
        });
        it('should work without realname', function(done) {
            var keyObject;

            pgp.generateKeys({
                emailAddress: user,
                realname: undefined,
                keySize: keySize,
                passphrase: passphrase
            }).then(function(keys) {
                expect(keys.keyId).to.exist;
                expect(keys.privateKeyArmored).to.exist;
                expect(keys.publicKeyArmored).to.exist;
                keyObject = keys;

                // test encrypt/decrypt
                return pgp.importKeys({
                    passphrase: passphrase,
                    privateKeyArmored: keys.privateKeyArmored,
                    publicKeyArmored: keys.publicKeyArmored
                });
            }).then(function() {
                var keyParams = pgp.getKeyParams();
                expect(keyParams.userIds[0].name).to.equal('');
                expect(keyParams.userIds[0].emailAddress).to.equal(user);

                return pgp.encrypt('secret', [keyObject.publicKeyArmored]);
            }).then(function(ct) {
                expect(ct).to.exist;
                return pgp.decrypt(ct, keyObject.publicKeyArmored);
            }).then(function(pt) {
                expect(pt.decrypted).to.equal('secret');
                expect(pt.signaturesValid).to.be.true;
                done();
            });
        });
        it('should work with passphrase', function(done) {
            var keyObject;

            pgp.generateKeys({
                emailAddress: user,
                realname: 'Jon Doe <%$# ',
                keySize: keySize,
                passphrase: passphrase
            }).then(function(keys) {
                expect(keys.keyId).to.exist;
                expect(keys.privateKeyArmored).to.exist;
                expect(keys.publicKeyArmored).to.exist;
                keyObject = keys;

                // test encrypt/decrypt
                return pgp.importKeys({
                    passphrase: passphrase,
                    privateKeyArmored: keys.privateKeyArmored,
                    publicKeyArmored: keys.publicKeyArmored
                });
            }).then(function() {
                var keyParams = pgp.getKeyParams();
                expect(keyParams.userIds[0].name).to.equal('Jon Doe');
                expect(keyParams.userIds[0].emailAddress).to.equal(user);

                return pgp.encrypt('secret', [keyObject.publicKeyArmored]);
            }).then(function(ct) {
                expect(ct).to.exist;
                return pgp.decrypt(ct, keyObject.publicKeyArmored);
            }).then(function(pt) {
                expect(pt.decrypted).to.equal('secret');
                expect(pt.signaturesValid).to.be.true;
                done();
            });
        });
        it('should work without passphrase', function(done) {
            var keyObject;

            pgp.generateKeys({
                emailAddress: user,
                realname: 'Jon Doe',
                keySize: keySize,
                passphrase: ''
            }).then(function(keys) {
                expect(keys.keyId).to.exist;
                expect(keys.privateKeyArmored).to.exist;
                expect(keys.publicKeyArmored).to.exist;
                keyObject = keys;

                // test encrypt/decrypt
                return pgp.importKeys({
                    passphrase: passphrase,
                    privateKeyArmored: keys.privateKeyArmored,
                    publicKeyArmored: keys.publicKeyArmored
                });
            }).then(function() {
                var keyParams = pgp.getKeyParams();
                expect(keyParams.userIds[0].name).to.equal('Jon Doe');
                expect(keyParams.userIds[0].emailAddress).to.equal(user);

                return pgp.encrypt('secret', [keyObject.publicKeyArmored]);
            }).then(function(ct) {
                expect(ct).to.exist;
                return pgp.decrypt(ct, keyObject.publicKeyArmored);
            }).then(function(pt) {
                expect(pt.decrypted).to.equal('secret');
                expect(pt.signaturesValid).to.be.true;
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
            }).catch(function(err) {
                expect(err).to.exist;
                expect(err.message).to.equal('Incorrect passphrase!');
                return pgp.exportKeys();
            }).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });
        it('should work', function(done) {
            pgp.importKeys({
                passphrase: passphrase,
                privateKeyArmored: privkey,
                publicKeyArmored: pubkey
            }).then(function() {
                return pgp.exportKeys();
            }).then(function(keys) {
                expect(keys.keyId).to.equal(keyId);
                expect(keys.privateKeyArmored).to.match(/Comment: Whiteout Mail - https:\/\/whiteout.io/);
                expect(keys.privateKeyArmored).to.match(/Version: OpenPGP.js v/);
                expect(keys.publicKeyArmored).to.match(/Comment: Whiteout Mail - https:\/\/whiteout.io/);
                expect(keys.publicKeyArmored).to.match(/Version: OpenPGP.js v/);
                done();
            });
        });
    });

    describe('Change passphrase of private key', function() {
        it('should work with new passphrase', function(done) {
            pgp.changePassphrase({
                privateKeyArmored: privkey,
                oldPassphrase: passphrase,
                newPassphrase: 'yxcv'
            }).then(function(reEncryptedKey) {
                expect(reEncryptedKey).to.exist;

                return pgp.importKeys({
                    passphrase: 'yxcv',
                    privateKeyArmored: reEncryptedKey,
                    publicKeyArmored: pubkey
                });
            }).then(done);
        });
        it('should work with empty passphrase', function(done) {
            pgp.changePassphrase({
                privateKeyArmored: privkey,
                oldPassphrase: passphrase,
                newPassphrase: undefined
            }).then(function(reEncryptedKey) {
                expect(reEncryptedKey).to.exist;

                return pgp.importKeys({
                    passphrase: undefined,
                    privateKeyArmored: reEncryptedKey,
                    publicKeyArmored: pubkey
                });
            }).then(done);
        });
        it('should fail when passphrases are equal', function(done) {
            pgp.changePassphrase({
                privateKeyArmored: privkey,
                oldPassphrase: passphrase,
                newPassphrase: passphrase
            }).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });
        it('should fail when old passphrase is incorrect', function(done) {
            pgp.changePassphrase({
                privateKeyArmored: privkey,
                oldPassphrase: 'asd',
                newPassphrase: 'yxcv'
            }).catch(function(err) {
                expect(err).to.exist;
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
        var wrongPubkey = '-----BEGIN PGP PUBLIC KEY BLOCK-----\r\nVersion: OpenPGP.js v.1.20131116\r\nComment: Whiteout Mail - http://whiteout.io\r\n\r\nxsBNBFKODs4BB/9iOF4THsjQMY+WEpT7ShgKxj4bHzRRaQkqczS4nZvP0U3g\r\nqeqCnbpagyeKXA+bhWFQW4GmXtgAoeD5PXs6AZYrw3tWNxLKu2Oe6Tp9K/XI\r\nxTMQ2wl4qZKDXHvuPsJ7cmgaWqpPyXtxA4zHHS3WrkI/6VzHAcI/y6x4szSB\r\nKgSuhI3hjh3s7TybUC1U6AfoQGx/S7e3WwlCOrK8GTClirN/2mCPRC5wuIft\r\nnkoMfA6jK8d2OPrJ63shy5cgwHOjQg/xuk46dNS7tkvGmbaa+X0PgqSKB+Hf\r\nYPPNS/ylg911DH9qa8BqYU2QpNh9jUKXSF+HbaOM+plWkCSAL7czV+R3ABEB\r\nAAHNLVdoaXRlb3V0IFVzZXIgPHNhZmV3aXRobWUudGVzdHVzZXJAZ21haWwu\r\nY29tPsLAXAQQAQgAEAUCUo4O2gkQ1/uT/N+/wjwAAN2cB/9gFRmAfvEQ2qz+\r\nWubmT2EsSSnjPMxzG4uyykFoa+TaZCWo2Xa2tQghmU103kEkQb1OEjRjpgwJ\r\nYX9Kghnl8DByM686L5AXnRyHP78qRJCLXSXl0AGicboUDp5sovaa4rswQceH\r\nvcdWgZ/mgHTRoiQeJddy9k+H6MPFiyFaVcFwegVsmpc+dCcC8yT+qh8ZIbyG\r\nRJU60PmKKN7LUusP+8DbSv39zCGJCBlVVKyA4MzdF5uM+sqTdXbKzOrT5DGd\r\nCZaox4s+w16Sq1rHzZKFWfQPfKLDB9pyA0ufCVRA3AF6BUi7G3ZqhZiHNhMP\r\nNvE45V/hS1PbZcfPVoUjE2qc1Ix1\r\n=7Wpe\r\n-----END PGP PUBLIC KEY BLOCK-----';

        beforeEach(function(done) {
            pgp.importKeys({
                passphrase: passphrase,
                privateKeyArmored: privkey,
                publicKeyArmored: pubkey
            }).then(done);
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

        describe('extractPublicKey', function() {
            it('should work', function() {
                var pk = pgp.extractPublicKey(privkey);
                expect(pk).to.exist;
                expect(pk).to.contain('-----BEGIN PGP PUBLIC KEY BLOCK-----');
            });
        });

        describe('Encrypt and sign', function() {
            it('should fail', function(done) {
                var input = null;

                pgp.encrypt(input, [pubkey]).catch(function(err) {
                    expect(err).to.exist;
                    done();
                });
            });
            it('should work', function(done) {
                pgp.encrypt(message, [pubkey]).then(function(ct) {
                    expect(ct).to.exist;
                    done();
                });
            });
            it('should encrypt to myself if public keys are empty', function(done) {
                pgp.encrypt(message, undefined).then(function(ct) {
                    expect(ct).to.exist;
                    done();
                });
            });
        });

        describe('Decrypt and verify', function() {
            var ciphertext;

            beforeEach(function(done) {
                pgp.encrypt(message, [pubkey]).then(function(ct) {
                    expect(ct).to.exist;
                    ciphertext = ct;
                    done();
                });
            });

            it('should fail', function(done) {
                var input = 'asdfa\rsdf';

                pgp.decrypt(input, pubkey).catch(function(err) {
                    expect(err).to.exist;
                    done();
                });
            });
            it('should work', function(done) {
                pgp.decrypt(ciphertext, pubkey).then(function(pt) {
                    expect(pt.decrypted).to.equal(message);
                    expect(pt.signaturesValid).to.be.true;
                    done();
                });
            });
            it('should work without signature', function(done) {
                openpgp.encryptMessage([pgp._publicKey], message).then(function(ct) {
                    return pgp.decrypt(ct, undefined);
                }).then(function(pt) {
                    expect(pt.decrypted).to.equal(message);
                    expect(pt.signaturesValid).to.be.undefined;
                    done();
                });
            });
            it('should fail to verify if public keys are empty', function(done) {
                // setup another public key so that signature verification fails
                pgp._publicKey = openpgp.key.readArmored(wrongPubkey).keys[0];
                pgp.decrypt(ciphertext, undefined).then(function(pt) {
                    expect(pt.decrypted).to.equal(message);
                    expect(pt.signaturesValid).to.be.null;
                    done();
                });
            });
            it('should decrypt but signValid should be null for wrong public key', function(done) {
                pgp.decrypt(ciphertext, wrongPubkey).then(function(pt) {
                    expect(pt.decrypted).to.equal(message);
                    expect(pt.signaturesValid).to.be.null;
                    done();
                });
            });
        });

        describe('Verify clearsigned message', function() {
            var clearsigned;

            beforeEach(function(done) {
                openpgp.signClearMessage(pgp._privateKey, 'this is a clearsigned message').then(function(signed) {
                    clearsigned = signed;
                    done();
                });
            });

            it('should work', function(done) {
                pgp.verifyClearSignedMessage(clearsigned, pubkey).then(function(signaturesValid) {
                    expect(signaturesValid).to.be.true;
                    done();
                });
            });

            it('should fail', function(done) {
                pgp.verifyClearSignedMessage(clearsigned.replace('clearsigned', 'invalid'), pubkey).then(function(signaturesValid) {
                    expect(signaturesValid).to.be.false;
                    done();
                });
            });
            it('should be null for wrong public key', function(done) {
                pgp.verifyClearSignedMessage(clearsigned, wrongPubkey).then(function(signaturesValid) {
                    expect(signaturesValid).to.be.null;
                    done();
                });
            });
        });

        describe('Verify detached signature', function() {
            var signedMessage, signature;

            beforeEach(function(done) {
                signedMessage = 'this is a signed message';
                openpgp.signClearMessage(pgp._privateKey, signedMessage).then(function(clearsigned) {
                    var signatureHeader = '-----BEGIN PGP SIGNATURE-----';
                    signature = signatureHeader + clearsigned.split(signatureHeader).pop();
                    done();
                });
            });

            it('should work', function(done) {
                pgp.verifySignedMessage(signedMessage, signature, pubkey).then(function(signaturesValid) {
                    expect(signaturesValid).to.be.true;
                    done();
                });
            });

            it('should fail', function(done) {
                pgp.verifySignedMessage(signedMessage.replace('signed', 'invalid'), signature, pubkey).then(function(signaturesValid) {
                    expect(signaturesValid).to.be.false;
                    done();
                });
            });
            it('should be null for wrong public key', function(done) {
                pgp.verifySignedMessage(signedMessage, signature, wrongPubkey).then(function(signaturesValid) {
                    expect(signaturesValid).to.be.null;
                    done();
                });
            });
        });
    });
});