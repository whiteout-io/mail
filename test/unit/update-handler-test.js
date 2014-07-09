define(function(require) {
    'use strict';

    var DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        cfg = require('js/app-config').config,
        UpdateHandler = require('js/util/update/update-handler'),
        expect = chai.expect;

    describe('UpdateHandler', function() {
        var updateHandler, appConfigStorageStub, userStorageStub, origDbVersion;

        chai.Assertion.includeStack = true;

        beforeEach(function() {
            origDbVersion = cfg.dbVersion;
            appConfigStorageStub = sinon.createStubInstance(DeviceStorageDAO);
            userStorageStub = sinon.createStubInstance(DeviceStorageDAO);
            updateHandler = new UpdateHandler(appConfigStorageStub, userStorageStub);
        });

        afterEach(function() {
            cfg.dbVersion = origDbVersion;
        });

        describe('#constructor', function() {
            it('should create instance', function() {
                expect(updateHandler).to.exist;
                expect(updateHandler._appConfigStorage).to.equal(appConfigStorageStub);
                expect(updateHandler._userStorage).to.equal(userStorageStub);

                // the update handler must contain as many db update sripts as there are database versions
                expect(updateHandler._updateScripts.length).to.equal(cfg.dbVersion);
            });
        });

        describe('#update', function() {
            var versionDbType = 'dbVersion';

            it('should not update when up to date', function(done) {
                cfg.dbVersion = 10; // app requires database version 10
                appConfigStorageStub.listItems.withArgs(versionDbType).yieldsAsync(null, ['10']); // database version is 10

                updateHandler.update(function(error) {
                    expect(error).to.not.exist;
                    expect(appConfigStorageStub.listItems.calledOnce).to.be.true;

                    done();
                });
            });

            describe('dummy updates for v2 to v4', function() {
                var updateCounter;

                beforeEach(function() {
                    updateCounter = 0;
                    appConfigStorageStub.listItems.withArgs(versionDbType).yieldsAsync(null, ['2']); // database version is 0
                });

                afterEach(function() {
                    expect(appConfigStorageStub.listItems.calledOnce).to.be.true;
                });


                it('should work', function(done) {
                    cfg.dbVersion = 4; // app requires database version 4

                    // a simple dummy update to executed that only increments the update counter
                    function dummyUpdate(options, callback) {
                        updateCounter++;
                        callback();
                    }

                    // inject the dummy updates instead of live ones
                    updateHandler._updateScripts = [dummyUpdate, dummyUpdate, dummyUpdate, dummyUpdate];

                    // execute test
                    updateHandler.update(function(error) {
                        expect(error).to.not.exist;
                        expect(updateCounter).to.equal(2);

                        done();
                    });
                });

                it('should fail while updating to v3', function(done) {
                    cfg.dbVersion = 4; // app requires database version 4

                    function dummyUpdate(options, callback) {
                        updateCounter++;
                        callback();
                    }

                    function failingUpdate(options, callback) {
                        callback({});
                    }

                    // inject the dummy updates instead of live ones
                    updateHandler._updateScripts = [dummyUpdate, dummyUpdate, failingUpdate, dummyUpdate];

                    // execute test
                    updateHandler.update(function(error) {
                        expect(error).to.exist;
                        expect(updateCounter).to.equal(0);

                        done();
                    });
                });

            });

            describe('v0 -> v1', function() {
                var emailDbType = 'email_';

                beforeEach(function() {
                    cfg.dbVersion = 1; // app requires database version 1
                    appConfigStorageStub.listItems.withArgs(versionDbType).yieldsAsync(); // database version is 0
                });

                afterEach(function() {
                    // database version is only queried for version checking prior to the update script
                    // so no need to check this in case-specific tests
                    expect(appConfigStorageStub.listItems.calledOnce).to.be.true;
                });

                it('should work', function(done) {
                    userStorageStub.removeList.withArgs(emailDbType).yieldsAsync();
                    appConfigStorageStub.storeList.withArgs([1], versionDbType).yieldsAsync();

                    updateHandler.update(function(error) {
                        expect(error).to.not.exist;
                        expect(userStorageStub.removeList.calledOnce).to.be.true;
                        expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                        done();
                    });
                });

                it('should fail when persisting database version fails', function(done) {
                    userStorageStub.removeList.yieldsAsync();
                    appConfigStorageStub.storeList.yieldsAsync(new Error());

                    updateHandler.update(function(error) {
                        expect(error).to.exist;
                        expect(userStorageStub.removeList.calledOnce).to.be.true;
                        expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                        done();
                    });
                });

                it('should fail when wiping emails from database fails', function(done) {
                    userStorageStub.removeList.yieldsAsync(new Error());

                    updateHandler.update(function(error) {
                        expect(error).to.exist;
                        expect(userStorageStub.removeList.calledOnce).to.be.true;
                        expect(appConfigStorageStub.storeList.called).to.be.false;

                        done();
                    });
                });
            });

            describe('v1 -> v2', function() {
                var emailDbType = 'email_';

                beforeEach(function() {
                    cfg.dbVersion = 2; // app requires database version 2
                    appConfigStorageStub.listItems.withArgs(versionDbType).yieldsAsync(null, [1]); // database version is 0
                });

                afterEach(function() {
                    // database version is only queried for version checking prior to the update script
                    // so no need to check this in case-specific tests
                    expect(appConfigStorageStub.listItems.calledOnce).to.be.true;
                });

                it('should work', function(done) {
                    userStorageStub.removeList.withArgs(emailDbType).yieldsAsync();
                    appConfigStorageStub.storeList.withArgs([2], versionDbType).yieldsAsync();

                    updateHandler.update(function(error) {
                        expect(error).to.not.exist;
                        expect(userStorageStub.removeList.calledOnce).to.be.true;
                        expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                        done();
                    });
                });

                it('should fail when persisting database version fails', function(done) {
                    userStorageStub.removeList.yieldsAsync();
                    appConfigStorageStub.storeList.yieldsAsync(new Error());

                    updateHandler.update(function(error) {
                        expect(error).to.exist;
                        expect(userStorageStub.removeList.calledOnce).to.be.true;
                        expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                        done();
                    });
                });

                it('should fail when wiping emails from database fails', function(done) {
                    userStorageStub.removeList.yieldsAsync(new Error());

                    updateHandler.update(function(error) {
                        expect(error).to.exist;
                        expect(userStorageStub.removeList.calledOnce).to.be.true;
                        expect(appConfigStorageStub.storeList.called).to.be.false;

                        done();
                    });
                });
            });

            describe('v2 -> v3', function() {
                var emailDbType = 'email_';

                beforeEach(function() {
                    cfg.dbVersion = 3; // app requires database version 2
                    appConfigStorageStub.listItems.withArgs(versionDbType).yieldsAsync(null, [2]); // database version is 0
                });

                afterEach(function() {
                    // database version is only queried for version checking prior to the update script
                    // so no need to check this in case-specific tests
                    expect(appConfigStorageStub.listItems.calledOnce).to.be.true;
                });

                it('should work', function(done) {
                    userStorageStub.removeList.withArgs(emailDbType).yieldsAsync();
                    appConfigStorageStub.storeList.withArgs([3], versionDbType).yieldsAsync();

                    updateHandler.update(function(error) {
                        expect(error).to.not.exist;
                        expect(userStorageStub.removeList.calledOnce).to.be.true;
                        expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                        done();
                    });
                });

                it('should fail when persisting database version fails', function(done) {
                    userStorageStub.removeList.yieldsAsync();
                    appConfigStorageStub.storeList.yieldsAsync(new Error());

                    updateHandler.update(function(error) {
                        expect(error).to.exist;
                        expect(userStorageStub.removeList.calledOnce).to.be.true;
                        expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                        done();
                    });
                });

                it('should fail when wiping emails from database fails', function(done) {
                    userStorageStub.removeList.yieldsAsync(new Error());

                    updateHandler.update(function(error) {
                        expect(error).to.exist;
                        expect(userStorageStub.removeList.calledOnce).to.be.true;
                        expect(appConfigStorageStub.storeList.called).to.be.false;

                        done();
                    });
                });
            });
            describe('v3 -> v4', function() {
                var emailDbType = 'emailaddress',
                    providerDbType = 'provider';

                beforeEach(function() {
                    cfg.dbVersion = 4; // app requires database version 4
                    appConfigStorageStub.listItems.withArgs(versionDbType).yieldsAsync(null, [3]); // database version is 3
                });

                it('should add gmail as mail service provider with email address and no provider present in db', function(done) {
                    appConfigStorageStub.listItems.withArgs(emailDbType).yieldsAsync(null, ['bla@blubb.io']);
                    appConfigStorageStub.listItems.withArgs(providerDbType).yieldsAsync(null, []);
                    appConfigStorageStub.storeList.withArgs([4], versionDbType).yieldsAsync();
                    appConfigStorageStub.storeList.withArgs(['gmail'], providerDbType).yieldsAsync();

                    updateHandler.update(function(error) {
                        expect(error).to.not.exist;
                        expect(appConfigStorageStub.storeList.calledTwice).to.be.true;
                        expect(appConfigStorageStub.listItems.calledThrice).to.be.true;

                        done();
                    });
                });

                it('should not add a provider when no email adress is in db', function(done) {
                    appConfigStorageStub.listItems.withArgs(emailDbType).yieldsAsync(null, []);
                    appConfigStorageStub.listItems.withArgs(providerDbType).yieldsAsync(null, []);
                    appConfigStorageStub.storeList.withArgs([4], versionDbType).yieldsAsync();

                    updateHandler.update(function(error) {
                        expect(error).to.not.exist;
                        expect(appConfigStorageStub.storeList.calledOnce).to.be.true;
                        expect(appConfigStorageStub.listItems.calledThrice).to.be.true;

                        done();
                    });
                });

                it('should fail when appConfigStore write fails', function(done) {
                    appConfigStorageStub.listItems.yieldsAsync(null, []);
                    appConfigStorageStub.storeList.yieldsAsync(new Error());

                    updateHandler.update(function(error) {
                        expect(error).to.exist;
                        expect(appConfigStorageStub.listItems.calledThrice).to.be.true;
                        expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                        done();
                    });
                });

                it('should fail when appConfigStore read fails', function(done) {
                    appConfigStorageStub.listItems.withArgs(emailDbType).yieldsAsync(new Error());
                    appConfigStorageStub.storeList.yieldsAsync(new Error());

                    updateHandler.update(function(error) {
                        expect(error).to.exist;
                        expect(appConfigStorageStub.listItems.calledTwice).to.be.true;
                        expect(appConfigStorageStub.storeList.called).to.be.false;

                        done();
                    });
                });
            });
        });
    });
});