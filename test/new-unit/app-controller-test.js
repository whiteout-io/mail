define(function(require) {
    'use strict';

    var controller = require('js/app-controller'),
        EmailDAO = require('js/dao/email-dao'),
        OutboxBO = require('js/bo/outbox'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        UpdateHandler = require('js/util/update/update-handler'),
        expect = chai.expect;

    describe('App Controller unit tests', function() {
        var emailDaoStub, outboxStub, updateHandlerStub, appConfigStoreStub, devicestorageStub, isOnlineStub,
            identityStub;

        beforeEach(function() {
            controller._emailDao = emailDaoStub = sinon.createStubInstance(EmailDAO);
            controller._outboxBo = outboxStub = sinon.createStubInstance(OutboxBO);
            controller._appConfigStore = appConfigStoreStub = sinon.createStubInstance(DeviceStorageDAO);
            controller._devicestorage = devicestorageStub = sinon.createStubInstance(DeviceStorageDAO);
            controller._updateHandler = updateHandlerStub = sinon.createStubInstance(UpdateHandler);

            isOnlineStub = sinon.stub(controller, 'isOnline');

            window.chrome = window.chrome || {};
            window.chrome.identity = window.chrome.identity || {};
            if (typeof window.chrome.identity.getAuthToken !== 'function') {
                window.chrome.identity.getAuthToken = function() {};
            }
            identityStub = sinon.stub(window.chrome.identity, 'getAuthToken');
        });

        afterEach(function() {
            identityStub.restore();
            isOnlineStub.restore();
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
            it('should work', function(done) {
                emailDaoStub.onDisconnect.yields();

                controller.onDisconnect(function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        describe('onConnect', function() {
            var fetchOAuthTokenStub, getCertficateStub;

            beforeEach(function() {
                // buildModules
                fetchOAuthTokenStub = sinon.stub(controller, 'fetchOAuthToken');
                getCertficateStub = sinon.stub(controller, 'getCertficate');
            });

            afterEach(function() {
                fetchOAuthTokenStub.restore();
                getCertficateStub.restore();
            });

            it('should not connect if offline', function(done) {
                isOnlineStub.returns(false);

                controller.onConnect(function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });

            it('should fail due to error in certificate', function(done) {
                isOnlineStub.returns(true);
                getCertficateStub.yields({});

                controller.onConnect(function(err) {
                    expect(err).to.exist;
                    expect(getCertficateStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should fail due to error in fetch oauth', function(done) {
                isOnlineStub.returns(true);
                getCertficateStub.yields(null, 'PEM');
                fetchOAuthTokenStub.yields({});

                controller.onConnect(function(err) {
                    expect(err).to.exist;
                    expect(fetchOAuthTokenStub.calledOnce).to.be.true;
                    expect(getCertficateStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should work', function(done) {
                isOnlineStub.returns(true);
                fetchOAuthTokenStub.yields(null, {
                    emailAddress: 'asfd@example.com'
                });
                getCertficateStub.yields(null, 'PEM');
                emailDaoStub.onConnect.yields();

                controller.onConnect(function(err) {
                    expect(err).to.not.exist;
                    expect(fetchOAuthTokenStub.calledOnce).to.be.true;
                    expect(getCertficateStub.calledOnce).to.be.true;
                    expect(emailDaoStub.onConnect.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('getEmailAddress', function() {
            var fetchOAuthTokenStub;

            beforeEach(function() {
                // buildModules
                fetchOAuthTokenStub = sinon.stub(controller, 'fetchOAuthToken');
            });

            afterEach(function() {
                fetchOAuthTokenStub.restore();
            });

            it('should fail due to error in config list items', function(done) {
                appConfigStoreStub.listItems.yields({});

                controller.getEmailAddress(function(err, emailAddress) {
                    expect(err).to.exist;
                    expect(emailAddress).to.not.exist;
                    done();
                });
            });

            it('should work if address is already cached', function(done) {
                appConfigStoreStub.listItems.yields(null, ['asdf']);

                controller.getEmailAddress(function(err, emailAddress) {
                    expect(err).to.not.exist;
                    expect(emailAddress).to.exist;
                    done();
                });
            });

            it('should fail first time if app is offline', function(done) {
                appConfigStoreStub.listItems.yields(null, []);
                isOnlineStub.returns(false);

                controller.getEmailAddress(function(err, emailAddress) {
                    expect(err).to.exist;
                    expect(emailAddress).to.not.exist;
                    expect(isOnlineStub.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('fetchOAuthToken', function() {
            var queryEmailAddressStub;

            beforeEach(function() {
                // buildModules
                queryEmailAddressStub = sinon.stub(controller, 'queryEmailAddress');
            });

            afterEach(function() {
                queryEmailAddressStub.restore();
            });

            it('should work', function(done) {
                identityStub.yields('token42');
                queryEmailAddressStub.yields(null, 'bob@asdf.com');

                controller.fetchOAuthToken(function(err, res) {
                    expect(err).to.not.exist;
                    expect(res.emailAddress).to.equal('bob@asdf.com');
                    expect(res.token).to.equal('token42');
                    expect(queryEmailAddressStub.calledOnce).to.be.true;
                    expect(identityStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should fail due to chrome api error', function(done) {
                identityStub.yields();

                controller.fetchOAuthToken(function(err) {
                    expect(err).to.exist;
                    expect(identityStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should fail due error querying email address', function(done) {
                identityStub.yields('token42');
                queryEmailAddressStub.yields();

                controller.fetchOAuthToken(function(err) {
                    expect(err).to.exist;
                    expect(queryEmailAddressStub.calledOnce).to.be.true;
                    expect(identityStub.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('buildModules', function() {
            it('should work', function() {
                controller.buildModules();
                expect(controller._keychain).to.exist;
                expect(controller._crypto).to.exist;
                expect(controller._emailDao).to.exist;
                expect(controller._outboxBo).to.exist;
            });
        });

        describe('init', function() {
            var buildModulesStub, onConnectStub, emailAddress;

            beforeEach(function() {
                emailAddress = 'alice@bob.com';

                // buildModules
                buildModulesStub = sinon.stub(controller, 'buildModules');
                buildModulesStub.returns();
                // onConnect
                onConnectStub = sinon.stub(controller, 'onConnect');
            });

            afterEach(function() {
                buildModulesStub.restore();
                onConnectStub.restore();
            });

            it('should fail due to error in update handler', function(done) {
                devicestorageStub.init.yields();
                updateHandlerStub.update.yields({});

                controller.init({}, function(err, keypair) {
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

                controller.init({}, function(err, keypair) {
                    expect(err).to.exist;
                    expect(keypair).to.not.exist;
                    expect(updateHandlerStub.update.calledOnce).to.be.true;
                    expect(emailDaoStub.init.calledOnce).to.be.true;
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    done();
                });
            });

            it('should fail due to error in onConnect', function(done) {
                devicestorageStub.init.yields();
                updateHandlerStub.update.yields();
                emailDaoStub.init.yields();

                onConnectStub.yields({});

                controller.init({}, function(err) {
                    expect(err).to.exist;
                    expect(updateHandlerStub.update.calledOnce).to.be.true;
                    expect(emailDaoStub.init.calledOnce).to.be.true;
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(onConnectStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should work and return a keypair', function(done) {
                devicestorageStub.init.withArgs(emailAddress).yields();
                emailDaoStub.init.yields(null, {});
                updateHandlerStub.update.yields();

                onConnectStub.yields();

                controller.init({
                    emailAddress: emailAddress
                }, function(err, keypair) {
                    expect(err).to.not.exist;
                    expect(keypair).to.exist;
                    expect(updateHandlerStub.update.calledOnce).to.be.true;
                    expect(emailDaoStub.init.calledOnce).to.be.true;
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(onConnectStub.calledOnce).to.be.true;
                    done();
                });
            });
        });
    });
});