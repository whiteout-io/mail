'use strict';

var RestDAO = require('../../../src/js/service/rest'),
    PrivateKeyDAO = require('../../../src/js/service/privatekey'),
    appConfig = require('../../../src/js/app-config');

describe('Private Key DAO unit tests', function() {

    var privkeyDao, restDaoStub,
        emailAddress = 'test@example.com',
        deviceName = 'iPhone Work';

    beforeEach(function() {
        restDaoStub = sinon.createStubInstance(RestDAO);
        privkeyDao = new PrivateKeyDAO(restDaoStub, appConfig);
    });

    afterEach(function() {});

    describe('requestDeviceRegistration', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.requestDeviceRegistration({}).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            restDaoStub.post.returns(resolves({
                encryptedRegSessionKey: 'asdf'
            }));

            privkeyDao.requestDeviceRegistration({
                userId: emailAddress,
                deviceName: deviceName
            }).then(function(sessionKey) {
                expect(sessionKey).to.exist;
                done();
            });
        });
    });

    describe('uploadDeviceSecret', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.uploadDeviceSecret({}).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            restDaoStub.put.returns(resolves());

            privkeyDao.uploadDeviceSecret({
                userId: emailAddress,
                deviceName: deviceName,
                encryptedDeviceSecret: 'asdf',
                iv: 'iv'
            }).then(done);
        });
    });

    describe('requestAuthSessionKey', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.requestAuthSessionKey({}).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            restDaoStub.post.withArgs(undefined, '/auth/user/' + emailAddress).returns(resolves());

            privkeyDao.requestAuthSessionKey({
                userId: emailAddress
            }).then(done);
        });
    });

    describe('verifyAuthentication', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.verifyAuthentication({}).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            var sessionId = '1';

            var options = {
                userId: emailAddress,
                sessionId: sessionId,
                encryptedChallenge: 'asdf',
                encryptedDeviceSecret: 'qwer',
                iv: ' iv'
            };

            restDaoStub.put.withArgs(options, '/auth/user/' + emailAddress + '/session/' + sessionId).returns(resolves());

            privkeyDao.verifyAuthentication(options).then(done);
        });
    });

    describe('upload', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.upload({}).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            var options = {
                _id: '12345',
                userId: emailAddress,
                encryptedPrivateKey: 'asdf',
                sessionId: '1',
                salt: 'salt',
                iv: 'iv'
            };

            restDaoStub.post.withArgs(options, '/privatekey/user/' + emailAddress + '/session/' + options.sessionId).returns(resolves());

            privkeyDao.upload(options).then(done);
        });
    });

    describe('requestDownload', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.requestDownload({}).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should not find a key', function(done) {
            var keyId = '12345';

            restDaoStub.get.withArgs({
                uri: '/privatekey/user/' + emailAddress + '/key/' + keyId
            }).returns(rejects({
                code: 404
            }));

            privkeyDao.requestDownload({
                userId: emailAddress,
                keyId: keyId
            }).then(function(found) {
                expect(found).to.be.false;
                done();
            });
        });

        it('should work', function(done) {
            var keyId = '12345';

            restDaoStub.get.withArgs({
                uri: '/privatekey/user/' + emailAddress + '/key/' + keyId
            }).returns(resolves());

            privkeyDao.requestDownload({
                userId: emailAddress,
                keyId: keyId
            }).then(function(found) {
                expect(found).to.be.true;
                done();
            });
        });
    });

    describe('hasPrivateKey', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.hasPrivateKey({}).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should not find a key', function(done) {
            var keyId = '12345';

            restDaoStub.get.withArgs({
                uri: '/privatekey/user/' + emailAddress + '/key/' + keyId + '?ignoreRecovery=true'
            }).returns(rejects({
                code: 404
            }));

            privkeyDao.hasPrivateKey({
                userId: emailAddress,
                keyId: keyId
            }).then(function(found) {
                expect(found).to.be.false;
                done();
            });
        });

        it('should work', function(done) {
            var keyId = '12345';

            restDaoStub.get.withArgs({
                uri: '/privatekey/user/' + emailAddress + '/key/' + keyId + '?ignoreRecovery=true'
            }).returns(resolves());

            privkeyDao.hasPrivateKey({
                userId: emailAddress,
                keyId: keyId
            }).then(function(found) {
                expect(found).to.be.true;
                done();
            });
        });
    });

    describe('download', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.download({}).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            var key = {
                _id: '12345'
            };

            restDaoStub.get.withArgs({
                uri: '/privatekey/user/' + emailAddress + '/key/' + key._id + '/recovery/token'
            }).returns(resolves());

            privkeyDao.download({
                userId: emailAddress,
                keyId: key._id,
                recoveryToken: 'token'
            }).then(done);
        });
    });

});