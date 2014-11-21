'use strict';

var LawnchairDAO = require('../../src/js/dao/lawnchair-dao'),
    PublicKeyDAO = require('../../src/js/dao/publickey-dao'),
    KeychainDAO = require('../../src/js/dao/keychain-dao'),
    PrivateKeyDAO = require('../../src/js/dao/privatekey-dao'),
    Crypto = require('../../src/js/crypto/crypto'),
    PGP = require('../../src/js/crypto/pgp');

var testUser = 'test@example.com';

describe('Keychain DAO unit tests', function() {

    var keychainDao, lawnchairDaoStub, pubkeyDaoStub, privkeyDaoStub, cryptoStub, pgpStub;

    beforeEach(function() {
        lawnchairDaoStub = sinon.createStubInstance(LawnchairDAO);
        pubkeyDaoStub = sinon.createStubInstance(PublicKeyDAO);
        privkeyDaoStub = sinon.createStubInstance(PrivateKeyDAO);
        cryptoStub = sinon.createStubInstance(Crypto);
        pgpStub = sinon.createStubInstance(PGP);
        keychainDao = new KeychainDAO(lawnchairDaoStub, pubkeyDaoStub, privkeyDaoStub, cryptoStub, pgpStub);
    });

    afterEach(function() {});

    describe('verify public key', function() {
        it('should verify public key', function(done) {
            var uuid = 'asdfasdfasdfasdf';
            pubkeyDaoStub.verify.yields();

            keychainDao.verifyPublicKey(uuid, function() {
                expect(pubkeyDaoStub.verify.calledWith(uuid)).to.be.true;
                done();
            });
        });
    });

    describe('listLocalPublicKeys', function() {
        it('should work', function(done) {
            lawnchairDaoStub.list.withArgs('publickey', 0, null).yields();

            keychainDao.listLocalPublicKeys(function() {
                expect(lawnchairDaoStub.list.callCount).to.equal(1);
                done();
            });
        });
    });

    describe('removeLocalPublicKey', function() {
        it('should work', function(done) {
            var id = 'asdf';

            lawnchairDaoStub.remove.withArgs('publickey_' + id).yields();

            keychainDao.removeLocalPublicKey(id, function() {
                expect(lawnchairDaoStub.remove.callCount).to.equal(1);
                done();
            });
        });
    });

    describe('refreshKeyForUserId', function() {
        var getPubKeyStub,
            oldKey = {
                _id: 123
            },
            newKey = {
                _id: 456
            },
            importedKey = {
                _id: 789,
                imported: true
            };

        beforeEach(function() {
            getPubKeyStub = sinon.stub(keychainDao, 'getReceiverPublicKey');
        });

        afterEach(function() {
            keychainDao.getReceiverPublicKey.restore();
            delete keychainDao.requestPermissionForKeyUpdate;
        });

        it('should not find a key', function(done) {
            getPubKeyStub.yields();

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }, function(err, key) {
                expect(err).to.not.exist;
                expect(key).to.not.exist;

                done();
            });
        });

        it('should not update the key when up to date', function(done) {
            getPubKeyStub.yields(null, oldKey);
            pubkeyDaoStub.get.withArgs(oldKey._id).yields(null, oldKey);

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }, function(err, key) {
                expect(err).to.not.exist;
                expect(key).to.to.equal(oldKey);

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.true;


                done();
            });
        });

        it('should update key', function(done) {
            getPubKeyStub.yields(null, oldKey);
            pubkeyDaoStub.get.withArgs(oldKey._id).yields();
            pubkeyDaoStub.getByUserId.withArgs(testUser).yields(null, newKey);
            keychainDao.requestPermissionForKeyUpdate = function(opts, cb) {
                expect(opts.userId).to.equal(testUser);
                expect(opts.newKey).to.equal(newKey);
                cb(true);
            };
            lawnchairDaoStub.remove.withArgs('publickey_' + oldKey._id).yields();
            lawnchairDaoStub.persist.withArgs('publickey_' + newKey._id, newKey).yields();

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }, function(err, key) {
                expect(err).to.not.exist;
                expect(key).to.equal(newKey);

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.calledOnce).to.be.true;
                expect(lawnchairDaoStub.persist.calledOnce).to.be.true;

                done();
            });
        });

        it('should update key without approval', function(done) {
            getPubKeyStub.yields(null, oldKey);
            pubkeyDaoStub.get.withArgs(oldKey._id).yields();
            pubkeyDaoStub.getByUserId.withArgs(testUser).yields(null, newKey);
            lawnchairDaoStub.remove.withArgs('publickey_' + oldKey._id).yields();
            lawnchairDaoStub.persist.withArgs('publickey_' + newKey._id, newKey).yields();

            keychainDao.refreshKeyForUserId({
                userId: testUser,
                overridePermission: true
            }, function(err, key) {
                expect(err).to.not.exist;
                expect(key).to.equal(newKey);

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.calledOnce).to.be.true;
                expect(lawnchairDaoStub.persist.calledOnce).to.be.true;

                done();
            });
        });

        it('should remove key', function(done) {
            getPubKeyStub.yields(null, oldKey);
            pubkeyDaoStub.get.withArgs(oldKey._id).yields();
            pubkeyDaoStub.getByUserId.withArgs(testUser).yields();
            keychainDao.requestPermissionForKeyUpdate = function(opts, cb) {
                expect(opts.userId).to.equal(testUser);
                expect(opts.newKey).to.not.exist;
                cb(true);
            };
            lawnchairDaoStub.remove.withArgs('publickey_' + oldKey._id).yields();

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }, function(err, key) {
                expect(err).to.not.exist;
                expect(key).to.not.exist;

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.calledOnce).to.be.true;
                expect(lawnchairDaoStub.persist.called).to.be.false;

                done();
            });
        });

        it('should go offline while fetching new key', function(done) {
            getPubKeyStub.yields(null, oldKey);
            pubkeyDaoStub.get.withArgs(oldKey._id).yields();
            pubkeyDaoStub.getByUserId.withArgs(testUser).yields({
                code: 42
            });

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }, function(err, key) {
                expect(err).to.not.exist;
                expect(key).to.to.equal(oldKey);

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.called).to.be.false;
                expect(lawnchairDaoStub.persist.called).to.be.false;

                done();
            });
        });

        it('should not remove old key on user rejection', function(done) {
            getPubKeyStub.yields(null, oldKey);
            pubkeyDaoStub.get.withArgs(oldKey._id).yields();
            pubkeyDaoStub.getByUserId.withArgs(testUser).yields(null, newKey);
            keychainDao.requestPermissionForKeyUpdate = function(opts, cb) {
                expect(opts.userId).to.equal(testUser);
                expect(opts.newKey).to.exist;
                cb(false);
            };

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }, function(err, key) {
                expect(err).to.not.exist;
                expect(key).to.equal(oldKey);

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.called).to.be.false;
                expect(lawnchairDaoStub.persist.called).to.be.false;

                done();
            });
        });

        it('should not remove manually imported key', function(done) {
            getPubKeyStub.yields(null, importedKey);

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }, function(err, key) {
                expect(err).to.not.exist;
                expect(key).to.equal(importedKey);

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.false;

                done();
            });
        });

        it('should update not the key when offline', function(done) {
            getPubKeyStub.yields(null, oldKey);
            pubkeyDaoStub.get.withArgs(oldKey._id).yields({
                code: 42
            });

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }, function(err, key) {
                expect(err).to.not.exist;
                expect(key).to.to.equal(oldKey);

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.called).to.be.false;
                expect(lawnchairDaoStub.remove.called).to.be.false;
                expect(lawnchairDaoStub.persist.called).to.be.false;

                done();
            });
        });

        it('should error while persisting new key', function(done) {
            getPubKeyStub.yields(null, oldKey);
            pubkeyDaoStub.get.withArgs(oldKey._id).yields();
            pubkeyDaoStub.getByUserId.withArgs(testUser).yields(null, newKey);
            keychainDao.requestPermissionForKeyUpdate = function(opts, cb) {
                expect(opts.userId).to.equal(testUser);
                expect(opts.newKey).to.equal(newKey);
                cb(true);
            };
            lawnchairDaoStub.remove.withArgs('publickey_' + oldKey._id).yields();
            lawnchairDaoStub.persist.yields({});

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }, function(err, key) {
                expect(err).to.exist;
                expect(key).to.not.exist;

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.calledOnce).to.be.true;
                expect(lawnchairDaoStub.persist.calledOnce).to.be.true;

                done();
            });
        });

        it('should error while deleting old key', function(done) {
            getPubKeyStub.yields(null, oldKey);
            pubkeyDaoStub.get.withArgs(oldKey._id).yields();
            pubkeyDaoStub.getByUserId.withArgs(testUser).yields();
            keychainDao.requestPermissionForKeyUpdate = function(opts, cb) {
                expect(opts.userId).to.equal(testUser);
                cb(true);
            };
            lawnchairDaoStub.remove.yields({});

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }, function(err, key) {
                expect(err).to.exist;
                expect(key).to.not.exist;

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.persist.called).to.be.false;

                done();
            });
        });

        it('should error while persisting new key', function(done) {
            getPubKeyStub.yields(null, oldKey);
            pubkeyDaoStub.get.withArgs(oldKey._id).yields();
            pubkeyDaoStub.getByUserId.withArgs(testUser).yields(null, newKey);
            keychainDao.requestPermissionForKeyUpdate = function(opts, cb) {
                expect(opts.userId).to.equal(testUser);
                expect(opts.newKey).to.equal(newKey);
                cb(true);
            };
            lawnchairDaoStub.remove.withArgs('publickey_' + oldKey._id).yields();
            lawnchairDaoStub.persist.yields({});

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }, function(err, key) {
                expect(err).to.exist;
                expect(key).to.not.exist;

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.calledOnce).to.be.true;
                expect(lawnchairDaoStub.persist.calledOnce).to.be.true;

                done();
            });
        });

        it('should error when get failed', function(done) {
            getPubKeyStub.yields(null, oldKey);
            pubkeyDaoStub.get.withArgs(oldKey._id).yields({});

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }, function(err, key) {
                expect(err).to.exist;
                expect(key).to.not.exist;

                done();
            });
        });
    });

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

        it('should work for keys with secondary userIds', function(done) {
            lawnchairDaoStub.list.yields(null, [{
                _id: '12345',
                userId: 'not testUser',
                userIds: [{
                    emailAddress: testUser
                }],
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
            lawnchairDaoStub.list.yields(null, []);
            pubkeyDaoStub.getByUserId.yields({});

            keychainDao.getReceiverPublicKey(testUser, function(err, key) {
                expect(err).to.exist;
                expect(key).to.not.exist;
                expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                done();
            });
        });

        it('should work from pubkey dao with empty result', function(done) {
            lawnchairDaoStub.list.yields(null, []);
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
            lawnchairDaoStub.list.yields(null, []);
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

    describe('setDeviceName', function() {
        it('should work', function(done) {
            lawnchairDaoStub.persist.yields();

            keychainDao.setDeviceName('iPhone', done);
        });
    });

    describe('getDeviceName', function() {
        it('should fail when device name is not set', function(done) {
            lawnchairDaoStub.read.withArgs('devicename').yields();

            keychainDao.getDeviceName(function(err, deviceName) {
                expect(err.message).to.equal('Device name not set!');
                expect(deviceName).to.not.exist;
                done();
            });
        });

        it('should fail due to error when reading device name', function(done) {
            lawnchairDaoStub.read.withArgs('devicename').yields(42);

            keychainDao.getDeviceName(function(err, deviceName) {
                expect(err).to.equal(42);
                expect(deviceName).to.not.exist;
                done();
            });
        });

        it('should work', function(done) {
            lawnchairDaoStub.read.withArgs('devicename').yields(null, 'iPhone');

            keychainDao.getDeviceName(function(err, deviceName) {
                expect(err).to.not.exist;
                expect(deviceName).to.equal('iPhone');
                done();
            });
        });
    });

    describe('getDeviceSecret', function() {
        it('should fail due to error when reading device secret', function(done) {
            lawnchairDaoStub.read.withArgs('devicename').yields(null, 'iPhone');
            lawnchairDaoStub.read.withArgs('devicesecret').yields(42);

            keychainDao.getDeviceSecret(function(err, deviceSecret) {
                expect(err).to.equal(42);
                expect(deviceSecret).to.not.exist;
                done();
            });
        });

        it('should fail due to error when storing device secret', function(done) {
            lawnchairDaoStub.read.withArgs('devicename').yields(null, 'iPhone');
            lawnchairDaoStub.read.withArgs('devicesecret').yields();
            lawnchairDaoStub.persist.withArgs('devicesecret').yields(42);

            keychainDao.getDeviceSecret(function(err, deviceSecret) {
                expect(err).to.equal(42);
                expect(deviceSecret).to.not.exist;
                done();
            });
        });

        it('should work when device secret is not set', function(done) {
            lawnchairDaoStub.read.withArgs('devicename').yields(null, 'iPhone');
            lawnchairDaoStub.read.withArgs('devicesecret').yields();
            lawnchairDaoStub.persist.withArgs('devicesecret').yields();

            keychainDao.getDeviceSecret(function(err, deviceSecret) {
                expect(err).to.not.exist;
                expect(deviceSecret).to.exist;
                done();
            });
        });

        it('should work when device secret is set', function(done) {
            lawnchairDaoStub.read.withArgs('devicename').yields(null, 'iPhone');
            lawnchairDaoStub.read.withArgs('devicesecret').yields(null, 'secret');

            keychainDao.getDeviceSecret(function(err, deviceSecret) {
                expect(err).to.not.exist;
                expect(deviceSecret).to.equal('secret');
                done();
            });
        });
    });

    describe('registerDevice', function() {
        var getDeviceNameStub, lookupPublicKeyStub, getDeviceSecretStub;

        beforeEach(function() {
            getDeviceNameStub = sinon.stub(keychainDao, 'getDeviceName');
            lookupPublicKeyStub = sinon.stub(keychainDao, 'lookupPublicKey');
            getDeviceSecretStub = sinon.stub(keychainDao, 'getDeviceSecret');
        });
        afterEach(function() {
            getDeviceNameStub.restore();
            lookupPublicKeyStub.restore();
            getDeviceSecretStub.restore();
        });

        it('should fail when reading devicename', function(done) {
            getDeviceNameStub.yields(42);

            keychainDao.registerDevice({}, function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should fail in requestDeviceRegistration', function(done) {
            getDeviceNameStub.yields(null, 'iPhone');

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).yields(42);

            keychainDao.registerDevice({
                userId: testUser
            }, function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should fail due to invalid requestDeviceRegistration return value', function(done) {
            getDeviceNameStub.yields(null, 'iPhone');

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).yields(null, {});

            keychainDao.registerDevice({
                userId: testUser
            }, function(err) {
                expect(err.message).to.equal('Invalid format for session key!');
                done();
            });
        });

        it('should fail in lookupPublicKey', function(done) {
            getDeviceNameStub.yields(null, 'iPhone');

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).yields(null, {
                encryptedRegSessionKey: 'asdf'
            });

            lookupPublicKeyStub.yields(42);

            keychainDao.registerDevice({
                userId: testUser
            }, function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should fail when server public key not found', function(done) {
            getDeviceNameStub.yields(null, 'iPhone');

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).yields(null, {
                encryptedRegSessionKey: 'asdf'
            });

            lookupPublicKeyStub.yields();

            keychainDao.registerDevice({
                userId: testUser
            }, function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail in decrypt', function(done) {
            getDeviceNameStub.yields(null, 'iPhone');

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).yields(null, {
                encryptedRegSessionKey: 'asdf'
            });

            lookupPublicKeyStub.yields(null, {
                publicKey: 'pubkey'
            });
            pgpStub.decrypt.withArgs('asdf', 'pubkey').yields(42);

            keychainDao.registerDevice({
                userId: testUser
            }, function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should fail in getDeviceSecret', function(done) {
            getDeviceNameStub.yields(null, 'iPhone');

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).yields(null, {
                encryptedRegSessionKey: 'asdf'
            });

            lookupPublicKeyStub.yields(null, {
                publicKey: 'pubkey'
            });
            pgpStub.decrypt.withArgs('asdf', 'pubkey').yields(null, 'decrypted', true, true);
            getDeviceSecretStub.yields(42);

            keychainDao.registerDevice({
                userId: testUser
            }, function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should fail in encrypt', function(done) {
            getDeviceNameStub.yields(null, 'iPhone');

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).yields(null, {
                encryptedRegSessionKey: 'asdf'
            });

            lookupPublicKeyStub.yields(null, {
                publicKey: 'pubkey'
            });
            pgpStub.decrypt.withArgs('asdf', 'pubkey').yields(null, 'decrypted', true, true);
            getDeviceSecretStub.yields(null, 'secret');
            cryptoStub.encrypt.withArgs('secret', 'decrypted').yields(42);

            keychainDao.registerDevice({
                userId: testUser
            }, function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should work', function(done) {
            getDeviceNameStub.yields(null, 'iPhone');

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).yields(null, {
                encryptedRegSessionKey: 'asdf'
            });

            lookupPublicKeyStub.yields(null, {
                publicKey: 'pubkey'
            });
            pgpStub.decrypt.withArgs('asdf', 'pubkey').yields(null, 'decrypted', true, true);
            getDeviceSecretStub.yields(null, 'secret');
            cryptoStub.encrypt.withArgs('secret', 'decrypted').yields(null, 'encryptedDeviceSecret');
            privkeyDaoStub.uploadDeviceSecret.yields();

            keychainDao.registerDevice({
                userId: testUser
            }, function(err) {
                expect(err).not.exist;
                expect(privkeyDaoStub.uploadDeviceSecret.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('_authenticateToPrivateKeyServer', function() {
        var lookupPublicKeyStub, getDeviceSecretStub;

        beforeEach(function() {
            lookupPublicKeyStub = sinon.stub(keychainDao, 'lookupPublicKey');
            getDeviceSecretStub = sinon.stub(keychainDao, 'getDeviceSecret');
        });
        afterEach(function() {
            lookupPublicKeyStub.restore();
            getDeviceSecretStub.restore();
        });

        it('should fail due to privkeyDao.requestAuthSessionKey', function(done) {
            privkeyDaoStub.requestAuthSessionKey.withArgs({
                userId: testUser
            }).yields(42);

            keychainDao._authenticateToPrivateKeyServer(testUser, function(err, authSessionKey) {
                expect(err).to.equal(42);
                expect(authSessionKey).to.not.exist;
                done();
            });
        });

        it('should fail due to privkeyDao.requestAuthSessionKey response', function(done) {
            privkeyDaoStub.requestAuthSessionKey.yields(null, {});

            keychainDao._authenticateToPrivateKeyServer(testUser, function(err, authSessionKey) {
                expect(err).to.exist;
                expect(authSessionKey).to.not.exist;
                done();
            });
        });

        it('should fail due to lookupPublicKey', function(done) {
            privkeyDaoStub.requestAuthSessionKey.yields(null, {
                encryptedAuthSessionKey: 'encryptedAuthSessionKey',
                encryptedChallenge: 'encryptedChallenge',
                sessionId: 'sessionId'
            });

            lookupPublicKeyStub.yields(42);

            keychainDao._authenticateToPrivateKeyServer(testUser, function(err, authSessionKey) {
                expect(err).to.exist;
                expect(authSessionKey).to.not.exist;
                done();
            });
        });

        it('should fail due to pgp.decrypt', function(done) {
            privkeyDaoStub.requestAuthSessionKey.yields(null, {
                encryptedAuthSessionKey: 'encryptedAuthSessionKey',
                encryptedChallenge: 'encryptedChallenge',
                sessionId: 'sessionId'
            });

            lookupPublicKeyStub.yields(null, {
                publickKey: 'publicKey'
            });

            pgpStub.decrypt.yields(42);

            keychainDao._authenticateToPrivateKeyServer(testUser, function(err, authSessionKey) {
                expect(err).to.exist;
                expect(authSessionKey).to.not.exist;
                done();
            });
        });

        it('should fail due to getDeviceSecret', function(done) {
            privkeyDaoStub.requestAuthSessionKey.yields(null, {
                encryptedAuthSessionKey: 'encryptedAuthSessionKey',
                encryptedChallenge: 'encryptedChallenge',
                sessionId: 'sessionId'
            });

            lookupPublicKeyStub.yields(null, {
                publickKey: 'publicKey'
            });

            pgpStub.decrypt.yields(null, 'decryptedStuff');
            getDeviceSecretStub.yields(42);

            keychainDao._authenticateToPrivateKeyServer(testUser, function(err, authSessionKey) {
                expect(err).to.exist;
                expect(authSessionKey).to.not.exist;
                done();
            });
        });

        it('should fail due to crypto.encrypt', function(done) {
            privkeyDaoStub.requestAuthSessionKey.yields(null, {
                encryptedAuthSessionKey: 'encryptedAuthSessionKey',
                encryptedChallenge: 'encryptedChallenge',
                sessionId: 'sessionId'
            });

            lookupPublicKeyStub.yields(null, {
                publickKey: 'publicKey'
            });

            pgpStub.decrypt.yields(null, 'decryptedStuff');
            getDeviceSecretStub.yields(null, 'deviceSecret');
            cryptoStub.encrypt.yields(42);

            keychainDao._authenticateToPrivateKeyServer(testUser, function(err, authSessionKey) {
                expect(err).to.exist;
                expect(authSessionKey).to.not.exist;
                done();
            });
        });

        it('should fail due to privkeyDao.verifyAuthentication', function(done) {
            privkeyDaoStub.requestAuthSessionKey.yields(null, {
                encryptedAuthSessionKey: 'encryptedAuthSessionKey',
                encryptedChallenge: 'encryptedChallenge',
                sessionId: 'sessionId'
            });

            lookupPublicKeyStub.yields(null, {
                publickKey: 'publicKey'
            });

            pgpStub.decrypt.yields(null, 'decryptedStuff', true, true);
            getDeviceSecretStub.yields(null, 'deviceSecret');
            cryptoStub.encrypt.yields(null, 'encryptedStuff');
            privkeyDaoStub.verifyAuthentication.yields(42);

            keychainDao._authenticateToPrivateKeyServer(testUser, function(err, authSessionKey) {
                expect(err).to.exist;
                expect(authSessionKey).to.not.exist;
                done();
            });
        });

        it('should fail due to server public key nto found', function(done) {
            privkeyDaoStub.requestAuthSessionKey.yields(null, {
                encryptedAuthSessionKey: 'encryptedAuthSessionKey',
                encryptedChallenge: 'encryptedChallenge',
                sessionId: 'sessionId'
            });

            lookupPublicKeyStub.yields();

            pgpStub.decrypt.yields(null, 'decryptedStuff', true, true);
            getDeviceSecretStub.yields(null, 'deviceSecret');
            cryptoStub.encrypt.yields(null, 'encryptedStuff');
            privkeyDaoStub.verifyAuthentication.yields();

            keychainDao._authenticateToPrivateKeyServer(testUser, function(err, authSessionKey) {
                expect(err).to.exist;
                expect(authSessionKey).to.not.exist;
                done();
            });
        });

        it('should work', function(done) {
            privkeyDaoStub.requestAuthSessionKey.yields(null, {
                encryptedAuthSessionKey: 'encryptedAuthSessionKey',
                encryptedChallenge: 'encryptedChallenge',
                sessionId: 'sessionId'
            });

            lookupPublicKeyStub.yields(null, {
                publicKey: 'publicKey'
            });

            pgpStub.decrypt.yields(null, 'decryptedStuff', true, true);
            getDeviceSecretStub.yields(null, 'deviceSecret');
            cryptoStub.encrypt.yields(null, 'encryptedStuff');
            privkeyDaoStub.verifyAuthentication.yields();

            keychainDao._authenticateToPrivateKeyServer(testUser, function(err, authSessionKey) {
                expect(err).to.not.exist;
                expect(authSessionKey).to.deep.equal({
                    sessionKey: 'decryptedStuff',
                    sessionId: 'sessionId'
                });
                done();
            });
        });
    });

    describe('uploadPrivateKey', function() {
        var getUserKeyPairStub, _authenticateToPrivateKeyServerStub;

        beforeEach(function() {
            getUserKeyPairStub = sinon.stub(keychainDao, 'getUserKeyPair');
            _authenticateToPrivateKeyServerStub = sinon.stub(keychainDao, '_authenticateToPrivateKeyServer');
        });
        afterEach(function() {
            getUserKeyPairStub.restore();
            _authenticateToPrivateKeyServerStub.restore();
        });

        it('should fail due to missing args', function(done) {
            keychainDao.uploadPrivateKey({}, function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail due to error in derive key', function(done) {
            cryptoStub.deriveKey.yields(42);

            keychainDao.uploadPrivateKey({
                code: 'code',
                userId: testUser
            }, function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to error in getUserKeyPair', function(done) {
            cryptoStub.deriveKey.yields(null, 'derivedKey');
            getUserKeyPairStub.yields(42);

            keychainDao.uploadPrivateKey({
                code: 'code',
                userId: testUser
            }, function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(getUserKeyPairStub.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to error in crypto.encrypt', function(done) {
            cryptoStub.deriveKey.yields(null, 'derivedKey');
            getUserKeyPairStub.yields(null, {
                privateKey: {
                    _id: 'pgpKeyId',
                    encryptedKey: 'pgpKey'
                }
            });
            cryptoStub.encrypt.yields(42);

            keychainDao.uploadPrivateKey({
                code: 'code',
                userId: testUser
            }, function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(getUserKeyPairStub.calledOnce).to.be.true;
                expect(cryptoStub.encrypt.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to error in _authenticateToPrivateKeyServer', function(done) {
            cryptoStub.deriveKey.yields(null, 'derivedKey');
            getUserKeyPairStub.yields(null, {
                privateKey: {
                    _id: 'pgpKeyId',
                    encryptedKey: 'pgpKey'
                }
            });
            cryptoStub.encrypt.yields(null, 'encryptedPgpKey');
            _authenticateToPrivateKeyServerStub.yields(42);

            keychainDao.uploadPrivateKey({
                code: 'code',
                userId: testUser
            }, function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(getUserKeyPairStub.calledOnce).to.be.true;
                expect(cryptoStub.encrypt.calledOnce).to.be.true;
                expect(_authenticateToPrivateKeyServerStub.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to error in cryptoStub.encrypt', function(done) {
            cryptoStub.deriveKey.yields(null, 'derivedKey');
            getUserKeyPairStub.yields(null, {
                privateKey: {
                    _id: 'pgpKeyId',
                    encryptedKey: 'pgpKey'
                }
            });
            cryptoStub.encrypt.withArgs('pgpKey').yields(null, 'encryptedPgpKey');
            _authenticateToPrivateKeyServerStub.yields(null, {
                sessionId: 'sessionId',
                sessionKey: 'sessionKey'
            });
            cryptoStub.encrypt.withArgs('encryptedPgpKey').yields(42);

            keychainDao.uploadPrivateKey({
                code: 'code',
                userId: testUser
            }, function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(getUserKeyPairStub.calledOnce).to.be.true;
                expect(cryptoStub.encrypt.calledTwice).to.be.true;
                expect(_authenticateToPrivateKeyServerStub.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            cryptoStub.deriveKey.yields(null, 'derivedKey');
            getUserKeyPairStub.yields(null, {
                privateKey: {
                    _id: 'pgpKeyId',
                    encryptedKey: 'pgpKey'
                }
            });
            cryptoStub.encrypt.withArgs('pgpKey').yields(null, 'encryptedPgpKey');
            _authenticateToPrivateKeyServerStub.yields(null, {
                sessionId: 'sessionId',
                sessionKey: 'sessionKey'
            });
            cryptoStub.encrypt.withArgs('encryptedPgpKey').yields(null, 'doubleEncryptedPgpKey');
            privkeyDaoStub.upload.yields();

            keychainDao.uploadPrivateKey({
                code: 'code',
                userId: testUser
            }, function(err) {
                expect(err).to.not.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(getUserKeyPairStub.calledOnce).to.be.true;
                expect(cryptoStub.encrypt.calledTwice).to.be.true;
                expect(_authenticateToPrivateKeyServerStub.calledOnce).to.be.true;
                expect(privkeyDaoStub.upload.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('requestPrivateKeyDownload', function() {
        it('should work', function(done) {
            var options = {
                userId: testUser,
                keyId: 'someId'
            };

            privkeyDaoStub.requestDownload.withArgs(options).yields();
            keychainDao.requestPrivateKeyDownload(options, done);
        });
    });

    describe('hasPrivateKey', function() {
        it('should work', function(done) {
            var options = {
                userId: testUser,
                keyId: 'someId'
            };

            privkeyDaoStub.hasPrivateKey.withArgs(options).yields();
            keychainDao.hasPrivateKey(options, done);
        });
    });

    describe('downloadPrivateKey', function() {
        it('should work', function(done) {
            var options = {
                recoveryToken: 'token'
            };

            privkeyDaoStub.download.withArgs(options).yields();
            keychainDao.downloadPrivateKey(options, done);
        });
    });

    describe('decryptAndStorePrivateKeyLocally', function() {
        var saveLocalPrivateKeyStub, testData;

        beforeEach(function() {
            testData = {
                _id: 'keyId',
                userId: testUser,
                encryptedPrivateKey: 'encryptedPrivateKey',
                code: 'code',
                salt: 'salt',
                iv: 'iv'
            };

            saveLocalPrivateKeyStub = sinon.stub(keychainDao, 'saveLocalPrivateKey');
        });
        afterEach(function() {
            saveLocalPrivateKeyStub.restore();
        });

        it('should fail due to invlaid args', function(done) {
            keychainDao.decryptAndStorePrivateKeyLocally({}, function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail due to crypto.deriveKey', function(done) {
            cryptoStub.deriveKey.yields(42);

            keychainDao.decryptAndStorePrivateKeyLocally(testData, function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to crypto.decrypt', function(done) {
            cryptoStub.deriveKey.yields(null, 'derivedKey');
            cryptoStub.decrypt.yields(42);

            keychainDao.decryptAndStorePrivateKeyLocally(testData, function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(cryptoStub.decrypt.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to pgp.getKeyParams', function(done) {
            cryptoStub.deriveKey.yields(null, 'derivedKey');
            cryptoStub.decrypt.yields(null, 'privateKeyArmored');
            pgpStub.getKeyParams.throws(new Error());

            keychainDao.decryptAndStorePrivateKeyLocally(testData, function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(cryptoStub.decrypt.calledOnce).to.be.true;
                expect(pgpStub.getKeyParams.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to saveLocalPrivateKey', function(done) {
            cryptoStub.deriveKey.yields(null, 'derivedKey');
            cryptoStub.decrypt.yields(null, 'privateKeyArmored');
            pgpStub.getKeyParams.returns(testData);
            saveLocalPrivateKeyStub.yields(42);

            keychainDao.decryptAndStorePrivateKeyLocally(testData, function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(cryptoStub.decrypt.calledOnce).to.be.true;
                expect(pgpStub.getKeyParams.calledOnce).to.be.true;
                expect(saveLocalPrivateKeyStub.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            cryptoStub.deriveKey.yields(null, 'derivedKey');
            cryptoStub.decrypt.yields(null, 'privateKeyArmored');
            pgpStub.getKeyParams.returns(testData);
            saveLocalPrivateKeyStub.yields();

            keychainDao.decryptAndStorePrivateKeyLocally(testData, function(err, keyObject) {
                expect(err).to.not.exist;
                expect(keyObject).to.deep.equal({
                    _id: 'keyId',
                    userId: testUser,
                    encryptedKey: 'privateKeyArmored'
                });
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(cryptoStub.decrypt.calledOnce).to.be.true;
                expect(pgpStub.getKeyParams.calledOnce).to.be.true;
                expect(saveLocalPrivateKeyStub.calledOnce).to.be.true;

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