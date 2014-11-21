'use strict';

var Account = require('../../../src/js/email/account'),
    appConfig = require('../../../src/js/app-config'),
    Auth = require('../../../src/js/service/auth'),
    DeviceStorageDAO = require('../../../src/js/service/devicestorage'),
    Email = require('../../../src/js/email/email'),
    Outbox = require('../../../src/js/email/outbox'),
    Keychain = require('../../../src/js/service/keychain'),
    UpdateHandler = require('../../../src/js/util/update/update-handler');

describe('Account Service unit test', function() {
    var account, authStub, outboxStub, emailStub, devicestorageStub, keychainStub, updateHandlerStub, pgpbuilderStub,
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
        pgpbuilderStub = {};
        account = new Account(appConfig, authStub, devicestorageStub, emailStub, outboxStub, keychainStub, updateHandlerStub, pgpbuilderStub);
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

});