define(function(require) {
    'use strict';

    var EmailSync = require('js/dao/email-sync'),
        KeychainDAO = require('js/dao/keychain-dao'),
        mailreader = require('mailreader'),
        ImapClient = require('imap-client'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        expect = chai.expect;

    chai.Assertion.includeStack = true;

    describe('Email Sync unit tests', function() {
        var emailSync, keychainStub, imapClientStub, devicestorageStub;

        var emailAddress, mockkeyId, dummyEncryptedMail,
            dummyDecryptedMail, mockKeyPair, account, verificationMail, verificationUuid, corruptedVerificationUuid,
            nonWhitelistedMail;

        beforeEach(function(done) {
            emailAddress = 'asdf@asdf.com';
            mockkeyId = 1234;
            dummyEncryptedMail = {
                uid: 1234,
                from: [{
                    address: 'asd@asd.de'
                }],
                to: [{
                    address: 'qwe@qwe.de'
                }],
                subject: 'qweasd',
                bodyParts: [{
                    type: 'encrypted'
                }],
                unread: false,
                answered: false
            };
            verificationUuid = '9A858952-17EE-4273-9E74-D309EAFDFAFB';
            verificationMail = {
                from: [{
                    name: 'Whiteout Test',
                    address: 'whiteout.test@t-online.de'
                }], // sender address
                to: [{
                    address: 'safewithme.testuser@gmail.com'
                }], // list of receivers
                subject: "[whiteout] New public key uploaded", // Subject line
                bodyParts: [{
                    type: 'text'
                }],
                unread: false,
                answered: false
            };
            corruptedVerificationUuid = 'OMFG_FUCKING_BASTARD_UUID_FROM_HELL!';
            dummyDecryptedMail = {
                uid: 1234,
                from: [{
                    address: 'asd@asd.de'
                }],
                to: [{
                    address: 'qwe@qwe.de'
                }],
                subject: 'qweasd',
                bodyParts: [{
                    type: 'text'
                }],
                unread: false,
                answered: false,
            };
            nonWhitelistedMail = {
                uid: 1234,
                from: [{
                    address: 'asd@asd.de'
                }],
                to: [{
                    address: 'qwe@qwe.de'
                }],
                subject: 'qweasd',
                bodyParts: [{
                    type: 'text'
                }],
            };
            mockKeyPair = {
                publicKey: {
                    _id: mockkeyId,
                    userId: emailAddress,
                    publicKey: 'publicpublicpublicpublic'
                },
                privateKey: {
                    _id: mockkeyId,
                    userId: emailAddress,
                    encryptedKey: 'privateprivateprivateprivate'
                }
            };
            account = {
                emailAddress: emailAddress,
                busy: false
            };

            keychainStub = sinon.createStubInstance(KeychainDAO);
            imapClientStub = sinon.createStubInstance(ImapClient);
            devicestorageStub = sinon.createStubInstance(DeviceStorageDAO);

            emailSync = new EmailSync(keychainStub, devicestorageStub, mailreader);

            expect(emailSync._keychain).to.equal(keychainStub);
            expect(emailSync._devicestorage).to.equal(devicestorageStub);
            expect(emailSync._mailreader).to.equal(mailreader);

            // init
            emailSync.init({
                account: account
            }, function(err) {
                expect(err).to.not.exist;
                expect(emailSync._account).to.equal(account);

                // connect
                expect(emailSync._imapClient).to.not.exist;
                expect(emailSync._smtpClient).to.not.exist;
                expect(emailSync._account.online).to.be.undefined;
                emailSync._account.folders = [];
                imapClientStub.login.yields();

                // this is set in the emailDao.onConnect
                emailSync._account.online = true;

                emailSync.onConnect({
                    imapClient: imapClientStub
                }, function(err) {
                    expect(err).to.not.exist;
                    expect(emailSync._account.online).to.be.true;
                    expect(emailSync._imapClient).to.equal(emailSync._imapClient);
                    expect(emailSync._smtpClient).to.equal(emailSync._smtpClient);
                    done();
                });
            });
        });

        afterEach(function(done) {
            // this is set in the emailDao.onDisconnect
            emailSync._account.online = false;

            emailSync.onDisconnect(null, function(err) {
                expect(err).to.not.exist;
                expect(emailSync._account.online).to.be.false;
                expect(emailSync._imapClient).to.not.exist;
                done();
            });
        });


        describe('_imapSearch', function() {
            var path = 'FOLDAAAA';

            it('should fail when disconnected', function(done) {
                // this is set in the emailDao.onDisconnect
                emailSync._account.online = false;

                emailSync._imapSearch({}, function(err) {
                    expect(err.code).to.equal(42);
                    done();
                });
            });

            it('should list all uids', function(done) {
                imapClientStub.search.withArgs({
                    folder: path,
                    path: path
                }).yields();

                emailSync._imapSearch({
                    folder: path
                }, done);
            });

            it('should list answered uids', function(done) {
                imapClientStub.search.withArgs({
                    folder: path,
                    path: path,
                    answered: true
                }).yields();

                emailSync._imapSearch({
                    folder: path,
                    answered: true
                }, done);
            });

            it('should list unread uids', function(done) {
                imapClientStub.search.withArgs({
                    folder: path,
                    path: path,
                    unread: true
                }).yields();

                emailSync._imapSearch({
                    folder: path,
                    unread: true
                }, done);
            });
        });

        describe('_imapDeleteMessage', function() {
            var path = 'FOLDAAAA',
                uid = 1337;

            it('should fail when disconnected', function(done) {
                // this is set in the emailDao.onDisconnect
                emailSync._account.online = false;

                emailSync._imapDeleteMessage({}, function(err) {
                    expect(err.code).to.equal(42);
                    done();
                });
            });

            it('should work', function(done) {
                imapClientStub.deleteMessage.withArgs({
                    path: path,
                    folder: path,
                    uid: uid
                }).yields();

                emailSync._imapDeleteMessage({
                    folder: path,
                    uid: uid
                }, done);
            });
        });

        describe('_imapListMessages', function() {
            var path = 'FOLDAAAA',
                firstUid = 1337,
                lastUid = 1339;


            it('should work', function(done) {
                imapClientStub.listMessages.withArgs({
                    path: path,
                    folder: path,
                    firstUid: firstUid,
                    lastUid: lastUid
                }).yields(null, []);

                emailSync._imapListMessages({
                    folder: path,
                    firstUid: firstUid,
                    lastUid: lastUid
                }, function(err, msgs) {
                    expect(err).to.not.exist;
                    expect(msgs).to.exist;

                    expect(imapClientStub.listMessages.calledOnce).to.be.true;

                    done();
                });
            });

            it('should not work when listMessages fails', function(done) {
                imapClientStub.listMessages.yields({});

                emailSync._imapListMessages({
                    folder: path,
                    firstUid: firstUid,
                    lastUid: lastUid
                }, function(err, msgs) {
                    expect(err).to.exist;
                    expect(msgs).to.not.exist;

                    expect(imapClientStub.listMessages.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when disconnected', function(done) {
                // this is set in the emailDao.onDisconnect
                emailSync._account.online = false;

                emailSync._imapListMessages({}, function(err) {
                    expect(err.code).to.equal(42);
                    done();
                });
            });
        });

        describe('_getBodyParts', function() {
            var path = 'FOLDAAAA',
                parseStub;

            it('should work', function(done) {
                var o = {
                    folder: path,
                    uid: 123,
                    bodyParts: []
                };

                imapClientStub.getBodyParts.withArgs(o).yields(null, {});
                parseStub = sinon.stub(mailreader, 'parse').withArgs(o).yields(null, []);

                emailSync._getBodyParts(o, function(err, parts) {
                    expect(err).to.not.exist;
                    expect(parts).to.exist;

                    expect(imapClientStub.getBodyParts.calledOnce).to.be.true;
                    expect(parseStub.calledOnce).to.be.true;

                    mailreader.parse.restore();
                    done();
                });
            });

            it('should not work when getBody fails', function(done) {
                var o = {
                    folder: path,
                    uid: 123,
                    bodyParts: []
                };

                imapClientStub.getBodyParts.yields({});
                parseStub = sinon.spy(mailreader, 'parse');

                emailSync._getBodyParts(o, function(err, msg) {
                    expect(err).to.exist;
                    expect(msg).to.not.exist;

                    expect(imapClientStub.getBodyParts.calledOnce).to.be.true;
                    expect(parseStub.called).to.be.false;

                    mailreader.parse.restore();
                    done();
                });
            });

            it('should fail when disconnected', function(done) {
                // this is set in the emailDao.onDisconnect
                emailSync._account.online = false;

                emailSync._getBodyParts({}, function(err) {
                    expect(err.code).to.equal(42);
                    done();
                });
            });
        });

        describe('_localListMessages', function() {
            it('should work without uid', function(done) {
                var folder = 'FOLDAAAA';
                devicestorageStub.listItems.withArgs('email_' + folder, 0, null).yields();

                emailSync._localListMessages({
                    folder: folder
                }, done);
            });

            it('should work with uid', function(done) {
                var folder = 'FOLDAAAA',
                    uid = 123;
                devicestorageStub.listItems.withArgs('email_' + folder + '_' + uid, 0, null).yields();

                emailSync._localListMessages({
                    folder: folder,
                    uid: uid
                }, done);
            });
        });

        describe('_localStoreMessages', function() {
            it('should work', function(done) {
                var folder = 'FOLDAAAA',
                    emails = [{}];
                devicestorageStub.storeList.withArgs(emails, 'email_' + folder).yields();

                emailSync._localStoreMessages({
                    folder: folder,
                    emails: emails
                }, done);
            });
        });

        describe('_localDeleteMessage', function() {
            it('should work', function(done) {
                var folder = 'FOLDAAAA',
                    uid = 1337;
                devicestorageStub.removeList.withArgs('email_' + folder + '_' + uid).yields();

                emailSync._localDeleteMessage({
                    folder: folder,
                    uid: uid
                }, done);
            });

            it('should fail when uid is missing', function(done) {
                var folder = 'FOLDAAAA';

                emailSync._localDeleteMessage({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;
                    done();
                });
            });
        });


        describe('sync', function() {
            it('should initially fill from local', function(done) {
                var folder, localListStub, invocations, imapSearchStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder
                }];

                localListStub = sinon.stub(emailSync, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);
                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);

                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0].messages.length).to.equal(1);
                    expect(emailSync._account.folders[0].messages[0].uid).to.equal(dummyEncryptedMail.uid);
                    expect(emailSync._account.folders[0].messages[0].body).to.not.exist;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;

                    done();
                });
            });

            it('should not work when busy', function(done) {
                emailSync._account.busy = true;

                emailSync.sync({
                    folder: 'OOGA'
                }, function(err) {
                    expect(err).to.exist;
                    done();
                });
            });

            it('should not work without providing a folder', function(done) {
                emailSync.sync({}, function(err) {
                    expect(err).to.exist;
                    done();
                });
            });

            it('should not work when initial setup errors', function(done) {
                var folder, localListStub;

                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder
                }];

                localListStub = sinon.stub(emailSync, '_localListMessages').yields({});

                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(emailSync._account.busy).to.be.false;
                    expect(localListStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should be up to date', function(done) {
                var folder, localListStub, imapSearchStub, invocations;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                localListStub = sinon.stub(emailSync, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);
                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail.uid - 10, dummyEncryptedMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);


                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    done();
                });
            });

            it('should error while searching on imap', function(done) {
                var folder, localListStub, imapSearchStub, invocations;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, [dummyEncryptedMail]);
                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields({});

                emailSync.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should error while listing local messages', function(done) {
                var folder, localListStub;

                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                localListStub = sinon.stub(emailSync, '_localListMessages').yields({});

                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(emailSync._account.busy).to.be.false;
                    expect(localListStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should remove messages from the remote', function(done) {
                var invocations, folder, localListStub, imapSearchStub, localDeleteStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, [dummyEncryptedMail]);
                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);

                imapDeleteStub = sinon.stub(emailSync, '_imapDeleteMessage').yields();
                localDeleteStub = sinon.stub(emailSync, '_localDeleteMessage').yields();

                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(localDeleteStub.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should error while removing messages from local', function(done) {
                var invocations, folder, localListStub, imapSearchStub, localDeleteStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, [dummyEncryptedMail]);
                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapDeleteStub = sinon.stub(emailSync, '_imapDeleteMessage').yields();
                localDeleteStub = sinon.stub(emailSync, '_localDeleteMessage').yields({});

                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(localDeleteStub.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;
                    expect(imapSearchStub.called).to.be.false;
                    done();
                });
            });

            it('should error while removing messages from the remote', function(done) {
                var folder, localListStub, imapSearchStub, localDeleteStub, imapDeleteStub;

                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, [dummyEncryptedMail]);
                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapDeleteStub = sinon.stub(emailSync, '_imapDeleteMessage').yields({});
                localDeleteStub = sinon.stub(emailSync, '_localDeleteMessage');

                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;
                    expect(localDeleteStub.called).to.be.false;
                    expect(imapSearchStub.called).to.be.false;

                    done();
                });
            });

            it('should delete messages locally if not present on remote', function(done) {
                var invocations, folder, localListStub, imapSearchStub, localDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];


                localListStub = sinon.stub(emailSync, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);
                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);
                localDeleteStub = sinon.stub(emailSync, '_localDeleteMessage').withArgs({
                    folder: folder,
                    uid: dummyEncryptedMail.uid
                }).yields();

                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(localDeleteStub.calledOnce).to.be.true;
                    done();
                });

            });

            it('should error while deleting locally if not present on remote', function(done) {
                var invocations, folder, localListStub, imapSearchStub, localDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];


                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, [dummyEncryptedMail]);
                localDeleteStub = sinon.stub(emailSync, '_localDeleteMessage').yields({});
                imapSearchStub = sinon.stub(emailSync, '_imapSearch').withArgs({
                    folder: folder
                }).yields(null, []);


                emailSync.sync({
                    folder: folder
                }, function(err) {
                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0].messages).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledOnce).to.be.true;
                    expect(localDeleteStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should fetch messages downstream from the remote', function(done) {
                var invocations, folder, localListStub, imapSearchStub, localStoreStub, imapListMessagesStub, incomingMessagesCalled;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                delete dummyEncryptedMail.body;

                localListStub = sinon.stub(emailSync, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, []);

                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);

                imapListMessagesStub = sinon.stub(emailSync, '_imapListMessages');
                imapListMessagesStub.withArgs({
                    folder: folder,
                    firstUid: dummyEncryptedMail.uid,
                    lastUid: dummyEncryptedMail.uid
                }).yields(null, [dummyEncryptedMail]);

                localStoreStub = sinon.stub(emailSync, '_localStoreMessages');
                localStoreStub.withArgs({
                    folder: folder,
                    emails: [dummyEncryptedMail]
                }).yields();

                incomingMessagesCalled = false;
                emailSync.onIncomingMessage = function(msgs) {
                    incomingMessagesCalled = true;
                    expect(msgs).to.not.be.empty;
                };


                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0].messages.length).to.equal(1);
                    expect(emailSync._account.folders[0].messages[0].uid).to.equal(dummyEncryptedMail.uid);
                    expect(emailSync._account.folders[0].messages[0].body).to.not.exist;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    expect(incomingMessagesCalled).to.be.true;

                    done();
                });
            });

            it('should error while storing messages from the remote locally', function(done) {
                var invocations, folder, localListStub, imapSearchStub, localStoreStub, imapListMessagesStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                delete dummyEncryptedMail.body;

                localListStub = sinon.stub(emailSync, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, []);

                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapSearchStub.yields(null, [dummyEncryptedMail.uid]);

                imapListMessagesStub = sinon.stub(emailSync, '_imapListMessages');
                imapListMessagesStub.yields(null, [dummyEncryptedMail]);

                localStoreStub = sinon.stub(emailSync, '_localStoreMessages');
                localStoreStub.yields({});

                emailSync.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0].messages.length).to.equal(0);
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should verify an authentication mail', function(done) {
                var invocations, folder, localListStub, imapSearchStub, imapGetStub, imapListMessagesStub, imapDeleteStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, []);

                imapSearchStub = sinon.stub(emailSync, '_imapSearch');

                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [verificationMail.uid]);

                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);

                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);

                imapListMessagesStub = sinon.stub(emailSync, '_imapListMessages').yields(null, [verificationMail]);
                imapGetStub = sinon.stub(emailSync, '_getBodyParts').yields(null, [{
                    type: 'text',
                    content: 'yadda yadda bla blabla foo bar https://keys.whiteout.io/verify/' + verificationUuid,
                }]);
                keychainStub.verifyPublicKey.withArgs(verificationUuid).yields();
                localStoreStub = sinon.stub(emailSync, '_localStoreMessages');
                imapDeleteStub = sinon.stub(emailSync, '_imapDeleteMessage').withArgs({
                    folder: folder,
                    uid: verificationMail.uid
                }).yields();

                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(keychainStub.verifyPublicKey.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.false;

                    done();
                });
            });

            it('should not care abouta failed deletion of an authentication mail', function(done) {
                var invocations, folder, localListStub, localStoreStub, imapSearchStub, imapGetStub, imapListMessagesStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, []);

                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [verificationMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);
                imapListMessagesStub = sinon.stub(emailSync, '_imapListMessages').yields(null, [verificationMail]);
                imapGetStub = sinon.stub(emailSync, '_getBodyParts').yields(null, [{
                    type: 'text',
                    content: 'yadda yadda bla blabla foo bar https://keys.whiteout.io/verify/' + verificationUuid,
                }]);
                keychainStub.verifyPublicKey.withArgs(verificationUuid).yields();
                imapDeleteStub = sinon.stub(emailSync, '_imapDeleteMessage').yields({});

                localStoreStub = sinon.stub(emailSync, '_localStoreMessages');
                localStoreStub.withArgs({
                    folder: folder,
                    emails: [verificationMail]
                }).yields();

                emailSync.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.not.exist;
                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(localStoreStub.called).to.be.false;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(keychainStub.verifyPublicKey.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail during verifying authentication', function(done) {
                var invocations, folder, localListStub, imapSearchStub, localStoreStub, imapGetStub, imapListMessagesStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, []);

                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [verificationMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);
                imapListMessagesStub = sinon.stub(emailSync, '_imapListMessages').yields(null, [verificationMail]);
                imapGetStub = sinon.stub(emailSync, '_getBodyParts').yields(null, [{
                    type: 'text',
                    content: 'yadda yadda bla blabla foo bar https://keys.whiteout.io/verify/' + verificationUuid,
                }]);
                keychainStub.verifyPublicKey.withArgs(verificationUuid).yields({
                    errMsg: 'fubar'
                });
                imapDeleteStub = sinon.stub(emailSync, '_imapDeleteMessage').yields({});

                localStoreStub = sinon.stub(emailSync, '_localStoreMessages');
                localStoreStub.withArgs({
                    folder: folder,
                    emails: [verificationMail]
                }).yields();

                emailSync.onIncomingMessage = function() {};

                emailSync.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    if (invocations === 1) {
                        expect(err).to.exist;
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.not.exist;
                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0].messages).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(keychainStub.verifyPublicKey.calledOnce).to.be.true;
                    expect(imapDeleteStub.called).to.be.false;

                    done();
                });
            });

            it('should not bother about corrupted authentication mails', function(done) {
                var invocations, folder, localListStub, imapSearchStub, imapGetStub, imapListMessagesStub, imapDeleteStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, []);

                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [verificationMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);

                localStoreStub = sinon.stub(emailSync, '_localStoreMessages').withArgs({
                    folder: folder,
                    emails: [verificationMail]
                }).yields();


                imapListMessagesStub = sinon.stub(emailSync, '_imapListMessages').yields(null, [verificationMail]);
                imapGetStub = sinon.stub(emailSync, '_getBodyParts').yields(null, [{
                    type: 'text',
                    content: 'yadda yadda bla blabla foo bar https://keys.whiteout.io/verify/' + corruptedVerificationUuid,
                }]);
                keychainStub.verifyPublicKey.withArgs(corruptedVerificationUuid).yields({
                    errMsg: 'fubar'
                });
                imapDeleteStub = sinon.stub(emailSync, '_imapDeleteMessage').yields({});

                emailSync.onIncomingMessage = function() {};

                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0].messages).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    expect(keychainStub.verifyPublicKey.called).to.be.false;
                    expect(imapDeleteStub.called).to.be.false;


                    done();
                });
            });

            it('should sync tags from memory to imap and storage', function(done) {
                var folder, localListStub, imapSearchStub, invocations,
                    markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                var inImap = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inImap.unread = true;

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [inImap.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, [inImap.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);
                markStub = sinon.stub(emailSync, '_imapMark').withArgs({
                    folder: folder,
                    uid: dummyDecryptedMail.uid,
                    unread: dummyDecryptedMail.unread,
                    answered: dummyDecryptedMail.answered
                }).yields();
                localStoreStub = sinon.stub(emailSync, '_localStoreMessages').withArgs({
                    folder: folder,
                    emails: [inStorage]
                }).yields();

                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(markStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;

                    expect(inStorage.unread).to.equal(dummyDecryptedMail.unread);
                    expect(inStorage.answered).to.equal(dummyDecryptedMail.answered);

                    done();
                });
            });

            it('should error while syncing unread tags from memory to storage', function(done) {
                var folder, localListStub, imapSearchStub, invocations, markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                var inImap = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inImap.unread = true;

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                markStub = sinon.stub(emailSync, '_imapMark').yields();
                localStoreStub = sinon.stub(emailSync, '_localStoreMessages').yields({});

                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(markStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    expect(imapSearchStub.called).to.be.false;
                    done();
                });
            });

            it('should error while syncing answered tags from memory to storage', function(done) {
                var folder, localListStub, imapSearchStub, invocations, markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                var inImap = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inImap.unread = true;

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                markStub = sinon.stub(emailSync, '_imapMark').yields();
                localStoreStub = sinon.stub(emailSync, '_localStoreMessages').yields({});

                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(markStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    expect(imapSearchStub.called).to.be.false;
                    done();
                });
            });

            it('should error while syncing tags from memory to imap', function(done) {
                var folder, localListStub, imapSearchStub, invocations,
                    markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                var inImap = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inImap.unread = true;

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                markStub = sinon.stub(emailSync, '_imapMark').yields({});
                localStoreStub = sinon.stub(emailSync, '_localStoreMessages');

                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(markStub.calledOnce).to.be.true;
                    expect(localStoreStub.called).to.be.false;
                    expect(imapSearchStub.called).to.be.false;
                    done();
                });
            });

            it('should sync tags from imap to memory and storage', function(done) {
                var folder, localListStub, imapSearchStub, invocations,
                    markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inStorage.unread = true;

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);
                markStub = sinon.stub(emailSync, '_imapMark');
                localStoreStub = sinon.stub(emailSync, '_localStoreMessages').yields();

                emailSync.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledTwice).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(markStub.called).to.be.false;
                    expect(localStoreStub.calledOnce).to.be.true;

                    expect(dummyDecryptedMail.unread).to.equal(false);
                    expect(inStorage.unread).to.equal(false);

                    done();
                });
            });

            it('should error while searching for unread tags on imap', function(done) {
                var folder, localListStub, imapSearchStub, invocations, markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inStorage.unread = true;

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields({});
                markStub = sinon.stub(emailSync, '_imapMark');
                localStoreStub = sinon.stub(emailSync, '_localStoreMessages');

                emailSync.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(markStub.called).to.be.false;
                    expect(imapSearchStub.calledTwice).to.be.true;
                    expect(localStoreStub.called).to.be.false;

                    expect(inStorage.unread).to.equal(true);
                    expect(dummyDecryptedMail.unread).to.equal(true); // the live object has not been touched!

                    done();
                });
            });

            it('should error while searching for answered tags on imap', function(done) {
                var folder, localListStub, imapSearchStub, invocations, markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inStorage.unread = true;

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields({});
                markStub = sinon.stub(emailSync, '_imapMark');
                localStoreStub = sinon.stub(emailSync, '_localStoreMessages');

                emailSync.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(markStub.called).to.be.false;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(localStoreStub.called).to.be.false;

                    expect(inStorage.unread).to.equal(true);
                    expect(dummyDecryptedMail.unread).to.equal(true); // the live object has not been touched!

                    done();
                });
            });

            it('should error while syncing tags from imap to storage', function(done) {
                var folder, localListStub, imapSearchStub, invocations,
                    markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inStorage.unread = true;

                localListStub = sinon.stub(emailSync, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(emailSync, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);
                markStub = sinon.stub(emailSync, '_imapMark');
                localStoreStub = sinon.stub(emailSync, '_localStoreMessages').yields({});

                emailSync.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(emailSync._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(emailSync._account.busy).to.be.false;
                    expect(emailSync._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledTwice).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(markStub.called).to.be.false;
                    expect(localStoreStub.calledOnce).to.be.true;

                    done();
                });
            });
        });


        describe('syncOutbox', function() {
            it('should sync the outbox', function(done) {
                var folder = 'FOLDAAAA';
                emailSync._account.folders = [{
                    type: 'Folder',
                    path: folder
                }];

                var localListStub = sinon.stub(emailSync, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);

                emailSync.syncOutbox({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(emailSync._account.folders[0].messages.length).to.equal(1);

                    done();
                });
            });
        });


        describe('mark', function() {
            it('should work', function(done) {
                var o = {
                    folder: 'asdf',
                    uid: 1,
                    unread: false,
                    answered: false
                };

                imapClientStub.updateFlags.withArgs(o).yields();

                emailSync._imapMark(o, function(err) {
                    expect(imapClientStub.updateFlags.calledOnce).to.be.true;
                    expect(err).to.not.exist;
                    done();
                });
            });
        });


    });
});