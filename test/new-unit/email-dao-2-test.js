define(function(require) {
    'use strict';

    var EmailDAO = require('js/dao/email-dao-2'),
        KeychainDAO = require('js/dao/keychain-dao'),
        ImapClient = require('imap-client'),
        SmtpClient = require('smtp-client'),
        PGP = require('js/crypto/pgp'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        expect = chai.expect;


    describe('Email DAO 2 unit tests', function() {
        var dao, keychainStub, imapClientStub, smtpClientStub, pgpStub, devicestorageStub;

        var emailAddress = 'asdf@asdf.com',
            passphrase = 'asdf',
            asymKeySize = 2048,
            mockkeyId = 1234,
            mockKeyPair = {
                publicKey: {
                    _id: mockkeyId,
                    userId: emailAddress,
                    publicKey: 'publicpublicpublicpublic'
                },
                privateKey: {
                    _id: mockkeyId,
                    userId: emailAddress,
                    encryptedKey: 'privateprivateprivateprivate'
                }
            }, account = {
                emailAddress: emailAddress,
                asymKeySize: asymKeySize,
            };

        beforeEach(function() {
            keychainStub = sinon.createStubInstance(KeychainDAO);
            imapClientStub = sinon.createStubInstance(ImapClient);
            smtpClientStub = sinon.createStubInstance(SmtpClient);
            pgpStub = sinon.createStubInstance(PGP);
            devicestorageStub = sinon.createStubInstance(DeviceStorageDAO);

            dao = new EmailDAO(keychainStub, imapClientStub, smtpClientStub, pgpStub, devicestorageStub);
            dao._account = account;

            expect(dao._keychain).to.equal(keychainStub);
            expect(dao._imapClient).to.equal(imapClientStub);
            expect(dao._smtpClient).to.equal(smtpClientStub);
            expect(dao._crypto).to.equal(pgpStub);
            expect(dao._devicestorage).to.equal(devicestorageStub);
        });

        afterEach(function() {});

        describe('init', function() {
            beforeEach(function() {
                delete dao._account;
            });

            it('should init', function(done) {
                devicestorageStub.init.withArgs(emailAddress).yields();
                keychainStub.getUserKeyPair.yields(null, mockKeyPair);

                dao.init({
                    account: account
                }, function(err, keyPair) {
                    expect(err).to.not.exist;
                    expect(keyPair).to.equal(mockKeyPair);

                    expect(dao._account).to.equal(account);
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail due to error in getUserKeyPair', function(done) {
                devicestorageStub.init.yields();
                keychainStub.getUserKeyPair.yields({});

                dao.init({
                    account: account
                }, function(err, keyPair) {
                    expect(err).to.exist;
                    expect(keyPair).to.not.exist;

                    expect(devicestorageStub.init.calledOnce).to.be.true;

                    done();
                });
            });
        });

        describe('unlock', function() {
            it('should unlock', function(done) {
                var importMatcher = sinon.match(function(o) {
                    expect(o.passphrase).to.equal(passphrase);
                    expect(o.privateKeyArmored).to.equal(mockKeyPair.privateKey.encryptedKey);
                    expect(o.publicKeyArmored).to.equal(mockKeyPair.publicKey.publicKey);
                    return true;
                });

                pgpStub.importKeys.withArgs(importMatcher).yields();

                dao.unlock({
                    passphrase: passphrase,
                    keypair: mockKeyPair
                }, function(err) {
                    expect(err).to.not.exist;

                    expect(pgpStub.importKeys.calledOnce).to.be.true;

                    done();
                });
            });

            it('should generate a keypair and unlock', function(done) {
                var genKeysMatcher, persistKeysMatcher, importMatcher, keypair;

                keypair = {
                    keyId: 123,
                    publicKeyArmored: mockKeyPair.publicKey.publicKey,
                    privateKeyArmored: mockKeyPair.privateKey.encryptedKey
                };
                genKeysMatcher = sinon.match(function(o) {
                    expect(o.emailAddress).to.equal(emailAddress);
                    expect(o.keySize).to.equal(asymKeySize);
                    expect(o.passphrase).to.equal(passphrase);
                    return true;
                });
                importMatcher = sinon.match(function(o) {
                    expect(o.passphrase).to.equal(passphrase);
                    expect(o.privateKeyArmored).to.equal(mockKeyPair.privateKey.encryptedKey);
                    expect(o.publicKeyArmored).to.equal(mockKeyPair.publicKey.publicKey);
                    return true;
                });
                persistKeysMatcher = sinon.match(function(o) {
                    expect(o).to.deep.equal(mockKeyPair);
                    return true;
                });


                pgpStub.generateKeys.withArgs(genKeysMatcher).yields(null, keypair);
                pgpStub.importKeys.withArgs(importMatcher).yields();
                keychainStub.putUserKeyPair.withArgs().yields();

                dao.unlock({
                    passphrase: passphrase
                }, function(err) {
                    expect(err).to.not.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledOnce).to.be.true;
                    expect(keychainStub.putUserKeyPair.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when persisting fails', function(done) {
                var keypair = {
                    keyId: 123,
                    publicKeyArmored: 'qwerty',
                    privateKeyArmored: 'asdfgh'
                };
                pgpStub.generateKeys.yields(null, keypair);
                pgpStub.importKeys.withArgs().yields();
                keychainStub.putUserKeyPair.yields({});

                dao.unlock({
                    passphrase: passphrase
                }, function(err) {
                    expect(err).to.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledOnce).to.be.true;
                    expect(keychainStub.putUserKeyPair.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when import fails', function(done) {
                var keypair = {
                    keyId: 123,
                    publicKeyArmored: 'qwerty',
                    privateKeyArmored: 'asdfgh'
                };

                pgpStub.generateKeys.withArgs().yields(null, keypair);
                pgpStub.importKeys.withArgs().yields({});

                dao.unlock({
                    passphrase: passphrase
                }, function(err) {
                    expect(err).to.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when generation fails', function(done) {
                pgpStub.generateKeys.yields({});

                dao.unlock({
                    passphrase: passphrase
                }, function(err) {
                    expect(err).to.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;

                    done();
                });
            });
        });
    });
});