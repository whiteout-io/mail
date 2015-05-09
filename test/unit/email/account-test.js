'use strict';

var Account = require('../../../src/js/email/account'),
    appConfig = require('../../../src/js/app-config'),
    Auth = require('../../../src/js/service/auth'),
    DeviceStorageDAO = require('../../../src/js/service/devicestorage'),
    Email = require('../../../src/js/email/email'),
    Outbox = require('../../../src/js/email/outbox'),
    Keychain = require('../../../src/js/service/keychain'),
    UpdateHandler = require('../../../src/js/util/update/update-handler'),
    Dialog = require('../../../src/js/util/dialog');

describe('Account Service unit test', function() {
    var account, authStub, outboxStub, emailStub, devicestorageStub, keychainStub, updateHandlerStub, dialogStub,
        realname = 'John Doe',
        dummyUser = 'spiderpig@springfield.com';

    chai.config.includeStack = true;

    beforeEach(function() {
        authStub = sinon.createStubInstance(Auth);
        outboxStub = sinon.createStubInstance(Outbox);
        devicestorageStub = sinon.createStubInstance(DeviceStorageDAO);
        emailStub = sinon.createStubInstance(Email);
        outboxStub = sinon.createStubInstance(Outbox);
        keychainStub = sinon.createStubInstance(Keychain);
        updateHandlerStub = sinon.createStubInstance(UpdateHandler);
        dialogStub = sinon.createStubInstance(Dialog);
        account = new Account(appConfig, authStub, devicestorageStub, emailStub, outboxStub, keychainStub, updateHandlerStub, dialogStub);
    });

    afterEach(function() {});

    describe('isLoggedIn', function() {
        it('should be logged in', function() {
            account._accounts = [{}];
            expect(account.isLoggedIn()).to.be.true;
        });
        it('should not be logged in', function() {
            account._accounts = [];
            expect(account.isLoggedIn()).to.be.false;
        });
    });

    describe('list', function() {
        it('should work', function() {
            var testAccounts = [{
                foo: 'bar'
            }];
            account._accounts = testAccounts;
            expect(account.list()).to.deep.equal(testAccounts);
        });
    });

    describe('init', function() {
        it('should fail for invalid email address', function() {
            account.init({
                emailAddress: dummyUser.replace('@'),
                realname: realname
            }).catch(function onInit(err) {
                expect(err).to.exist;
            });
        });

        it('should fail for _accountStore.init', function() {
            devicestorageStub.init.returns(rejects(new Error('asdf')));

            account.init({
                emailAddress: dummyUser,
                realname: realname
            }).catch(function onInit(err) {
                expect(err.message).to.match(/asdf/);
            });
        });

        it('should fail for _updateHandler.update', function() {
            devicestorageStub.init.returns(resolves());
            updateHandlerStub.update.returns(rejects(new Error('asdf')));

            account.init({
                emailAddress: dummyUser,
                realname: realname
            }).catch(function onInit(err) {
                expect(err.message).to.match(/Updating/);
            });
        });

        it('should fail for _keychain.getUserKeyPair', function() {
            devicestorageStub.init.returns(resolves());
            updateHandlerStub.update.returns(resolves());
            keychainStub.getUserKeyPair.returns(rejects(new Error('asdf')));

            account.init({
                emailAddress: dummyUser,
                realname: realname
            }).catch(function(err) {
                expect(err.message).to.match(/asdf/);
            });
        });

        it('should fail for _keychain.refreshKeyForUserId', function() {
            var storedKeys = {
                publicKey: 'publicKey'
            };

            devicestorageStub.init.returns(resolves());
            updateHandlerStub.update.returns(resolves());
            keychainStub.getUserKeyPair.returns(resolves(storedKeys));
            keychainStub.refreshKeyForUserId.returns(rejects(new Error('asdf')));

            account.init({
                emailAddress: dummyUser,
                realname: realname
            }).catch(function(err) {
                expect(err.message).to.match(/asdf/);
            });
        });

        it('should fail for _emailDao.init after _keychain.refreshKeyForUserId', function() {
            var storedKeys = {
                publicKey: 'publicKey'
            };

            devicestorageStub.init.returns(resolves());
            updateHandlerStub.update.returns(resolves());
            keychainStub.getUserKeyPair.returns(resolves(storedKeys));
            keychainStub.refreshKeyForUserId.returns(resolves(storedKeys));
            emailStub.init.returns(rejects(new Error('asdf')));

            account.init({
                emailAddress: dummyUser,
                realname: realname
            }).catch(function(err) {
                expect(err.message).to.match(/asdf/);
            });
        });

        it('should fail for _emailDao.init', function() {
            var storedKeys = {
                publicKey: 'publicKey',
                privateKey: 'privateKey'
            };

            devicestorageStub.init.returns(resolves());
            updateHandlerStub.update.returns(resolves());
            keychainStub.getUserKeyPair.returns(resolves(storedKeys));
            emailStub.init.returns(rejects(new Error('asdf')));

            account.init({
                emailAddress: dummyUser,
                realname: realname
            }).catch(function(err) {
                expect(err.message).to.match(/asdf/);
            });
        });

        it('should work after _keychain.refreshKeyForUserId', function() {
            var storedKeys = {
                publicKey: 'publicKey'
            };

            devicestorageStub.init.returns(resolves());
            updateHandlerStub.update.returns(resolves());
            keychainStub.getUserKeyPair.returns(resolves(storedKeys));
            keychainStub.refreshKeyForUserId.returns(resolves('publicKey'));
            emailStub.init.returns(resolves());

            account.init({
                emailAddress: dummyUser,
                realname: realname
            }, function onInit(keys) {
                expect(keys).to.deep.equal(storedKeys);
                expect(keychainStub.refreshKeyForUserId.calledOnce).to.be.true;
                expect(emailStub.init.calledOnce).to.be.true;
            });
        });

        it('should work', function() {
            var storedKeys = {
                publicKey: 'publicKey',
                privateKey: 'privateKey'
            };

            devicestorageStub.init.returns(resolves());
            updateHandlerStub.update.returns(resolves());
            keychainStub.getUserKeyPair.returns(resolves(storedKeys));
            emailStub.init.returns(resolves());

            account.init({
                emailAddress: dummyUser,
                realname: realname
            }, function onInit(keys) {
                expect(keys).to.equal(storedKeys);
                expect(keychainStub.refreshKeyForUserId.called).to.be.false;
                expect(emailStub.init.calledOnce).to.be.true;
                expect(account._accounts.length).to.equal(1);
            });
        });
    });

    describe('onConnect', function() {
        beforeEach(function() {
            emailStub._account = {};
        });

        it('should work', function(done) {
            emailStub.onConnect.returns(resolves());

            account.onConnect(function(err) {
                expect(err).to.not.exist;
                expect(emailStub.onConnect.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('onDisconnect', function() {
        it('should work', function(done) {
            emailStub.onDisconnect.returns(resolves());
            account.onDisconnect().then(done);
        });
    });

    describe('logout', function() {
        // cannot test the good case here or the browser will refresh during the test.

        it('should fail due to _auth.logout', function(done) {
            authStub.logout.returns(rejects(new Error('asdf')));

            account.logout().catch(function(err) {
                expect(err.message).to.match(/asdf/);
                expect(authStub.logout.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to _accountStore.clear', function(done) {
            authStub.logout.returns(resolves());
            devicestorageStub.clear.returns(rejects(new Error('asdf')));

            account.logout().catch(function(err) {
                expect(err.message).to.match(/asdf/);
                expect(devicestorageStub.clear.calledOnce).to.be.true;
                expect(authStub.logout.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to _emailDao.onDisconnect', function(done) {
            authStub.logout.returns(resolves());
            devicestorageStub.clear.returns(resolves());
            emailStub.onDisconnect.returns(rejects(new Error('asdf')));

            account.logout().catch(function(err) {
                expect(err.message).to.match(/asdf/);
   
                expect(emailStub.onDisconnect.calledOnce).to.be.true;
                expect(authStub.logout.calledOnce).to.be.true;
                expect(devicestorageStub.clear.calledOnce).to.be.true;
   
                done();
            });
        });
    });

});