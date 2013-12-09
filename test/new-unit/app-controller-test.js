define(function(require) {
    'use strict';

    var controller = require('js/app-controller'),
        EmailDAO = require('js/dao/email-dao'),
        OutboxBO = require('js/bo/outbox'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        $ = require('jquery'),
        expect = chai.expect;

    var appControllerTest = {
        user: 'test@exmaple.com',
        passphrase: 'asdf'
    };

    describe('App Controller unit tests', function() {
        var emailDaoStub, outboxStub, appConfigStoreStub, isOnlineStub,
            identityStub;

        beforeEach(function() {
            emailDaoStub = sinon.createStubInstance(EmailDAO);
            controller._emailDao = emailDaoStub;
            outboxStub = sinon.createStubInstance(OutboxBO);
            controller._outboxBo = outboxStub;
            appConfigStoreStub = sinon.createStubInstance(DeviceStorageDAO);
            controller._appConfigStore = appConfigStoreStub;

            isOnlineStub = sinon.stub(controller, 'isOnline');

            sinon.stub($, 'get');
            sinon.stub($, 'ajax').yieldsTo('success', {
                email: appControllerTest.user
            });

            window.chrome = window.chrome || {};
            window.chrome.identity = window.chrome.identity || {};
            if (typeof window.chrome.identity.getAuthToken !== 'function') {
                window.chrome.identity.getAuthToken = function() {};
            }
            identityStub = sinon.stub(window.chrome.identity, 'getAuthToken');
        });

        afterEach(function() {
            $.get.restore();
            $.ajax.restore();
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

            it('should fail due to error in fetchOAuthToken', function(done) {
                appConfigStoreStub.listItems.yields(null, []);
                isOnlineStub.returns(true);
                fetchOAuthTokenStub.yields({});

                controller.getEmailAddress(function(err, emailAddress) {
                    expect(err).to.exist;
                    expect(emailAddress).to.not.exist;
                    expect(fetchOAuthTokenStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should fail work when fetching oauth token', function(done) {
                appConfigStoreStub.listItems.yields(null, []);
                isOnlineStub.returns(true);
                fetchOAuthTokenStub.yields(null, {
                    emailAddress: 'asfd@example.com'
                });

                controller.getEmailAddress(function(err, emailAddress) {
                    expect(err).to.not.exist;
                    expect(emailAddress).to.equal('asfd@example.com');
                    expect(fetchOAuthTokenStub.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('fetchOAuthToken', function() {
            it('should work the first time', function(done) {
                appConfigStoreStub.listItems.yields(null, []);
                appConfigStoreStub.storeList.yields();
                identityStub.yields('token42');

                controller.fetchOAuthToken(function(err) {
                    expect(err).to.not.exist;
                    expect(appConfigStoreStub.listItems.calledOnce).to.be.true;
                    expect(appConfigStoreStub.storeList.calledOnce).to.be.true;
                    expect(identityStub.calledOnce).to.be.true;
                    expect($.ajax.calledOnce).to.be.true;
                    done();
                });
            });

            it('should work when the email address is cached', function(done) {
                appConfigStoreStub.listItems.yields(null, ['asdf']);
                identityStub.yields('token42');

                controller.fetchOAuthToken(function(err) {
                    expect(err).to.not.exist;
                    expect(appConfigStoreStub.listItems.calledOnce).to.be.true;
                    expect(identityStub.calledOnce).to.be.true;
                    expect($.ajax.called).to.be.false;
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
            var buildModulesStub, onConnectStub;

            beforeEach(function() {
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

            it('should fail due to error in emailDao.init', function(done) {
                emailDaoStub.init.yields({});

                controller.init({}, function(err) {
                    expect(err).to.exist;
                    done();
                });
            });

            it('should fail due to error in onConnect', function(done) {
                emailDaoStub.init.yields();

                onConnectStub.yields({});

                controller.init({}, function(err) {
                    expect(err).to.exist;
                    expect(onConnectStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should pass email dao init when offline', function(done) {
                emailDaoStub.init.yields({
                    code: 42
                });

                onConnectStub.yields();
                outboxStub.init.returns();

                controller.init({}, function(err) {
                    expect(err).to.not.exist;
                    expect(onConnectStub.calledOnce).to.be.true;
                    expect(outboxStub.init.calledOnce).to.be.true;
                    done();
                });
            });

            it('should work and return a keypair', function(done) {
                emailDaoStub.init.yields(null, {});

                onConnectStub.yields();
                outboxStub.init.returns();

                controller.init({}, function(err, keypair) {
                    expect(err).to.not.exist;
                    expect(keypair).to.exist;
                    expect(onConnectStub.calledOnce).to.be.true;
                    expect(outboxStub.init.calledOnce).to.be.true;
                    done();
                });
            });
        });

    });

});