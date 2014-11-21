'use strict';

var DeviceStorageDAO = require('../../../src/js/service/devicestorage'),
    Auth = require('../../../src/js/service/auth'),
    cfg = require('../../../src/js/app-config').config,
    UpdateHandler = require('../../../src/js/util/update/update-handler'),
    Dialog = require('../../../src/js/util/dialog');

describe('UpdateHandler', function() {
    var updateHandler, appConfigStorageStub, authStub, userStorageStub, dialogStub, origDbVersion;

    chai.config.includeStack = true;

    beforeEach(function() {
        origDbVersion = cfg.dbVersion;
        appConfigStorageStub = sinon.createStubInstance(DeviceStorageDAO);
        userStorageStub = sinon.createStubInstance(DeviceStorageDAO);
        authStub = sinon.createStubInstance(Auth);
        dialogStub = sinon.createStubInstance(Dialog);
        updateHandler = new UpdateHandler(appConfigStorageStub, userStorageStub, authStub, dialogStub);
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
            var EMAIL_ADDR_DB_KEY = 'emailaddress';
            var USERNAME_DB_KEY = 'username';
            var PROVIDER_DB_KEY = 'provider';
            var IMAP_DB_KEY = 'imap';
            var SMTP_DB_KEY = 'smtp';
            var REALNAME_DB_KEY = 'realname';
            var emailaddress = 'bla@blubb.io';

            var imap = {
                    host: 'imap.gmail.com',
                    port: 993,
                    secure: true
                },
                smtp = {
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true
                };

            beforeEach(function() {
                cfg.dbVersion = 4; // app requires database version 4
                appConfigStorageStub.listItems.withArgs(versionDbType).yieldsAsync(null, [3]); // database version is 3
            });

            it('should add gmail as mail service provider with email address and no provider present in db', function(done) {
                appConfigStorageStub.listItems.withArgs(EMAIL_ADDR_DB_KEY).yieldsAsync(null, [emailaddress]);
                appConfigStorageStub.listItems.withArgs(PROVIDER_DB_KEY).yieldsAsync(null, []);
                appConfigStorageStub.storeList.withArgs([4], versionDbType).yieldsAsync();
                appConfigStorageStub.storeList.withArgs(['gmail'], PROVIDER_DB_KEY).yieldsAsync();
                appConfigStorageStub.storeList.withArgs([emailaddress], USERNAME_DB_KEY).yieldsAsync();
                appConfigStorageStub.storeList.withArgs([imap], IMAP_DB_KEY).yieldsAsync();
                appConfigStorageStub.storeList.withArgs([smtp], SMTP_DB_KEY).yieldsAsync();
                appConfigStorageStub.storeList.withArgs([''], REALNAME_DB_KEY).yieldsAsync();
                authStub._loadCredentials.yieldsAsync();

                updateHandler.update(function(error) {
                    expect(error).to.not.exist;
                    expect(appConfigStorageStub.storeList.callCount).to.equal(6);
                    expect(appConfigStorageStub.listItems.calledThrice).to.be.true;
                    expect(authStub._loadCredentials.calledOnce).to.be.true;

                    done();
                });
            });

            it('should not add a provider when no email adress is in db', function(done) {
                appConfigStorageStub.listItems.withArgs(EMAIL_ADDR_DB_KEY).yieldsAsync(null, []);
                appConfigStorageStub.listItems.withArgs(PROVIDER_DB_KEY).yieldsAsync(null, []);
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
                appConfigStorageStub.listItems.withArgs(EMAIL_ADDR_DB_KEY).yieldsAsync(new Error());
                appConfigStorageStub.storeList.yieldsAsync(new Error());

                updateHandler.update(function(error) {
                    expect(error).to.exist;
                    expect(appConfigStorageStub.listItems.calledTwice).to.be.true;
                    expect(appConfigStorageStub.storeList.called).to.be.false;

                    done();
                });
            });
        });

        describe('v4 -> v5', function() {
            var FOLDER_TYPE_INBOX = 'Inbox';
            var FOLDER_TYPE_SENT = 'Sent';
            var FOLDER_TYPE_DRAFTS = 'Drafts';
            var FOLDER_TYPE_TRASH = 'Trash';

            var FOLDER_DB_TYPE = 'folders';
            var VERSION_DB_TYPE = 'dbVersion';

            var POST_UPDATE_DB_VERSION = 5;

            beforeEach(function() {
                cfg.dbVersion = 5; // app requires database version 4
                appConfigStorageStub.listItems.withArgs(VERSION_DB_TYPE).yieldsAsync(null, [4]); // database version is 4
            });

            afterEach(function() {
                // database version is only queried for version checking prior to the update script
                // so no need to check this in case-specific tests
                expect(appConfigStorageStub.listItems.calledOnce).to.be.true;
            });

            it('should work', function(done) {
                userStorageStub.listItems.withArgs(FOLDER_DB_TYPE).yieldsAsync(null, [
                    [{
                        name: 'inbox1',
                        type: FOLDER_TYPE_INBOX
                    }, {
                        name: 'inbox2',
                        type: FOLDER_TYPE_INBOX
                    }, {
                        name: 'sent1',
                        type: FOLDER_TYPE_SENT
                    }, {
                        name: 'sent2',
                        type: FOLDER_TYPE_SENT
                    }, {
                        name: 'drafts1',
                        type: FOLDER_TYPE_DRAFTS
                    }, {
                        name: 'drafts2',
                        type: FOLDER_TYPE_DRAFTS
                    }, {
                        name: 'trash1',
                        type: FOLDER_TYPE_TRASH
                    }, {
                        name: 'trash2',
                        type: FOLDER_TYPE_TRASH
                    }]
                ]);

                userStorageStub.storeList.withArgs([
                    [{
                        name: 'inbox1',
                        type: FOLDER_TYPE_INBOX
                    }, {
                        name: 'sent1',
                        type: FOLDER_TYPE_SENT
                    }, {
                        name: 'drafts1',
                        type: FOLDER_TYPE_DRAFTS
                    }, {
                        name: 'trash1',
                        type: FOLDER_TYPE_TRASH
                    }]
                ], FOLDER_DB_TYPE).yieldsAsync();

                appConfigStorageStub.storeList.withArgs([POST_UPDATE_DB_VERSION], VERSION_DB_TYPE).yieldsAsync();

                updateHandler.update(function(error) {
                    expect(error).to.not.exist;
                    expect(userStorageStub.listItems.calledOnce).to.be.true;
                    expect(userStorageStub.storeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when persisting database version fails', function(done) {
                userStorageStub.listItems.yieldsAsync(null, []);
                userStorageStub.storeList.yieldsAsync();
                appConfigStorageStub.storeList.yieldsAsync(new Error());

                updateHandler.update(function(error) {
                    expect(error).to.exist;
                    expect(userStorageStub.listItems.calledOnce).to.be.true;
                    expect(userStorageStub.storeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when persisting folders fails', function(done) {
                userStorageStub.listItems.yieldsAsync(null, []);
                userStorageStub.storeList.yieldsAsync(new Error());

                updateHandler.update(function(error) {
                    expect(error).to.exist;
                    expect(userStorageStub.listItems.calledOnce).to.be.true;
                    expect(userStorageStub.storeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.storeList.called).to.be.false;

                    done();
                });
            });

            it('should fail when listing folders fails', function(done) {
                userStorageStub.listItems.yieldsAsync(new Error());

                updateHandler.update(function(error) {
                    expect(error).to.exist;
                    expect(userStorageStub.listItems.calledOnce).to.be.true;
                    expect(userStorageStub.storeList.called).to.be.false;
                    expect(appConfigStorageStub.storeList.called).to.be.false;

                    done();
                });
            });
        });
    });
});