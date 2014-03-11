define(function(require) {
    'use strict';

    var DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        cfg = require('js/app-config').config,
        UpdateHandler = require('js/util/update/update-handler'),
        expect = chai.expect;

    chai.Assertion.includeStack = true;

    describe('UpdateHandler', function() {
        var updateHandler, appConfigStorageStub, userStorageStub, origDbVersion;

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
                    appConfigStorageStub.storeList.yieldsAsync({});

                    updateHandler.update(function(error) {
                        expect(error).to.exist;
                        expect(userStorageStub.removeList.calledOnce).to.be.true;
                        expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                        done();
                    });
                });

                it('should fail when wiping emails from database fails', function(done) {
                    userStorageStub.removeList.yieldsAsync({});

                    updateHandler.update(function(error) {
                        expect(error).to.exist;
                        expect(userStorageStub.removeList.calledOnce).to.be.true;
                        expect(appConfigStorageStub.storeList.called).to.be.false;

                        done();
                    });
                });
            });
        });
    });
});