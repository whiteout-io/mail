define(function(require) {
    'use strict';

    var RestDAO = require('js/dao/rest-dao'),
        PrivateKeyDAO = require('js/dao/privatekey-dao'),
        expect = chai.expect;

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
                    encryptedDeviceSecret: 'asdf'
                }, function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        describe('requestAuthSessionKeys', function() {
            it('should fail due to invalid args', function(done) {
                privkeyDao.requestAuthSessionKeys({}, function(err) {
                    expect(err).to.exist;
                    done();
                });
            });

            it('should work', function(done) {
                restDaoStub.post.withArgs(undefined, '/auth/user/' + emailAddress).yields();

                privkeyDao.requestAuthSessionKeys({
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

                restDaoStub.put.withArgs('asdf', '/auth/user/' + emailAddress + '/session/' + sessionId).yields();

                privkeyDao.verifyAuthentication({
                    userId: emailAddress,
                    sessionId: sessionId,
                    encryptedChallenge: 'asdf'
                }, function(err) {
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
                var key = {
                    _id: '12345'
                };

                restDaoStub.post.withArgs(key, '/privatekey/user/' + emailAddress + '/key/' + key._id).yields();

                privkeyDao.upload({
                    userId: emailAddress,
                    encryptedPrivateKey: key
                }, function(err) {
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
                var key = {
                    _id: '12345'
                };

                restDaoStub.get.withArgs({
                    uri: '/privatekey/user/' + emailAddress + '/key/' + key._id
                }).yields();

                privkeyDao.requestDownload({
                    userId: emailAddress,
                    keyId: key._id
                }, function(err) {
                    expect(err).to.not.exist;
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

});