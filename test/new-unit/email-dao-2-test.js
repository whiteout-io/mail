define(function(require) {
    'use strict';

    var EmailDAO = require('js/dao/email-dao-2'),
        KeychainDAO = require('js/dao/keychain-dao'),
        ImapClient = require('imap-client'),
        SmtpClient = require('smtp-client'),
        PGP = require('js/crypto/pgp'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        _ = require('underscore'),
        expect = chai.expect;


    describe('Email DAO 2 unit tests', function() {
        var dao, keychainStub, imapClientStub, smtpClientStub, pgpStub, devicestorageStub;

        var emailAddress, passphrase, asymKeySize, mockkeyId, dummyEncryptedMail,
            dummyDecryptedMail, mockKeyPair, account, publicKey;

        beforeEach(function() {
            emailAddress = 'asdf@asdf.com';
            passphrase = 'asdf';
            asymKeySize = 2048;
            mockkeyId = 1234;
            dummyEncryptedMail = {
                uid: 1234,
                from: [{
                    address: 'asd@asd.de'
                }],
                to: [{
                    address: 'qwe@qwe.de'
                }],
                subject: '[whiteout] qweasd',
                body: '-----BEGIN PGP MESSAGE-----\nasd\n-----END PGP MESSAGE-----'
            };
            dummyDecryptedMail = {
                uid: 1234,
                from: [{
                    address: 'asd@asd.de'
                }],
                to: [{
                    address: 'qwe@qwe.de'
                }],
                subject: '[whiteout] qweasd',
                body: 'asd'
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
                asymKeySize: asymKeySize,
            };
            publicKey = "-----BEGIN PUBLIC KEY-----\r\n" + "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCxy+Te5dyeWd7g0P+8LNO7fZDQ\r\n" + "g96xTb1J6pYE/pPTMlqhB6BRItIYjZ1US5q2vk5Zk/5KasBHAc9RbCqvh9v4XFEY\r\n" + "JVmTXC4p8ft1LYuNWIaDk+R3dyYXmRNct/JC4tks2+8fD3aOvpt0WNn3R75/FGBt\r\n" + "h4BgojAXDE+PRQtcVQIDAQAB\r\n" + "-----END PUBLIC KEY-----";

            keychainStub = sinon.createStubInstance(KeychainDAO);
            imapClientStub = sinon.createStubInstance(ImapClient);
            smtpClientStub = sinon.createStubInstance(SmtpClient);
            pgpStub = sinon.createStubInstance(PGP);
            devicestorageStub = sinon.createStubInstance(DeviceStorageDAO);

            dao = new EmailDAO(keychainStub, imapClientStub, smtpClientStub, pgpStub, devicestorageStub);
            dao._account = account;

            expect(dao._keychain).to.equal(keychainStub);
            expect(dao._imapClient).to.equal(imapClientStub);
            expect(dao._smtpClient).to.equal(smtpClientStub);
            expect(dao._crypto).to.equal(pgpStub);
            expect(dao._devicestorage).to.equal(devicestorageStub);
        });

        afterEach(function() {});

        describe('init', function() {
            beforeEach(function() {
                delete dao._account;
            });

            it('should init', function(done) {
                var loginStub, listFolderStub, folders;

                folders = [];

                // initKeychain
                devicestorageStub.init.withArgs(emailAddress).yields();
                keychainStub.getUserKeyPair.yields(null, mockKeyPair);

                // initFolders
                loginStub = sinon.stub(dao, '_imapLogin');
                listFolderStub = sinon.stub(dao, '_imapListFolders');
                loginStub.yields();
                listFolderStub.yields(null, folders);

                dao.init({
                    account: account
                }, function(err, keyPair) {
                    expect(err).to.not.exist;
                    expect(keyPair).to.equal(mockKeyPair);

                    expect(dao._account).to.equal(account);
                    expect(dao._account.folders).to.equal(folders);
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;

                    expect(loginStub.calledOnce).to.be.true;
                    expect(listFolderStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail due to error while listing folders', function(done) {
                var loginStub, listFolderStub;

                // initKeychain
                devicestorageStub.init.withArgs(emailAddress).yields();
                keychainStub.getUserKeyPair.yields(null, mockKeyPair);

                // initFolders
                loginStub = sinon.stub(dao, '_imapLogin');
                listFolderStub = sinon.stub(dao, '_imapListFolders');
                loginStub.yields();
                listFolderStub.yields({});

                dao.init({
                    account: account
                }, function(err, keyPair) {
                    expect(err).to.exist;
                    expect(keyPair).to.not.exist;

                    expect(dao._account).to.equal(account);
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;

                    expect(loginStub.calledOnce).to.be.true;
                    expect(listFolderStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail due to error during imap login', function(done) {
                var loginStub = sinon.stub(dao, '_imapLogin');

                // initKeychain
                devicestorageStub.init.withArgs(emailAddress).yields();
                keychainStub.getUserKeyPair.yields(null, mockKeyPair);

                // initFolders
                loginStub.yields({});

                dao.init({
                    account: account
                }, function(err, keyPair) {
                    expect(err).to.exist;
                    expect(keyPair).to.not.exist;

                    expect(dao._account).to.equal(account);
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;

                    expect(loginStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail due to error in getUserKeyPair', function(done) {
                devicestorageStub.init.yields();
                keychainStub.getUserKeyPair.yields({});

                dao.init({
                    account: account
                }, function(err, keyPair) {
                    expect(err).to.exist;
                    expect(keyPair).to.not.exist;

                    expect(devicestorageStub.init.calledOnce).to.be.true;

                    done();
                });
            });
        });

        describe('unlock', function() {
            it('should unlock', function(done) {
                var importMatcher = sinon.match(function(o) {
                    expect(o.passphrase).to.equal(passphrase);
                    expect(o.privateKeyArmored).to.equal(mockKeyPair.privateKey.encryptedKey);
                    expect(o.publicKeyArmored).to.equal(mockKeyPair.publicKey.publicKey);
                    return true;
                });

                pgpStub.importKeys.withArgs(importMatcher).yields();

                dao.unlock({
                    passphrase: passphrase,
                    keypair: mockKeyPair
                }, function(err) {
                    expect(err).to.not.exist;

                    expect(pgpStub.importKeys.calledOnce).to.be.true;

                    done();
                });
            });

            it('should generate a keypair and unlock', function(done) {
                var genKeysMatcher, persistKeysMatcher, importMatcher, keypair;

                keypair = {
                    keyId: 123,
                    publicKeyArmored: mockKeyPair.publicKey.publicKey,
                    privateKeyArmored: mockKeyPair.privateKey.encryptedKey
                };
                genKeysMatcher = sinon.match(function(o) {
                    expect(o.emailAddress).to.equal(emailAddress);
                    expect(o.keySize).to.equal(asymKeySize);
                    expect(o.passphrase).to.equal(passphrase);
                    return true;
                });
                importMatcher = sinon.match(function(o) {
                    expect(o.passphrase).to.equal(passphrase);
                    expect(o.privateKeyArmored).to.equal(mockKeyPair.privateKey.encryptedKey);
                    expect(o.publicKeyArmored).to.equal(mockKeyPair.publicKey.publicKey);
                    return true;
                });
                persistKeysMatcher = sinon.match(function(o) {
                    expect(o).to.deep.equal(mockKeyPair);
                    return true;
                });


                pgpStub.generateKeys.withArgs(genKeysMatcher).yields(null, keypair);
                pgpStub.importKeys.withArgs(importMatcher).yields();
                keychainStub.putUserKeyPair.withArgs().yields();

                dao.unlock({
                    passphrase: passphrase
                }, function(err) {
                    expect(err).to.not.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledOnce).to.be.true;
                    expect(keychainStub.putUserKeyPair.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when persisting fails', function(done) {
                var keypair = {
                    keyId: 123,
                    publicKeyArmored: 'qwerty',
                    privateKeyArmored: 'asdfgh'
                };
                pgpStub.generateKeys.yields(null, keypair);
                pgpStub.importKeys.withArgs().yields();
                keychainStub.putUserKeyPair.yields({});

                dao.unlock({
                    passphrase: passphrase
                }, function(err) {
                    expect(err).to.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledOnce).to.be.true;
                    expect(keychainStub.putUserKeyPair.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when import fails', function(done) {
                var keypair = {
                    keyId: 123,
                    publicKeyArmored: 'qwerty',
                    privateKeyArmored: 'asdfgh'
                };

                pgpStub.generateKeys.withArgs().yields(null, keypair);
                pgpStub.importKeys.withArgs().yields({});

                dao.unlock({
                    passphrase: passphrase
                }, function(err) {
                    expect(err).to.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when generation fails', function(done) {
                pgpStub.generateKeys.yields({});

                dao.unlock({
                    passphrase: passphrase
                }, function(err) {
                    expect(err).to.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;

                    done();
                });
            });
        });

        describe('_imapLogin', function() {
            it('should work', function(done) {
                imapClientStub.login.yields();

                dao._imapLogin(function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });

            it('should fail due to error in imap login', function(done) {
                imapClientStub.login.yields({});

                dao._imapLogin(function(err) {
                    expect(err).to.exist;
                    done();
                });
            });
        });

        describe('_imapLogout', function() {
            it('should work', function(done) {
                imapClientStub.logout.yields();

                dao._imapLogout(function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });

            it('should fail due to error in imap login', function(done) {
                imapClientStub.logout.yields({});

                dao._imapLogout(function(err) {
                    expect(err).to.exist;
                    done();
                });
            });
        });

        describe('_imapListFolders', function() {
            var dummyFolders = [{
                type: 'Inbox',
                path: 'INBOX'
            }, {
                type: 'Outbox',
                path: 'OUTBOX'
            }];

            it('should list from storage', function(done) {
                devicestorageStub.listItems.withArgs('folders').yields(null, [dummyFolders]);

                dao._imapListFolders(function(err, folders) {
                    expect(err).to.not.exist;
                    expect(devicestorageStub.listItems.calledOnce).to.be.true;
                    expect(folders[0].type).to.equal('Inbox');
                    done();
                });
            });

            it('should not list from storage due to error', function(done) {
                devicestorageStub.listItems.yields({});

                dao._imapListFolders(function(err, folders) {
                    expect(err).to.exist;
                    expect(folders).to.not.exist;
                    expect(devicestorageStub.listItems.calledOnce).to.be.true;
                    expect(imapClientStub.listWellKnownFolders.called).to.be.false;
                    done();
                });
            });

            it('should list from imap', function(done) {
                devicestorageStub.listItems.yields(null, []);
                imapClientStub.listWellKnownFolders.yields(null, {
                    inbox: dummyFolders[0]
                });
                devicestorageStub.storeList.yields();

                dao._imapListFolders(function(err, folders) {
                    expect(err).to.not.exist;
                    expect(devicestorageStub.listItems.calledOnce).to.be.true;
                    expect(imapClientStub.listWellKnownFolders.calledOnce).to.be.true;
                    expect(devicestorageStub.storeList.calledOnce).to.be.true;
                    expect(folders[0].type).to.equal('Inbox');
                    done();
                });
            });

            it('should not list from imap due to store error', function(done) {
                devicestorageStub.listItems.yields(null, []);
                imapClientStub.listWellKnownFolders.yields(null, {
                    inbox: dummyFolders[0]
                });
                devicestorageStub.storeList.yields({});

                dao._imapListFolders(function(err, folders) {
                    expect(err).to.exist;
                    expect(folders).to.not.exist;
                    expect(devicestorageStub.listItems.calledOnce).to.be.true;
                    expect(imapClientStub.listWellKnownFolders.calledOnce).to.be.true;
                    expect(devicestorageStub.storeList.calledOnce).to.be.true;
                    done();
                });
            });

            it('should not list from imap due to imap error', function(done) {
                devicestorageStub.listItems.yields(null, []);
                imapClientStub.listWellKnownFolders.yields({});

                dao._imapListFolders(function(err, folders) {
                    expect(err).to.exist;
                    expect(folders).to.not.exist;
                    expect(devicestorageStub.listItems.calledOnce).to.be.true;
                    expect(imapClientStub.listWellKnownFolders.calledOnce).to.be.true;
                    expect(devicestorageStub.storeList.called).to.be.false;
                    done();
                });
            });
        });

        describe('_imapListMessages', function() {
            it('should work', function(done) {
                var path = 'FOLDAAAA';

                imapClientStub.listMessages.withArgs({
                    path: path,
                    offset: 0,
                    length: 100
                }).yields();

                dao._imapListMessages({
                    folder: path
                }, done);
            });
        });

        describe('_imapDeleteMessage', function() {
            it('should work', function(done) {
                var path = 'FOLDAAAA',
                    uid = 1337;

                imapClientStub.deleteMessage.withArgs({
                    path: path,
                    uid: uid
                }).yields();

                dao._imapDeleteMessage({
                    folder: path,
                    uid: uid
                }, done);
            });
        });

        describe('_imapGetMessage', function() {
            it('should work', function(done) {
                var path = 'FOLDAAAA',
                    uid = 1337;

                imapClientStub.getMessagePreview.withArgs({
                    path: path,
                    uid: uid
                }).yields();

                dao._imapGetMessage({
                    folder: path,
                    uid: uid
                }, done);
            });
        });

        describe('_localListMessages', function() {
            it('should work', function(done) {
                var folder = 'FOLDAAAA';
                devicestorageStub.listItems.withArgs('email_' + folder, 0, null).yields();

                dao._localListMessages({
                    folder: folder
                }, done);
            });
        });

        describe('_localStoreMessages', function() {
            it('should work', function(done) {
                var folder = 'FOLDAAAA',
                    emails = [{}];
                devicestorageStub.storeList.withArgs(emails, 'email_' + folder).yields();

                dao._localStoreMessages({
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

                dao._localDeleteMessage({
                    folder: folder,
                    uid: uid
                }, done);
            });
        });

        describe('sync', function() {
            it('should work initially', function(done) {
                var folder, localListStub;

                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder
                }];

                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);
                keychainStub.getReceiverPublicKey.withArgs(dummyEncryptedMail.from[0].address).yields(null, mockKeyPair);
                pgpStub.decrypt.withArgs(dummyEncryptedMail.body, mockKeyPair.publicKey).yields(null, dummyDecryptedMail.body);

                dao.sync({
                    folder: folder
                }, function() {
                    expect(dao._account.folders[0].messages).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.decrypt.calledOnce).to.be.true;

                    done();
                });
            });

            it('should be up to date', function(done) {
                var after, folder, localListStub, imapListStub;

                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);
                imapListStub = sinon.stub(dao, '_imapListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);

                after = _.after(2, function() {
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    done();
                });

                dao.sync({
                    folder: folder
                }, after);
            });

            it('should remove messages from the remote', function(done) {
                var after, folder, localListStub, imapListStub, localDeleteStub, imapDeleteStub;

                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);
                imapListStub = sinon.stub(dao, '_imapListMessages').withArgs({
                    folder: folder
                }).yields(null, []);
                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage').withArgs({
                    folder: folder,
                    uid: dummyEncryptedMail.uid
                }).yields();
                localDeleteStub = sinon.stub(dao, '_localDeleteMessage').withArgs({
                    folder: folder,
                    uid: dummyEncryptedMail.uid
                }).yields();

                after = _.after(2, function() {
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(localDeleteStub.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;
                    done();
                });

                dao.sync({
                    folder: folder
                }, after);
            });

            it('should delete messages locally if not present on remote', function(done) {
                var after, folder, localListStub, imapListStub, localDeleteStub;

                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);
                imapListStub = sinon.stub(dao, '_imapListMessages').withArgs({
                    folder: folder
                }).yields(null, []);
                localDeleteStub = sinon.stub(dao, '_localDeleteMessage').withArgs({
                    folder: folder,
                    uid: dummyEncryptedMail.uid
                }).yields();

                after = _.after(2, function() {
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(localDeleteStub.calledOnce).to.be.true;
                    done();
                });

                dao.sync({
                    folder: folder
                }, after);
            });

            it('should fetch messages downstream from the remote', function(done) {
                var after, folder, localListStub, imapListStub, imapGetStub, localStoreStub;

                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, []);
                imapListStub = sinon.stub(dao, '_imapListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);
                imapGetStub = sinon.stub(dao, '_imapGetMessage').withArgs({
                    folder: folder,
                    uid: dummyEncryptedMail.uid
                }).yields(null, dummyEncryptedMail);
                localStoreStub = sinon.stub(dao, '_localStoreMessages').yields();
                keychainStub.getReceiverPublicKey.withArgs(dummyEncryptedMail.from[0].address).yields(null, mockKeyPair);
                pgpStub.decrypt.withArgs(dummyEncryptedMail.body, mockKeyPair.publicKey).yields(null, dummyDecryptedMail.body);


                after = _.after(2, function() {
                    expect(dao._account.folders[0].messages).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.decrypt.calledOnce).to.be.true;
                    done();
                });

                dao.sync({
                    folder: folder
                }, after);
            });
        });

        describe('markAsRead', function() {
            it('should work', function(done) {
                imapClientStub.updateFlags.yields();

                dao.markRead({
                    folder: 'asdf',
                    uid: 1
                }, function(err) {
                    expect(imapClientStub.updateFlags.calledOnce).to.be.true;
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        describe('markAsAnswered', function() {
            it('should work', function(done) {
                imapClientStub.updateFlags.yields();

                dao.markAnswered({
                    folder: 'asdf',
                    uid: 1
                }, function(err) {
                    expect(imapClientStub.updateFlags.calledOnce).to.be.true;
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        describe('send', function() {
            it('should work', function(done) {
                smtpClientStub.send.withArgs(dummyEncryptedMail).yields();

                dao.send({
                    email: dummyEncryptedMail
                }, function(err) {
                    expect(err).to.not.exist;
                    expect(smtpClientStub.send.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('encryptedSend', function() {
            it('should work', function(done) {
                var encryptStub = sinon.stub(dao, '_encrypt').yields(null, {});
                keychainStub.getReceiverPublicKey.withArgs(dummyDecryptedMail.to[0].address).yields(null, {
                    _id: "fcf8b4aa-5d09-4089-8b4f-e3bc5091daf3",
                    userId: dummyDecryptedMail.to[0].address,
                    publicKey: publicKey
                });
                smtpClientStub.send.yields();

                dao.encryptedSend({
                    email: dummyDecryptedMail
                }, function(err) {
                    expect(err).to.not.exist;

                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(encryptStub.calledOnce).to.be.true;
                    expect(smtpClientStub.send.calledOnce).to.be.true;

                    done();
                });
            });
            it('should not work when encryption fails', function(done) {
                var encryptStub = sinon.stub(dao, '_encrypt').yields({});
                keychainStub.getReceiverPublicKey.withArgs(dummyDecryptedMail.to[0].address).yields(null, {
                    _id: "fcf8b4aa-5d09-4089-8b4f-e3bc5091daf3",
                    userId: dummyDecryptedMail.to[0].address,
                    publicKey: publicKey
                });

                dao.encryptedSend({
                    email: dummyDecryptedMail
                }, function(err) {
                    expect(err).to.exist;

                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(encryptStub.calledOnce).to.be.true;
                    expect(smtpClientStub.send.called).to.be.false;

                    done();
                });
            });
            it('should not work when key retrieval fails', function(done) {
                var encryptStub = sinon.stub(dao, '_encrypt');
                keychainStub.getReceiverPublicKey.withArgs(dummyDecryptedMail.to[0].address).yields({});

                dao.encryptedSend({
                    email: dummyDecryptedMail
                }, function(err) {
                    expect(err).to.exist;

                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(encryptStub.called).to.be.false;
                    expect(smtpClientStub.send.called).to.be.false;

                    done();
                });
            });
            it('should not work invalid recipients', function(done) {
                var encryptStub = sinon.stub(dao, '_encrypt');
                dummyDecryptedMail.to[0].address = 'asd@asd';

                dao.encryptedSend({
                    email: dummyDecryptedMail
                }, function(err) {
                    expect(err).to.exist;

                    expect(keychainStub.getReceiverPublicKey.called).to.be.false;
                    expect(encryptStub.called).to.be.false;
                    expect(smtpClientStub.send.called).to.be.false;

                    done();
                });
            });
            it('should not work with without sender', function(done) {
                var encryptStub = sinon.stub(dao, '_encrypt');
                dummyDecryptedMail.from[0].address = 'asd@asd';

                dao.encryptedSend({
                    email: dummyDecryptedMail
                }, function(err) {
                    expect(err).to.exist;

                    expect(keychainStub.getReceiverPublicKey.called).to.be.false;
                    expect(encryptStub.called).to.be.false;
                    expect(smtpClientStub.send.called).to.be.false;

                    done();
                });
            });
            it('should not work without recipients', function(done) {
                var encryptStub = sinon.stub(dao, '_encrypt');
                delete dummyDecryptedMail.to;

                dao.encryptedSend({
                    email: dummyDecryptedMail
                }, function(err) {
                    expect(err).to.exist;

                    expect(keychainStub.getReceiverPublicKey.called).to.be.false;
                    expect(encryptStub.called).to.be.false;
                    expect(smtpClientStub.send.called).to.be.false;

                    done();
                });
            });
            it('should not work with without sender', function(done) {
                var encryptStub = sinon.stub(dao, '_encrypt');
                delete dummyDecryptedMail.from;

                dao.encryptedSend({
                    email: dummyDecryptedMail
                }, function(err) {
                    expect(err).to.exist;

                    expect(keychainStub.getReceiverPublicKey.called).to.be.false;
                    expect(encryptStub.called).to.be.false;
                    expect(smtpClientStub.send.called).to.be.false;

                    done();
                });
            });
        });

        describe('_encrypt', function() {
            it('should work without attachments', function(done) {
                var ct = 'OMGSOENCRYPTED';

                pgpStub.exportKeys.yields(null, {
                    privateKeyArmored: mockKeyPair.privateKey.encryptedKey,
                    publicKeyArmored: mockKeyPair.publicKey.publicKey
                });
                pgpStub.encrypt.yields(null, ct);

                dao._encrypt({
                    email: dummyDecryptedMail
                }, function(err) {
                    expect(err).to.not.exist;

                    expect(pgpStub.exportKeys.calledOnce).to.be.true;
                    expect(pgpStub.encrypt.calledOnce).to.be.true;
                    expect(dummyDecryptedMail.body).to.contain(ct);

                    done();
                });
            });
        });
    });
});