'use strict';

var LawnchairDAO = require('../../../src/js/service/lawnchair'),
    PublicKeyDAO = require('../../../src/js/service/publickey'),
    KeychainDAO = require('../../../src/js/service/keychain'),
    PrivateKeyDAO = require('../../../src/js/service/privatekey'),
    Crypto = require('../../../src/js/crypto/crypto'),
    PGP = require('../../../src/js/crypto/pgp'),
    Dialog = require('../../../src/js/util/dialog'),
    appConfig = require('../../../src/js/app-config');

var testUser = 'test@example.com';

describe('Keychain DAO unit tests', function() {

    var keychainDao, lawnchairDaoStub, pubkeyDaoStub, privkeyDaoStub, cryptoStub, pgpStub, dialogStub;

    beforeEach(function() {
        lawnchairDaoStub = sinon.createStubInstance(LawnchairDAO);
        pubkeyDaoStub = sinon.createStubInstance(PublicKeyDAO);
        privkeyDaoStub = sinon.createStubInstance(PrivateKeyDAO);
        cryptoStub = sinon.createStubInstance(Crypto);
        pgpStub = sinon.createStubInstance(PGP);
        dialogStub = sinon.createStubInstance(Dialog);
        keychainDao = new KeychainDAO(lawnchairDaoStub, pubkeyDaoStub, privkeyDaoStub, cryptoStub, pgpStub, dialogStub, appConfig);
    });

    afterEach(function() {});

    describe('requestPermissionForKeyUpdate', function() {
        it('should work', function() {
            var opt = {
                newKey: {},
                userId: 'asdf@example.com'
            };

            keychainDao.requestPermissionForKeyUpdate(opt, function() {
                expect(dialogStub.confirm.calledOnce).to.be.true;
            });
        });
    });

    describe('verify public key', function() {
        it('should verify public key', function(done) {
            var uuid = 'asdfasdfasdfasdf';
            pubkeyDaoStub.verify.returns(resolves());

            keychainDao.verifyPublicKey(uuid).then(function() {
                expect(pubkeyDaoStub.verify.calledWith(uuid)).to.be.true;
                done();
            });
        });
    });

    describe('listLocalPublicKeys', function() {
        it('should work', function(done) {
            lawnchairDaoStub.list.withArgs('publickey', 0, null).returns(resolves());

            keychainDao.listLocalPublicKeys().then(function() {
                expect(lawnchairDaoStub.list.callCount).to.equal(1);
                done();
            });
        });
    });

    describe('removeLocalPublicKey', function() {
        it('should work', function(done) {
            var id = 'asdf';

            lawnchairDaoStub.remove.withArgs('publickey_' + id).returns(resolves());

            keychainDao.removeLocalPublicKey(id).then(function() {
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
            getPubKeyStub.returns(resolves());

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }).then(function(key) {
                expect(key).to.not.exist;

                done();
            });
        });

        it('should not update the key when up to date', function(done) {
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.get.withArgs(oldKey._id).returns(resolves(oldKey));

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }).then(function(key) {
                expect(key).to.to.equal(oldKey);

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.true;

                done();
            });
        });

        it('should update key', function(done) {
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.get.withArgs(oldKey._id).returns(resolves());
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(resolves(newKey));
            keychainDao.requestPermissionForKeyUpdate = function(opts, cb) {
                expect(opts.userId).to.equal(testUser);
                expect(opts.newKey).to.equal(newKey);
                cb(true);
            };
            lawnchairDaoStub.remove.withArgs('publickey_' + oldKey._id).returns(resolves());
            lawnchairDaoStub.persist.withArgs('publickey_' + newKey._id, newKey).returns(resolves());

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }).then(function(key) {
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
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.get.withArgs(oldKey._id).returns(resolves());
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(resolves(newKey));
            lawnchairDaoStub.remove.withArgs('publickey_' + oldKey._id).returns(resolves());
            lawnchairDaoStub.persist.withArgs('publickey_' + newKey._id, newKey).returns(resolves());

            keychainDao.refreshKeyForUserId({
                userId: testUser,
                overridePermission: true
            }).then(function(key) {
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
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.get.withArgs(oldKey._id).returns(resolves());
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(resolves());
            keychainDao.requestPermissionForKeyUpdate = function(opts, cb) {
                expect(opts.userId).to.equal(testUser);
                expect(opts.newKey).to.not.exist;
                cb(true);
            };
            lawnchairDaoStub.remove.withArgs('publickey_' + oldKey._id).returns(resolves());

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }).then(function(key) {
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
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.get.withArgs(oldKey._id).returns(resolves());
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(rejects({
                code: 42
            }));

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }).then(function(key) {
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
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.get.withArgs(oldKey._id).returns(resolves());
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(resolves(newKey));
            keychainDao.requestPermissionForKeyUpdate = function(opts, cb) {
                expect(opts.userId).to.equal(testUser);
                expect(opts.newKey).to.exist;
                cb(false);
            };

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }).then(function(key) {
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
            getPubKeyStub.returns(resolves(importedKey));

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }).then(function(key) {
                expect(key).to.equal(importedKey);

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.false;

                done();
            });
        });

        it('should update not the key when offline', function(done) {
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.get.withArgs(oldKey._id).returns(rejects({
                code: 42
            }));

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }).then(function(key) {
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
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.get.withArgs(oldKey._id).returns(resolves());
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(resolves(newKey));
            keychainDao.requestPermissionForKeyUpdate = function(opts, cb) {
                expect(opts.userId).to.equal(testUser);
                expect(opts.newKey).to.equal(newKey);
                cb(true);
            };
            lawnchairDaoStub.remove.withArgs('publickey_' + oldKey._id).returns(resolves());
            lawnchairDaoStub.persist.returns(rejects({}));

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }).catch(function(err) {
                expect(err).to.exist;

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.calledOnce).to.be.true;
                expect(lawnchairDaoStub.persist.calledOnce).to.be.true;

                done();
            });
        });

        it('should error while deleting old key', function(done) {
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.get.withArgs(oldKey._id).returns(resolves());
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(resolves());
            keychainDao.requestPermissionForKeyUpdate = function(opts, cb) {
                expect(opts.userId).to.equal(testUser);
                cb(true);
            };
            lawnchairDaoStub.remove.returns(rejects({}));

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }).catch(function(err) {
                expect(err).to.exist;

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.persist.called).to.be.false;

                done();
            });
        });

        it('should error while persisting new key', function(done) {
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.get.withArgs(oldKey._id).returns(resolves());
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(resolves(newKey));
            keychainDao.requestPermissionForKeyUpdate = function(opts, cb) {
                expect(opts.userId).to.equal(testUser);
                expect(opts.newKey).to.equal(newKey);
                cb(true);
            };
            lawnchairDaoStub.remove.withArgs('publickey_' + oldKey._id).returns(resolves());
            lawnchairDaoStub.persist.returns(rejects({}));

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }).catch(function(err) {
                expect(err).to.exist;

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.get.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.calledOnce).to.be.true;
                expect(lawnchairDaoStub.persist.calledOnce).to.be.true;

                done();
            });
        });

        it('should error when get failed', function(done) {
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.get.withArgs(oldKey._id).returns(rejects({}));

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }).catch(function(err) {
                expect(err).to.exist;

                done();
            });
        });
    });

    describe('lookup public key', function() {
        it('should fail', function(done) {
            keychainDao.lookupPublicKey(undefined).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail', function(done) {
            lawnchairDaoStub.read.returns(rejects(42));

            keychainDao.lookupPublicKey('12345').catch(function(err) {
                expect(err).to.exist;
                expect(lawnchairDaoStub.read.calledOnce).to.be.true;
                done();
            });
        });

        it('should work from local storage', function(done) {
            lawnchairDaoStub.read.returns(resolves({
                _id: '12345',
                publicKey: 'asdf'
            }));

            keychainDao.lookupPublicKey('12345').then(function(key) {
                expect(key).to.exist;
                expect(lawnchairDaoStub.read.calledOnce).to.be.true;
                done();
            });
        });

        it('should work from cloud', function(done) {
            lawnchairDaoStub.read.returns(resolves());
            pubkeyDaoStub.get.returns(resolves({
                _id: '12345',
                publicKey: 'asdf'
            }));
            lawnchairDaoStub.persist.returns(resolves());

            keychainDao.lookupPublicKey('12345').then(function(key) {
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
            keychainDao.getPublicKeys([]).then(function(keys) {
                expect(keys.length).to.equal(0);
                done();
            });
        });

        it('should fail', function(done) {
            lawnchairDaoStub.read.returns(rejects(42));

            var ids = [{
                _id: '12345'
            }];
            keychainDao.getPublicKeys(ids).catch(function(err) {
                expect(err).to.exist;
                expect(lawnchairDaoStub.read.calledOnce).to.be.true;
                done();
            });
        });

        it('should work from local storage', function(done) {
            lawnchairDaoStub.read.returns(resolves({
                _id: '12345',
                publicKey: 'asdf'
            }));

            var ids = [{
                _id: '12345'
            }];
            keychainDao.getPublicKeys(ids).then(function(keys) {
                expect(keys.length).to.equal(1);
                expect(keys[0]._id).to.equal('12345');
                expect(lawnchairDaoStub.read.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('get receiver public key', function() {
        it('should fail due to error in lawnchair list', function(done) {
            lawnchairDaoStub.list.returns(rejects(42));

            keychainDao.getReceiverPublicKey(testUser).catch(function(err) {
                expect(err).to.exist;
                expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                done();
            });
        });

        it('should work from lawnchair list', function(done) {
            lawnchairDaoStub.list.returns(resolves([{
                _id: '12345',
                userId: testUser,
                publicKey: 'asdf'
            }]));

            keychainDao.getReceiverPublicKey(testUser).then(function(key) {
                expect(key).to.exist;
                expect(key._id).to.equal('12345');
                expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                done();
            });
        });

        it('should work for keys with secondary userIds', function(done) {
            lawnchairDaoStub.list.returns(resolves([{
                _id: '12345',
                userId: 'not testUser',
                userIds: [{
                    emailAddress: testUser
                }],
                publicKey: 'asdf'
            }]));

            keychainDao.getReceiverPublicKey(testUser).then(function(key) {
                expect(key).to.exist;
                expect(key._id).to.equal('12345');
                expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to error in pubkey dao', function(done) {
            lawnchairDaoStub.list.returns(resolves([]));
            pubkeyDaoStub.getByUserId.returns(rejects({}));

            keychainDao.getReceiverPublicKey(testUser).catch(function(err) {
                expect(err).to.exist;
                expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                done();
            });
        });

        it('should work from pubkey dao with empty result', function(done) {
            lawnchairDaoStub.list.returns(resolves([]));
            pubkeyDaoStub.getByUserId.returns(resolves());

            keychainDao.getReceiverPublicKey(testUser).then(function(key) {
                expect(key).to.not.exist;
                expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                done();
            });
        });

        it('should work from pubkey dao', function(done) {
            lawnchairDaoStub.list.returns(resolves([]));
            pubkeyDaoStub.getByUserId.returns(resolves({
                _id: '12345',
                publicKey: 'asdf'
            }));
            lawnchairDaoStub.persist.returns(resolves());

            keychainDao.getReceiverPublicKey(testUser).then(function(key) {
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
            lawnchairDaoStub.list.returns(resolves([{
                _id: '12345',
                userId: testUser,
                publicKey: 'asdf'
            }]));
            lawnchairDaoStub.read.returns(resolves({
                _id: '12345',
                publicKey: 'asdf',
                encryptedKey: 'qwer'
            }));

            keychainDao.getUserKeyPair(testUser).then(function(keys) {
                expect(keys).to.exist;
                expect(keys.publicKey).to.exist;
                expect(keys.privateKey).to.exist;
                expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                expect(lawnchairDaoStub.read.calledTwice).to.be.true;
                done();
            });
        });

        it('should work if local keys are not already present', function(done) {
            lawnchairDaoStub.list.returns(resolves());
            pubkeyDaoStub.getByUserId.returns(resolves());

            keychainDao.getUserKeyPair(testUser).then(function(keys) {
                expect(keys).to.not.exist;
                expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                done();
            });
        });

        it('should work if local keys are not already present', function(done) {
            lawnchairDaoStub.list.returns(resolves());
            pubkeyDaoStub.getByUserId.returns(resolves({
                _id: '12345',
                publicKey: 'asdf'
            }));
            lawnchairDaoStub.read.returns(resolves({
                _id: '12345',
                publicKey: 'asdf',
                encryptedKey: 'qwer'
            }));

            keychainDao.getUserKeyPair(testUser).then(function(keys) {
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
            lawnchairDaoStub.persist.returns(resolves());

            keychainDao.setDeviceName('iPhone').then(done);
        });
    });

    describe('getDeviceName', function() {
        it('should fail when device name is not set', function(done) {
            lawnchairDaoStub.read.withArgs('devicename').returns(resolves());

            keychainDao.getDeviceName().catch(function(err) {
                expect(err.message).to.equal('Device name not set!');
                done();
            });
        });

        it('should fail due to error when reading device name', function(done) {
            lawnchairDaoStub.read.withArgs('devicename').returns(rejects(42));

            keychainDao.getDeviceName().catch(function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should work', function(done) {
            lawnchairDaoStub.read.withArgs('devicename').returns(resolves('iPhone'));

            keychainDao.getDeviceName().then(function(deviceName) {
                expect(deviceName).to.equal('iPhone');
                done();
            });
        });
    });

    describe('getDeviceSecret', function() {
        it('should fail due to error when reading device secret', function(done) {
            lawnchairDaoStub.read.withArgs('devicename').returns(resolves('iPhone'));
            lawnchairDaoStub.read.withArgs('devicesecret').returns(rejects(42));

            keychainDao.getDeviceSecret().catch(function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should fail due to error when storing device secret', function(done) {
            lawnchairDaoStub.read.withArgs('devicename').returns(resolves('iPhone'));
            lawnchairDaoStub.read.withArgs('devicesecret').returns(resolves());
            lawnchairDaoStub.persist.withArgs('devicesecret').returns(rejects(42));

            keychainDao.getDeviceSecret().catch(function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should work when device secret is not set', function(done) {
            lawnchairDaoStub.read.withArgs('devicename').returns(resolves('iPhone'));
            lawnchairDaoStub.read.withArgs('devicesecret').returns(resolves());
            lawnchairDaoStub.persist.withArgs('devicesecret').returns(resolves());

            keychainDao.getDeviceSecret().then(function(deviceSecret) {
                expect(deviceSecret).to.exist;
                done();
            });
        });

        it('should work when device secret is set', function(done) {
            lawnchairDaoStub.read.withArgs('devicename').returns(resolves('iPhone'));
            lawnchairDaoStub.read.withArgs('devicesecret').returns(resolves('secret'));

            keychainDao.getDeviceSecret().then(function(deviceSecret) {
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
            getDeviceNameStub.returns(rejects(42));

            keychainDao.registerDevice({}).catch(function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should fail in requestDeviceRegistration', function(done) {
            getDeviceNameStub.returns(resolves('iPhone'));

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).returns(rejects(42));

            keychainDao.registerDevice({
                userId: testUser
            }).catch(function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should fail due to invalid requestDeviceRegistration return value', function(done) {
            getDeviceNameStub.returns(resolves('iPhone'));

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).returns(resolves({}));

            keychainDao.registerDevice({
                userId: testUser
            }).catch(function(err) {
                expect(err.message).to.equal('Invalid format for session key!');
                done();
            });
        });

        it('should fail in lookupPublicKey', function(done) {
            getDeviceNameStub.returns(resolves('iPhone'));

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).returns(resolves({
                encryptedRegSessionKey: 'asdf'
            }));

            lookupPublicKeyStub.returns(rejects(42));

            keychainDao.registerDevice({
                userId: testUser
            }).catch(function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should fail when server public key not found', function(done) {
            getDeviceNameStub.returns(resolves('iPhone'));

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).returns(resolves({
                encryptedRegSessionKey: 'asdf'
            }));

            lookupPublicKeyStub.returns(resolves());

            keychainDao.registerDevice({
                userId: testUser
            }).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail in decrypt', function(done) {
            getDeviceNameStub.returns(resolves('iPhone'));

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).returns(resolves({
                encryptedRegSessionKey: 'asdf'
            }));

            lookupPublicKeyStub.returns(resolves({
                publicKey: 'pubkey'
            }));
            pgpStub.decrypt.withArgs('asdf', 'pubkey').returns(rejects(42));

            keychainDao.registerDevice({
                userId: testUser
            }).catch(function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should fail in getDeviceSecret', function(done) {
            getDeviceNameStub.returns(resolves('iPhone'));

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).returns(resolves({
                encryptedRegSessionKey: 'asdf'
            }));

            lookupPublicKeyStub.returns(resolves({
                publicKey: 'pubkey'
            }));
            pgpStub.decrypt.withArgs('asdf', 'pubkey').returns(resolves({
                decrypted: 'decrypted',
                signaturesValid: true
            }));
            getDeviceSecretStub.returns(rejects(42));

            keychainDao.registerDevice({
                userId: testUser
            }).catch(function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should fail in encrypt', function(done) {
            getDeviceNameStub.returns(resolves('iPhone'));

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).returns(resolves({
                encryptedRegSessionKey: 'asdf'
            }));

            lookupPublicKeyStub.returns(resolves({
                publicKey: 'pubkey'
            }));
            pgpStub.decrypt.withArgs('asdf', 'pubkey').returns(resolves({
                decrypted: 'decrypted',
                signaturesValid: true
            }));
            getDeviceSecretStub.returns(resolves('secret'));
            cryptoStub.encrypt.withArgs('secret', 'decrypted').returns(rejects(42));

            keychainDao.registerDevice({
                userId: testUser
            }).catch(function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should work', function(done) {
            getDeviceNameStub.returns(resolves('iPhone'));

            privkeyDaoStub.requestDeviceRegistration.withArgs({
                userId: testUser,
                deviceName: 'iPhone'
            }).returns(resolves({
                encryptedRegSessionKey: 'asdf'
            }));

            lookupPublicKeyStub.returns(resolves({
                publicKey: 'pubkey'
            }));
            pgpStub.decrypt.withArgs('asdf', 'pubkey').returns(resolves({
                decrypted: 'decrypted',
                signaturesValid: true
            }));
            getDeviceSecretStub.returns(resolves('secret'));
            cryptoStub.encrypt.withArgs('secret', 'decrypted').returns(resolves('encryptedDeviceSecret'));
            privkeyDaoStub.uploadDeviceSecret.returns(resolves());

            keychainDao.registerDevice({
                userId: testUser
            }).then(function() {
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
            }).returns(rejects(42));

            keychainDao._authenticateToPrivateKeyServer(testUser).catch(function(err) {
                expect(err).to.equal(42);
                done();
            });
        });

        it('should fail due to privkeyDao.requestAuthSessionKey response', function(done) {
            privkeyDaoStub.requestAuthSessionKey.returns(resolves({}));

            keychainDao._authenticateToPrivateKeyServer(testUser).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail due to lookupPublicKey', function(done) {
            privkeyDaoStub.requestAuthSessionKey.returns(resolves({
                encryptedAuthSessionKey: 'encryptedAuthSessionKey',
                encryptedChallenge: 'encryptedChallenge',
                sessionId: 'sessionId'
            }));

            lookupPublicKeyStub.returns(rejects(42));

            keychainDao._authenticateToPrivateKeyServer(testUser).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail due to pgp.decrypt', function(done) {
            privkeyDaoStub.requestAuthSessionKey.returns(resolves({
                encryptedAuthSessionKey: 'encryptedAuthSessionKey',
                encryptedChallenge: 'encryptedChallenge',
                sessionId: 'sessionId'
            }));

            lookupPublicKeyStub.returns(resolves({
                publickKey: 'publicKey'
            }));

            pgpStub.decrypt.returns(rejects(42));

            keychainDao._authenticateToPrivateKeyServer(testUser).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail due to getDeviceSecret', function(done) {
            privkeyDaoStub.requestAuthSessionKey.returns(resolves({
                encryptedAuthSessionKey: 'encryptedAuthSessionKey',
                encryptedChallenge: 'encryptedChallenge',
                sessionId: 'sessionId'
            }));

            lookupPublicKeyStub.returns(resolves({
                publickKey: 'publicKey'
            }));

            pgpStub.decrypt.returns(resolves({
                decrypted: 'decryptedStuff'
            }));
            getDeviceSecretStub.returns(rejects(42));

            keychainDao._authenticateToPrivateKeyServer(testUser).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail due to crypto.encrypt', function(done) {
            privkeyDaoStub.requestAuthSessionKey.returns(resolves({
                encryptedAuthSessionKey: 'encryptedAuthSessionKey',
                encryptedChallenge: 'encryptedChallenge',
                sessionId: 'sessionId'
            }));

            lookupPublicKeyStub.returns(resolves({
                publickKey: 'publicKey'
            }));

            pgpStub.decrypt.returns(resolves({
                decrypted: 'decryptedStuff'
            }));
            getDeviceSecretStub.returns(resolves('deviceSecret'));
            cryptoStub.encrypt.returns(rejects(42));

            keychainDao._authenticateToPrivateKeyServer(testUser).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail due to privkeyDao.verifyAuthentication', function(done) {
            privkeyDaoStub.requestAuthSessionKey.returns(resolves({
                encryptedAuthSessionKey: 'encryptedAuthSessionKey',
                encryptedChallenge: 'encryptedChallenge',
                sessionId: 'sessionId'
            }));

            lookupPublicKeyStub.returns(resolves({
                publickKey: 'publicKey'
            }));

            pgpStub.decrypt.returns(resolves({
                decrypted: 'decryptedStuff',
                signaturesValid: true
            }));
            getDeviceSecretStub.returns(resolves('deviceSecret'));
            cryptoStub.encrypt.returns(resolves('encryptedStuff'));
            privkeyDaoStub.verifyAuthentication.returns(rejects(42));

            keychainDao._authenticateToPrivateKeyServer(testUser).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail due to server public key nto found', function(done) {
            privkeyDaoStub.requestAuthSessionKey.returns(resolves({
                encryptedAuthSessionKey: 'encryptedAuthSessionKey',
                encryptedChallenge: 'encryptedChallenge',
                sessionId: 'sessionId'
            }));

            lookupPublicKeyStub.returns(resolves());

            pgpStub.decrypt.returns(resolves({
                decrypted: 'decryptedStuff',
                signaturesValid: true
            }));
            getDeviceSecretStub.returns(resolves('deviceSecret'));
            cryptoStub.encrypt.returns(resolves('encryptedStuff'));
            privkeyDaoStub.verifyAuthentication.returns(resolves());

            keychainDao._authenticateToPrivateKeyServer(testUser).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            privkeyDaoStub.requestAuthSessionKey.returns(resolves({
                encryptedAuthSessionKey: 'encryptedAuthSessionKey',
                encryptedChallenge: 'encryptedChallenge',
                sessionId: 'sessionId'
            }));

            lookupPublicKeyStub.returns(resolves({
                publicKey: 'publicKey'
            }));

            pgpStub.decrypt.returns(resolves({
                decrypted: 'decryptedStuff',
                signaturesValid: true
            }));
            getDeviceSecretStub.returns(resolves('deviceSecret'));
            cryptoStub.encrypt.returns(resolves('encryptedStuff'));
            privkeyDaoStub.verifyAuthentication.returns(resolves());

            keychainDao._authenticateToPrivateKeyServer(testUser).then(function(authSessionKey) {
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
            keychainDao.uploadPrivateKey({}).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail due to error in derive key', function(done) {
            cryptoStub.deriveKey.returns(rejects(42));

            keychainDao.uploadPrivateKey({
                code: 'code',
                userId: testUser
            }).catch(function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to error in getUserKeyPair', function(done) {
            cryptoStub.deriveKey.returns(resolves('derivedKey'));
            getUserKeyPairStub.returns(rejects(42));

            keychainDao.uploadPrivateKey({
                code: 'code',
                userId: testUser
            }).catch(function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(getUserKeyPairStub.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to error in crypto.encrypt', function(done) {
            cryptoStub.deriveKey.returns(resolves('derivedKey'));
            getUserKeyPairStub.returns(resolves({
                privateKey: {
                    _id: 'pgpKeyId',
                    encryptedKey: 'pgpKey'
                }
            }));
            cryptoStub.encrypt.returns(rejects(42));

            keychainDao.uploadPrivateKey({
                code: 'code',
                userId: testUser
            }).catch(function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(getUserKeyPairStub.calledOnce).to.be.true;
                expect(cryptoStub.encrypt.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to error in _authenticateToPrivateKeyServer', function(done) {
            cryptoStub.deriveKey.returns(resolves('derivedKey'));
            getUserKeyPairStub.returns(resolves({
                privateKey: {
                    _id: 'pgpKeyId',
                    encryptedKey: 'pgpKey'
                }
            }));
            cryptoStub.encrypt.returns(resolves('encryptedPgpKey'));
            _authenticateToPrivateKeyServerStub.returns(rejects(42));

            keychainDao.uploadPrivateKey({
                code: 'code',
                userId: testUser
            }).catch(function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(getUserKeyPairStub.calledOnce).to.be.true;
                expect(cryptoStub.encrypt.calledOnce).to.be.true;
                expect(_authenticateToPrivateKeyServerStub.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to error in cryptoStub.encrypt', function(done) {
            cryptoStub.deriveKey.returns(resolves('derivedKey'));
            getUserKeyPairStub.returns(resolves({
                privateKey: {
                    _id: 'pgpKeyId',
                    encryptedKey: 'pgpKey'
                }
            }));
            cryptoStub.encrypt.withArgs('pgpKey').returns(resolves('encryptedPgpKey'));
            _authenticateToPrivateKeyServerStub.returns(resolves({
                sessionId: 'sessionId',
                sessionKey: 'sessionKey'
            }));
            cryptoStub.encrypt.withArgs('encryptedPgpKey').returns(rejects(42));

            keychainDao.uploadPrivateKey({
                code: 'code',
                userId: testUser
            }).catch(function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(getUserKeyPairStub.calledOnce).to.be.true;
                expect(cryptoStub.encrypt.calledTwice).to.be.true;
                expect(_authenticateToPrivateKeyServerStub.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            cryptoStub.deriveKey.returns(resolves('derivedKey'));
            getUserKeyPairStub.returns(resolves({
                privateKey: {
                    _id: 'pgpKeyId',
                    encryptedKey: 'pgpKey'
                }
            }));
            cryptoStub.encrypt.withArgs('pgpKey').returns(resolves('encryptedPgpKey'));
            _authenticateToPrivateKeyServerStub.returns(resolves({
                sessionId: 'sessionId',
                sessionKey: 'sessionKey'
            }));
            cryptoStub.encrypt.withArgs('encryptedPgpKey').returns(resolves('doubleEncryptedPgpKey'));
            privkeyDaoStub.upload.returns(resolves());

            keychainDao.uploadPrivateKey({
                code: 'code',
                userId: testUser
            }).then(function() {
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

            privkeyDaoStub.requestDownload.withArgs(options).returns(resolves());
            keychainDao.requestPrivateKeyDownload(options).then(done);
        });
    });

    describe('hasPrivateKey', function() {
        it('should work', function(done) {
            var options = {
                userId: testUser,
                keyId: 'someId'
            };

            privkeyDaoStub.hasPrivateKey.withArgs(options).returns(resolves());
            keychainDao.hasPrivateKey(options).then(done);
        });
    });

    describe('downloadPrivateKey', function() {
        it('should work', function(done) {
            var options = {
                recoveryToken: 'token'
            };

            privkeyDaoStub.download.withArgs(options).returns(resolves());
            keychainDao.downloadPrivateKey(options).then(done);
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
            keychainDao.decryptAndStorePrivateKeyLocally({}).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail due to crypto.deriveKey', function(done) {
            cryptoStub.deriveKey.returns(rejects(42));

            keychainDao.decryptAndStorePrivateKeyLocally(testData).catch(function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to crypto.decrypt', function(done) {
            cryptoStub.deriveKey.returns(resolves('derivedKey'));
            cryptoStub.decrypt.returns(rejects(42));

            keychainDao.decryptAndStorePrivateKeyLocally(testData).catch(function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(cryptoStub.decrypt.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to pgp.getKeyParams', function(done) {
            cryptoStub.deriveKey.returns(resolves('derivedKey'));
            cryptoStub.decrypt.returns(resolves('privateKeyArmored'));
            pgpStub.getKeyParams.returns(rejects(new Error()));

            keychainDao.decryptAndStorePrivateKeyLocally(testData).catch(function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(cryptoStub.decrypt.calledOnce).to.be.true;
                expect(pgpStub.getKeyParams.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to saveLocalPrivateKey', function(done) {
            cryptoStub.deriveKey.returns(resolves('derivedKey'));
            cryptoStub.decrypt.returns(resolves('privateKeyArmored'));
            pgpStub.getKeyParams.returns(testData);
            saveLocalPrivateKeyStub.returns(rejects(42));

            keychainDao.decryptAndStorePrivateKeyLocally(testData).catch(function(err) {
                expect(err).to.exist;
                expect(cryptoStub.deriveKey.calledOnce).to.be.true;
                expect(cryptoStub.decrypt.calledOnce).to.be.true;
                expect(pgpStub.getKeyParams.calledOnce).to.be.true;
                expect(saveLocalPrivateKeyStub.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            cryptoStub.deriveKey.returns(resolves('derivedKey'));
            cryptoStub.decrypt.returns(resolves('privateKeyArmored'));
            pgpStub.getKeyParams.returns(testData);
            saveLocalPrivateKeyStub.returns(resolves());

            keychainDao.decryptAndStorePrivateKeyLocally(testData).then(function(keyObject) {
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

            keychainDao.putUserKeyPair(keypair).catch(function(err) {
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

            lawnchairDaoStub.persist.returns(resolves());
            pubkeyDaoStub.put.returns(resolves());

            keychainDao.putUserKeyPair(keypair).then(function() {
                expect(lawnchairDaoStub.persist.calledTwice).to.be.true;
                expect(pubkeyDaoStub.put.calledOnce).to.be.true;
                done();
            });
        });
    });

});