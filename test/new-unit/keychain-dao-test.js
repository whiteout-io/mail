define(function(require) {
    'use strict';

    var LawnchairDAO = require('js/dao/lawnchair-dao'),
        PublicKeyDAO = require('js/dao/publickey-dao'),
        KeychainDAO = require('js/dao/keychain-dao'),
        expect = chai.expect;

    var testUser = 'test@example.com';

    describe('Keychain DAO unit tests', function() {

        var keychainDao, lawnchairDaoStub, pubkeyDaoStub;

        beforeEach(function() {
            lawnchairDaoStub = sinon.createStubInstance(LawnchairDAO);
            pubkeyDaoStub = sinon.createStubInstance(PublicKeyDAO);
            keychainDao = new KeychainDAO(lawnchairDaoStub, pubkeyDaoStub);
        });

        afterEach(function() {});

        describe('lookup public key', function() {
            it('should fail', function(done) {
                keychainDao.lookupPublicKey(undefined, function(err, key) {
                    expect(err).to.exist;
                    expect(key).to.not.exist;
                    done();
                });
            });

            it('should fail', function(done) {
                lawnchairDaoStub.read.yields(42);

                keychainDao.lookupPublicKey('12345', function(err, key) {
                    expect(err).to.exist;
                    expect(key).to.not.exist;
                    expect(lawnchairDaoStub.read.calledOnce).to.be.true;
                    done();
                });
            });

            it('should work from local storage', function(done) {
                lawnchairDaoStub.read.yields(null, {
                    _id: '12345',
                    publicKey: 'asdf'
                });

                keychainDao.lookupPublicKey('12345', function(err, key) {
                    expect(err).to.not.exist;
                    expect(key).to.exist;
                    expect(lawnchairDaoStub.read.calledOnce).to.be.true;
                    done();
                });
            });

            it('should work from cloud', function(done) {
                lawnchairDaoStub.read.yields();
                pubkeyDaoStub.get.yields(null, {
                    _id: '12345',
                    publicKey: 'asdf'
                });
                lawnchairDaoStub.persist.yields();

                keychainDao.lookupPublicKey('12345', function(err, key) {
                    expect(err).to.not.exist;
                    expect(key).to.exist;
                    expect(key._id).to.equal('12345');
                    expect(lawnchairDaoStub.read.calledOnce).to.be.true;
                    expect(pubkeyDaoStub.get.calledOnce).to.be.true;
                    expect(lawnchairDaoStub.persist.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('get public keys by id', function() {
            it('should fail', function(done) {
                keychainDao.getPublicKeys([], function(err, keys) {
                    expect(err).to.not.exist;
                    expect(keys.length).to.equal(0);
                    done();
                });
            });

            it('should fail', function(done) {
                lawnchairDaoStub.read.yields(42);

                var ids = [{
                    _id: '12345'
                }];
                keychainDao.getPublicKeys(ids, function(err, keys) {
                    expect(err).to.exist;
                    expect(keys).to.not.exist;
                    expect(lawnchairDaoStub.read.calledOnce).to.be.true;
                    done();
                });
            });

            it('should work from local storage', function(done) {
                lawnchairDaoStub.read.yields(null, {
                    _id: '12345',
                    publicKey: 'asdf'
                });

                var ids = [{
                    _id: '12345'
                }];
                keychainDao.getPublicKeys(ids, function(err, keys) {
                    expect(err).to.not.exist;
                    expect(keys.length).to.equal(1);
                    expect(keys[0]._id).to.equal('12345');
                    expect(lawnchairDaoStub.read.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('get receiver public key', function() {
            it('should fail due to error in lawnchair list', function(done) {
                lawnchairDaoStub.list.yields(42);

                keychainDao.getReceiverPublicKey(testUser, function(err, key) {
                    expect(err).to.exist;
                    expect(key).to.not.exist;
                    expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                    done();
                });
            });

            it('should work from lawnchair list', function(done) {
                lawnchairDaoStub.list.yields(null, [{
                    _id: '12345',
                    userId: testUser,
                    publicKey: 'asdf'
                }]);

                keychainDao.getReceiverPublicKey(testUser, function(err, key) {
                    expect(err).to.not.exist;
                    expect(key).to.exist;
                    expect(key._id).to.equal('12345');
                    expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                    done();
                });
            });

            it('should fail due to error in pubkey dao', function(done) {
                lawnchairDaoStub.list.yields();
                pubkeyDaoStub.getByUserId.yields(42);

                keychainDao.getReceiverPublicKey(testUser, function(err, key) {
                    expect(err).to.exist;
                    expect(key).to.not.exist;
                    expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                    expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                    done();
                });
            });

            it('should work from pubkey dao with empty result', function(done) {
                lawnchairDaoStub.list.yields();
                pubkeyDaoStub.getByUserId.yields();

                keychainDao.getReceiverPublicKey(testUser, function(err, key) {
                    expect(err).to.not.exist;
                    expect(key).to.not.exist;
                    expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                    expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                    done();
                });
            });

            it('should work from pubkey dao', function(done) {
                lawnchairDaoStub.list.yields();
                pubkeyDaoStub.getByUserId.yields(null, {
                    _id: '12345',
                    publicKey: 'asdf'
                });
                lawnchairDaoStub.persist.yields();

                keychainDao.getReceiverPublicKey(testUser, function(err, key) {
                    expect(err).to.not.exist;
                    expect(key).to.exist;
                    expect(key._id).to.equal('12345');
                    expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                    expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                    expect(lawnchairDaoStub.persist.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('get user key pair', function() {
            it('should work if local keys are already present', function(done) {
                lawnchairDaoStub.list.yields(null, [{
                    _id: '12345',
                    userId: testUser,
                    publicKey: 'asdf'
                }]);
                lawnchairDaoStub.read.yields(null, {
                    _id: '12345',
                    publicKey: 'asdf',
                    encryptedKey: 'qwer'
                });

                keychainDao.getUserKeyPair(testUser, function(err, keys) {
                    expect(err).to.not.exist;
                    expect(keys).to.exist;
                    expect(keys.publicKey).to.exist;
                    expect(keys.privateKey).to.exist;
                    expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                    expect(lawnchairDaoStub.read.calledTwice).to.be.true;
                    done();
                });
            });

            it('should work if local keys are not already present', function(done) {
                lawnchairDaoStub.list.yields();
                pubkeyDaoStub.getByUserId.yields();

                keychainDao.getUserKeyPair(testUser, function(err, keys) {
                    expect(err).to.not.exist;
                    expect(keys).to.not.exist;
                    expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                    expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                    done();
                });
            });

            it('should work if local keys are not already present', function(done) {
                lawnchairDaoStub.list.yields();
                pubkeyDaoStub.getByUserId.yields(null, {
                    _id: '12345',
                    publicKey: 'asdf'
                });
                lawnchairDaoStub.read.yields(null, {
                    _id: '12345',
                    publicKey: 'asdf',
                    encryptedKey: 'qwer'
                });

                keychainDao.getUserKeyPair(testUser, function(err, keys) {
                    expect(err).to.not.exist;
                    expect(keys).to.exist;
                    expect(keys.publicKey).to.exist;
                    expect(keys.privateKey).to.exist;
                    expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                    expect(lawnchairDaoStub.read.calledTwice).to.be.true;
                    done();
                });
            });
        });

        describe('put user keypair', function() {
            it('should fail', function(done) {
                var keypair = {
                    publicKey: {
                        _id: '12345',
                        userId: testUser,
                        publicKey: 'asdf'
                    },
                    privateKey: {
                        _id: '12345',
                        encryptedKey: 'qwer'
                    }
                };

                keychainDao.putUserKeyPair(keypair, function(err) {
                    expect(err).to.exist;
                    done();
                });
            });

            it('should work', function(done) {
                var keypair = {
                    publicKey: {
                        _id: '12345',
                        userId: testUser,
                        publicKey: 'asdf'
                    },
                    privateKey: {
                        _id: '12345',
                        userId: testUser,
                        encryptedKey: 'qwer'
                    }
                };

                lawnchairDaoStub.persist.yields();
                pubkeyDaoStub.put.yields();

                keychainDao.putUserKeyPair(keypair, function(err) {
                    expect(err).to.not.exist;
                    expect(lawnchairDaoStub.persist.calledTwice).to.be.true;
                    expect(pubkeyDaoStub.put.calledOnce).to.be.true;
                    done();
                });
            });
        });

    });

});