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
            lawnchairDaoStub.list.withArgs('publickey').returns(resolves());

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
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(resolves(oldKey));

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }).then(function(key) {
                expect(key).to.to.equal(oldKey);

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;

                done();
            });
        });

        it('should update key', function(done) {
            getPubKeyStub.returns(resolves(oldKey));
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
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.calledOnce).to.be.true;
                expect(lawnchairDaoStub.persist.calledOnce).to.be.true;

                done();
            });
        });

        it('should update key without approval', function(done) {
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(resolves(newKey));
            lawnchairDaoStub.remove.withArgs('publickey_' + oldKey._id).returns(resolves());
            lawnchairDaoStub.persist.withArgs('publickey_' + newKey._id, newKey).returns(resolves());

            keychainDao.refreshKeyForUserId({
                userId: testUser,
                overridePermission: true
            }).then(function(key) {
                expect(key).to.equal(newKey);

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.calledOnce).to.be.true;
                expect(lawnchairDaoStub.persist.calledOnce).to.be.true;

                done();
            });
        });

        it('should remove key', function(done) {
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(resolves());
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
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.calledOnce).to.be.true;
                expect(lawnchairDaoStub.persist.called).to.be.false;

                done();
            });
        });

        it('should go offline while fetching new key', function(done) {
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(resolves());
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(rejects({
                code: 42
            }));

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }).then(function(key) {
                expect(key).to.to.equal(oldKey);

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.called).to.be.false;
                expect(lawnchairDaoStub.persist.called).to.be.false;

                done();
            });
        });

        it('should not remove old key on user rejection', function(done) {
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(resolves());
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
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(rejects({
                code: 42
            }));

            keychainDao.refreshKeyForUserId({
                userId: testUser
            }).then(function(key) {
                expect(key).to.to.equal(oldKey);

                expect(getPubKeyStub.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.called).to.be.false;
                expect(lawnchairDaoStub.persist.called).to.be.false;

                done();
            });
        });

        it('should error while persisting new key', function(done) {
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(resolves());
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
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.calledOnce).to.be.true;
                expect(lawnchairDaoStub.persist.calledOnce).to.be.true;

                done();
            });
        });

        it('should error while deleting old key', function(done) {
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(resolves());
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
                expect(lawnchairDaoStub.remove.calledOnce).to.be.true;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.persist.called).to.be.false;

                done();
            });
        });

        it('should error while persisting new key', function(done) {
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(resolves());
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
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                expect(lawnchairDaoStub.remove.calledOnce).to.be.true;
                expect(lawnchairDaoStub.persist.calledOnce).to.be.true;

                done();
            });
        });

        it('should error when get failed', function(done) {
            getPubKeyStub.returns(resolves(oldKey));
            pubkeyDaoStub.getByUserId.withArgs(testUser).returns(rejects({}));

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
                publicKey: 'asdf'
            }]));
            pgpStub.getKeyParams.returns({
                userIds: [{
                    emailAddress: testUser
                }]
            });

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
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                done();
            });
        });

        it('should work if local key is from a source other than the whiteout key server', function(done) {
            lawnchairDaoStub.list.returns(resolves([{
                _id: '12345',
                userId: testUser,
                publicKey: 'asdf',
                source: 'pgp.mit.edu'
            }]));
            pubkeyDaoStub.getByUserId.returns(resolves());

            keychainDao.getUserKeyPair(testUser).then(function(keys) {
                expect(keys).to.not.exist;
                expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                expect(lawnchairDaoStub.read.called).to.be.false;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                done();
            });
        });

        it('should work if cloud public key is from a source other than the whiteout key server', function(done) {
            lawnchairDaoStub.list.returns(resolves());
            pubkeyDaoStub.getByUserId.returns(resolves({
                _id: '12345',
                publicKey: 'asdf',
                source: 'pgp.mit.edu'
            }));

            keychainDao.getUserKeyPair(testUser).then(function(keys) {
                expect(keys).to.not.exist;
                expect(pubkeyDaoStub.getByUserId.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('upload public key', function() {
        it('should upload key', function(done) {
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

            pubkeyDaoStub.put.withArgs(keypair.publicKey).returns(resolves());

            keychainDao.uploadPublicKey(keypair.publicKey).then(function() {
                expect(pubkeyDaoStub.put.calledOnce).to.be.true;
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