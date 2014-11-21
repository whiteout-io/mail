'use strict';

var RestDAO = require('../../src/js/dao/rest-dao'),
    PrivateKeyDAO = require('../../src/js/dao/privatekey-dao');

describe('Private Key DAO unit tests', function() {

    var privkeyDao, restDaoStub,
        emailAddress = 'test@example.com',
        deviceName = 'iPhone Work';

    beforeEach(function() {
        restDaoStub = sinon.createStubInstance(RestDAO);
        privkeyDao = new PrivateKeyDAO(restDaoStub);
    });

    afterEach(function() {});

    describe('requestDeviceRegistration', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.requestDeviceRegistration({}, function(err, sessionKey) {
                expect(err).to.exist;
                expect(sessionKey).to.not.exist;
                done();
            });
        });

        it('should work', function(done) {
            restDaoStub.post.yields(null, {
                encryptedRegSessionKey: 'asdf'
            });

            privkeyDao.requestDeviceRegistration({
                userId: emailAddress,
                deviceName: deviceName
            }, function(err, sessionKey) {
                expect(err).to.not.exist;
                expect(sessionKey).to.exist;
                done();
            });
        });
    });

    describe('uploadDeviceSecret', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.uploadDeviceSecret({}, function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            restDaoStub.put.yields();

            privkeyDao.uploadDeviceSecret({
                userId: emailAddress,
                deviceName: deviceName,
                encryptedDeviceSecret: 'asdf',
                iv: 'iv'
            }, function(err) {
                expect(err).to.not.exist;
                done();
            });
        });
    });

    describe('requestAuthSessionKey', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.requestAuthSessionKey({}, function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            restDaoStub.post.withArgs(undefined, '/auth/user/' + emailAddress).yields();

            privkeyDao.requestAuthSessionKey({
                userId: emailAddress
            }, function(err) {
                expect(err).to.not.exist;
                done();
            });
        });
    });

    describe('verifyAuthentication', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.verifyAuthentication({}, function(err) {
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

            restDaoStub.put.withArgs(options, '/auth/user/' + emailAddress + '/session/' + sessionId).yields();

            privkeyDao.verifyAuthentication(options, function(err) {
                expect(err).to.not.exist;
                done();
            });
        });
    });

    describe('upload', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.upload({}, function(err) {
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

            restDaoStub.post.withArgs(options, '/privatekey/user/' + emailAddress + '/session/' + options.sessionId).yields();

            privkeyDao.upload(options, function(err) {
                expect(err).to.not.exist;
                done();
            });
        });
    });

    describe('requestDownload', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.requestDownload({}, function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            var keyId = '12345';

            restDaoStub.get.withArgs({
                uri: '/privatekey/user/' + emailAddress + '/key/' + keyId
            }).yields();

            privkeyDao.requestDownload({
                userId: emailAddress,
                keyId: keyId
            }, function(err, found) {
                expect(err).to.not.exist;
                expect(found).to.be.true;
                done();
            });
        });
    });

    describe('hasPrivateKey', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.hasPrivateKey({}, function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            var keyId = '12345';

            restDaoStub.get.withArgs({
                uri: '/privatekey/user/' + emailAddress + '/key/' + keyId + '?ignoreRecovery=true'
            }).yields();

            privkeyDao.hasPrivateKey({
                userId: emailAddress,
                keyId: keyId
            }, function(err, found) {
                expect(err).to.not.exist;
                expect(found).to.be.true;
                done();
            });
        });
    });

    describe('download', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.download({}, function(err) {
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
            }).yields();

            privkeyDao.download({
                userId: emailAddress,
                keyId: key._id,
                recoveryToken: 'token'
            }, function(err) {
                expect(err).to.not.exist;
                done();
            });
        });
    });

});