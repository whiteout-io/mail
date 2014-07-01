define(function(require) {
    'use strict';

    var controller = require('js/app-controller'),
        EmailDAO = require('js/dao/email-dao'),
        OutboxBO = require('js/bo/outbox'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        UpdateHandler = require('js/util/update/update-handler'),
        Auth = require('js/bo/auth'),
        expect = chai.expect;

    describe('App Controller unit tests', function() {
        var emailDaoStub, outboxStub, updateHandlerStub, appConfigStoreStub, devicestorageStub, isOnlineStub, authStub;

        beforeEach(function() {
            controller._emailDao = emailDaoStub = sinon.createStubInstance(EmailDAO);
            controller._outboxBo = outboxStub = sinon.createStubInstance(OutboxBO);
            controller._appConfigStore = appConfigStoreStub = sinon.createStubInstance(DeviceStorageDAO);
            controller._userStorage = devicestorageStub = sinon.createStubInstance(DeviceStorageDAO);
            controller._updateHandler = updateHandlerStub = sinon.createStubInstance(UpdateHandler);
            controller._auth = authStub = sinon.createStubInstance(Auth);

            isOnlineStub = sinon.stub(controller, 'isOnline');
        });

        afterEach(function() {
            isOnlineStub.restore();
        });

        describe('buildModules', function() {
            it('should work', function() {
                controller.buildModules({
                    onError: function() {}
                });
                expect(controller._appConfigStore).to.exist;
                expect(controller._auth).to.exist;
                expect(controller._userStorage).to.exist;
                expect(controller._invitationDao).to.exist;
                expect(controller._keychain).to.exist;
                expect(controller._pgp).to.exist;
                expect(controller._pgpbuilder).to.exist;
                expect(controller._emailDao).to.exist;
                expect(controller._outboxBo).to.exist;
                expect(controller._updateHandler).to.exist;
            });
        });

        describe('start', function() {
            it('should not explode', function(done) {
                controller.start({
                    onError: function() {}
                }, function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        describe('onDisconnect', function() {
            it('should work', function() {
                controller.onDisconnect();

                expect(emailDaoStub.onDisconnect.calledOnce).to.be.true;
            });
        });

        describe('onConnect', function() {
            beforeEach(function() {
                controller._emailDao._account = {};
            });

            it('should not connect if offline', function(done) {
                isOnlineStub.returns(false);

                controller.onConnect(function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });

            it('should not connect if account is not initialized', function(done) {
                controller._emailDao._account = null;

                controller.onConnect(function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });

            it('should fail due to error in auth.getCredentials', function(done) {
                isOnlineStub.returns(true);
                authStub.getCredentials.yields(new Error());

                controller.onConnect(function(err) {
                    expect(err).to.exist;
                    expect(authStub.getCredentials.calledOnce).to.be.true;
                    done();
                });
            });

            it('should work', function(done) {
                isOnlineStub.returns(true);
                authStub.getCredentials.yields(null, {
                    emailAddress: 'asdf@example.com',
                    oauthToken: 'token',
                    sslCert: 'cert'
                    imap: {},
                    smtp: {}
                });
                emailDaoStub.onConnect.yields();

                controller.onConnect(function(err) {
                    expect(err).to.not.exist;
                    expect(authStub.getCredentials.calledOnce).to.be.true;
                    expect(emailDaoStub.onConnect.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('init', function() {
            var onConnectStub, emailAddress;

            beforeEach(function() {
                emailAddress = 'alice@bob.com';

                // onConnect
                onConnectStub = sinon.stub(controller, 'onConnect');
            });

            afterEach(function() {
                onConnectStub.restore();
            });

            it('should fail due to error in storage initialization', function(done) {
                devicestorageStub.init.withArgs(undefined).yields({});

                controller.init({}, function(err, keypair) {
                    expect(err).to.exist;
                    expect(keypair).to.not.exist;
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(updateHandlerStub.update.calledOnce).to.be.false;
                    done();
                });
            });

            it('should fail due to error in update handler', function(done) {
                devicestorageStub.init.yields();
                updateHandlerStub.update.yields({});

                controller.init({
                    emailAddress: emailAddress
                }, function(err, keypair) {
                    expect(err).to.exist;
                    expect(keypair).to.not.exist;
                    expect(updateHandlerStub.update.calledOnce).to.be.true;
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    done();
                });
            });

            it('should fail due to error in emailDao.init', function(done) {
                devicestorageStub.init.yields();
                updateHandlerStub.update.yields();
                emailDaoStub.init.yields({});

                controller.init({
                    emailAddress: emailAddress
                }, function(err, keypair) {
                    expect(err).to.exist;
                    expect(keypair).to.not.exist;
                    expect(updateHandlerStub.update.calledOnce).to.be.true;
                    expect(emailDaoStub.init.calledOnce).to.be.true;
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    done();
                });
            });

            it('should work and return a keypair', function(done) {
                devicestorageStub.init.withArgs(emailAddress).yields();
                emailDaoStub.init.yields(null, {});
                updateHandlerStub.update.yields();

                controller.init({
                    emailAddress: emailAddress
                }, function(err, keypair) {
                    expect(err).to.not.exist;
                    expect(keypair).to.exist;
                    expect(updateHandlerStub.update.calledOnce).to.be.true;
                    expect(emailDaoStub.init.calledOnce).to.be.true;
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    done();
                });
            });
        });
    });
});