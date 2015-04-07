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
            appConfigStorageStub.listItems.withArgs(versionDbType).returns(resolves(['10'])); // database version is 10

            updateHandler.update().then(function() {
                expect(appConfigStorageStub.listItems.calledOnce).to.be.true;

                done();
            });
        });

        describe('dummy updates for v2 to v4', function() {
            var updateCounter;

            beforeEach(function() {
                updateCounter = 0;
                appConfigStorageStub.listItems.withArgs(versionDbType).returns(resolves(['2'])); // database version is 0
            });

            afterEach(function() {
                expect(appConfigStorageStub.listItems.calledOnce).to.be.true;
            });


            it('should work', function(done) {
                cfg.dbVersion = 4; // app requires database version 4

                // a simple dummy update to executed that only increments the update counter
                function dummyUpdate() {
                    updateCounter++;
                    return resolves();
                }

                // inject the dummy updates instead of live ones
                updateHandler._updateScripts = [dummyUpdate, dummyUpdate, dummyUpdate, dummyUpdate];

                // execute test
                updateHandler.update().then(function() {
                    expect(updateCounter).to.equal(2);

                    done();
                });
            });

            it('should fail while updating to v3', function(done) {
                cfg.dbVersion = 4; // app requires database version 4

                function dummyUpdate() {
                    updateCounter++;
                    return resolves();
                }

                function failingUpdate() {
                    return rejects({});
                }

                // inject the dummy updates instead of live ones
                updateHandler._updateScripts = [dummyUpdate, dummyUpdate, failingUpdate, dummyUpdate];

                // execute test
                updateHandler.update().catch(function(error) {
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
                appConfigStorageStub.listItems.withArgs(versionDbType).returns(resolves()); // database version is 0
            });

            afterEach(function() {
                // database version is only queried for version checking prior to the update script
                // so no need to check this in case-specific tests
                expect(appConfigStorageStub.listItems.calledOnce).to.be.true;
            });

            it('should work', function(done) {
                userStorageStub.removeList.withArgs(emailDbType).returns(resolves());
                appConfigStorageStub.storeList.withArgs([1], versionDbType).returns(resolves());

                updateHandler.update().then(function() {
                    expect(userStorageStub.removeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when persisting database version fails', function(done) {
                userStorageStub.removeList.returns(resolves());
                appConfigStorageStub.storeList.returns(rejects(new Error()));

                updateHandler.update().catch(function(error) {
                    expect(error).to.exist;
                    expect(userStorageStub.removeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when wiping emails from database fails', function(done) {
                userStorageStub.removeList.returns(rejects(new Error()));

                updateHandler.update().catch(function(error) {
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
                appConfigStorageStub.listItems.withArgs(versionDbType).returns(resolves([1])); // database version is 0
            });

            afterEach(function() {
                // database version is only queried for version checking prior to the update script
                // so no need to check this in case-specific tests
                expect(appConfigStorageStub.listItems.calledOnce).to.be.true;
            });

            it('should work', function(done) {
                userStorageStub.removeList.withArgs(emailDbType).returns(resolves());
                appConfigStorageStub.storeList.withArgs([2], versionDbType).returns(resolves());

                updateHandler.update().then(function() {
                    expect(userStorageStub.removeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when persisting database version fails', function(done) {
                userStorageStub.removeList.returns(resolves());
                appConfigStorageStub.storeList.returns(rejects(new Error()));

                updateHandler.update().catch(function(error) {
                    expect(error).to.exist;
                    expect(userStorageStub.removeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when wiping emails from database fails', function(done) {
                userStorageStub.removeList.returns(rejects(new Error()));

                updateHandler.update().catch(function(error) {
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
                appConfigStorageStub.listItems.withArgs(versionDbType).returns(resolves([2])); // database version is 0
            });

            afterEach(function() {
                // database version is only queried for version checking prior to the update script
                // so no need to check this in case-specific tests
                expect(appConfigStorageStub.listItems.calledOnce).to.be.true;
            });

            it('should work', function(done) {
                userStorageStub.removeList.withArgs(emailDbType).returns(resolves());
                appConfigStorageStub.storeList.withArgs([3], versionDbType).returns(resolves());

                updateHandler.update().then(function() {
                    expect(userStorageStub.removeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when persisting database version fails', function(done) {
                userStorageStub.removeList.returns(resolves());
                appConfigStorageStub.storeList.returns(rejects(new Error()));

                updateHandler.update().catch(function(error) {
                    expect(error).to.exist;
                    expect(userStorageStub.removeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when wiping emails from database fails', function(done) {
                userStorageStub.removeList.returns(rejects(new Error()));

                updateHandler.update().catch(function(error) {
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
                appConfigStorageStub.listItems.withArgs(versionDbType).returns(resolves([3])); // database version is 3
            });

            it('should add gmail as mail service provider with email address and no provider present in db', function(done) {
                appConfigStorageStub.listItems.withArgs(EMAIL_ADDR_DB_KEY).returns(resolves([emailaddress]));
                appConfigStorageStub.listItems.withArgs(PROVIDER_DB_KEY).returns(resolves([]));
                appConfigStorageStub.storeList.withArgs([4], versionDbType).returns(resolves());
                appConfigStorageStub.storeList.withArgs(['gmail'], PROVIDER_DB_KEY).returns(resolves());
                appConfigStorageStub.storeList.withArgs([emailaddress], USERNAME_DB_KEY).returns(resolves());
                appConfigStorageStub.storeList.withArgs([imap], IMAP_DB_KEY).returns(resolves());
                appConfigStorageStub.storeList.withArgs([smtp], SMTP_DB_KEY).returns(resolves());
                appConfigStorageStub.storeList.withArgs([''], REALNAME_DB_KEY).returns(resolves());
                authStub._loadCredentials.returns(resolves());

                updateHandler.update().then(function() {
                    expect(appConfigStorageStub.storeList.callCount).to.equal(6);
                    expect(appConfigStorageStub.listItems.calledThrice).to.be.true;
                    expect(authStub._loadCredentials.calledOnce).to.be.true;

                    done();
                });
            });

            it('should not add a provider when no email adress is in db', function(done) {
                appConfigStorageStub.listItems.withArgs(EMAIL_ADDR_DB_KEY).returns(resolves([]));
                appConfigStorageStub.listItems.withArgs(PROVIDER_DB_KEY).returns(resolves([]));
                appConfigStorageStub.storeList.withArgs([4], versionDbType).returns(resolves());

                updateHandler.update().then(function() {
                    expect(appConfigStorageStub.storeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.listItems.calledThrice).to.be.true;

                    done();
                });
            });

            it('should fail when appConfigStore write fails', function(done) {
                appConfigStorageStub.listItems.returns(resolves([]));
                appConfigStorageStub.storeList.returns(rejects(new Error()));

                updateHandler.update().catch(function(error) {
                    expect(error).to.exist;
                    expect(appConfigStorageStub.listItems.calledThrice).to.be.true;
                    expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when appConfigStore read fails', function(done) {
                appConfigStorageStub.listItems.withArgs(EMAIL_ADDR_DB_KEY).returns(rejects(new Error()));
                appConfigStorageStub.storeList.returns(rejects(new Error()));

                updateHandler.update().catch(function(error) {
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
                appConfigStorageStub.listItems.withArgs(VERSION_DB_TYPE).returns(resolves([4])); // database version is 4
            });

            afterEach(function() {
                // database version is only queried for version checking prior to the update script
                // so no need to check this in case-specific tests
                expect(appConfigStorageStub.listItems.calledOnce).to.be.true;
            });

            it('should work', function(done) {
                userStorageStub.listItems.withArgs(FOLDER_DB_TYPE).returns(resolves([
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
                ]));

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
                ], FOLDER_DB_TYPE).returns(resolves());

                appConfigStorageStub.storeList.withArgs([POST_UPDATE_DB_VERSION], VERSION_DB_TYPE).returns(resolves());

                updateHandler.update().then(function() {
                    expect(userStorageStub.listItems.calledOnce).to.be.true;
                    expect(userStorageStub.storeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when persisting database version fails', function(done) {
                userStorageStub.listItems.returns(resolves([]));
                userStorageStub.storeList.returns(resolves());
                appConfigStorageStub.storeList.returns(rejects(new Error()));

                updateHandler.update().catch(function(error) {
                    expect(error).to.exist;
                    expect(userStorageStub.listItems.calledOnce).to.be.true;
                    expect(userStorageStub.storeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when persisting folders fails', function(done) {
                userStorageStub.listItems.returns(resolves([]));
                userStorageStub.storeList.returns(rejects(new Error()));

                updateHandler.update().catch(function(error) {
                    expect(error).to.exist;
                    expect(userStorageStub.listItems.calledOnce).to.be.true;
                    expect(userStorageStub.storeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.storeList.called).to.be.false;

                    done();
                });
            });

            it('should fail when listing folders fails', function(done) {
                userStorageStub.listItems.returns(rejects(new Error()));

                updateHandler.update().catch(function(error) {
                    expect(error).to.exist;
                    expect(userStorageStub.listItems.calledOnce).to.be.true;
                    expect(userStorageStub.storeList.called).to.be.false;
                    expect(appConfigStorageStub.storeList.called).to.be.false;

                    done();
                });
            });
        });

        describe('v5 -> v6', function() {
            var emailDbType = 'email_';

            beforeEach(function() {
                cfg.dbVersion = 6; // app requires database version 6
                appConfigStorageStub.listItems.withArgs(versionDbType).returns(resolves([5])); // database version is 5
            });

            afterEach(function() {
                // database version is only queried for version checking prior to the update script
                // so no need to check this in case-specific tests
                expect(appConfigStorageStub.listItems.calledOnce).to.be.true;
            });

            it('should work', function(done) {
                userStorageStub.removeList.withArgs(emailDbType).returns(resolves());
                appConfigStorageStub.storeList.withArgs([6], versionDbType).returns(resolves());

                updateHandler.update().then(function() {
                    expect(userStorageStub.removeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when persisting database version fails', function(done) {
                userStorageStub.removeList.returns(resolves());
                appConfigStorageStub.storeList.returns(rejects(new Error()));

                updateHandler.update().catch(function(error) {
                    expect(error).to.exist;
                    expect(userStorageStub.removeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.storeList.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when wiping emails from database fails', function(done) {
                userStorageStub.removeList.returns(rejects(new Error()));

                updateHandler.update().catch(function(error) {
                    expect(error).to.exist;
                    expect(userStorageStub.removeList.calledOnce).to.be.true;
                    expect(appConfigStorageStub.storeList.called).to.be.false;

                    done();
                });
            });
        });

    });
});