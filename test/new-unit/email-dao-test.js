define(function(require) {
    'use strict';

    var EmailDAO = require('js/dao/email-dao'),
        KeychainDAO = require('js/dao/keychain-dao'),
        ImapClient = require('imap-client'),
        SmtpClient = require('smtp-client'),
        PGP = require('js/crypto/pgp'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        expect = chai.expect;


    describe('Email DAO unit tests', function() {
        var dao, keychainStub, imapClientStub, smtpClientStub, pgpStub, devicestorageStub;

        var emailAddress, passphrase, asymKeySize, mockkeyId, dummyEncryptedMail,
            dummyDecryptedMail, mockKeyPair, account, publicKey, verificationMail, verificationUuid,
            nonWhitelistedMail;

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
                body: '-----BEGIN PGP MESSAGE-----\nasd\n-----END PGP MESSAGE-----',
                unread: false,
                answered: false
            };
            verificationUuid = 'OMFG_FUCKING_BASTARD_UUID_FROM_HELL!';
            verificationMail = {
                from: [{
                    name: 'Whiteout Test',
                    address: 'whiteout.test@t-online.de'
                }], // sender address
                to: [{
                    address: 'safewithme.testuser@gmail.com'
                }], // list of receivers
                subject: "[whiteout] New public key uploaded", // Subject line
                body: 'yadda yadda bla blabla foo bar https://keys.whiteout.io/verify/' + verificationUuid, // plaintext body
                unread: true,
                answered: false
            };
            dummyDecryptedMail = {
                uid: 1234,
                from: [{
                    address: 'asd@asd.de'
                }],
                to: [{
                    address: 'qwe@qwe.de'
                }],
                subject: 'qweasd',
                body: 'asd',
                unread: false,
                answered: false
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
                busy: false
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

        describe('push', function() {
            it('should work', function(done) {
                var o = {};

                dao.onIncomingMessage = function(obj) {
                    expect(obj).to.equal(o);
                    done();
                };

                dao._imapClient.onIncomingMessage(o);
            });
        });

        describe('init', function() {
            beforeEach(function() {
                delete dao._account;
            });

            it('should init', function(done) {
                var loginStub, listFolderStub, folders;

                folders = [{}, {}];

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
                    expect(dao._account.folders[0].count).to.equal(0);
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
            it('should work without uid', function(done) {
                var folder = 'FOLDAAAA';
                devicestorageStub.listItems.withArgs('email_' + folder, 0, null).yields();

                dao._localListMessages({
                    folder: folder
                }, done);
            });

            it('should work with uid', function(done) {
                var folder = 'FOLDAAAA',
                    uid = 123;
                devicestorageStub.listItems.withArgs('email_' + folder + '_' + uid, 0, null).yields();

                dao._localListMessages({
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

            it('should fail when uid is missing', function(done) {
                var folder = 'FOLDAAAA';

                dao._localDeleteMessage({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;
                    done();
                });
            });
        });

        describe('sync', function() {
            it('should work initially', function(done) {
                var folder, localListStub, invocations, imapListStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder
                }];
                dummyDecryptedMail.unread = true;
                dummyEncryptedMail.unread = true;

                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);
                keychainStub.getReceiverPublicKey.withArgs(dummyEncryptedMail.from[0].address).yields(null, mockKeyPair);
                pgpStub.decrypt.withArgs(dummyEncryptedMail.body, mockKeyPair.publicKey).yields(null, dummyDecryptedMail.body);
                imapListStub = sinon.stub(dao, '_imapListMessages').withArgs({
                    folder: folder
                }).yields(null, [{
                    uid: dummyEncryptedMail.uid,
                    subject: '[whiteout] ' + dummyEncryptedMail.subject, // the object has already been manipulated as a side-effect...
                    unread: dummyEncryptedMail.unread,
                    answered: dummyEncryptedMail.answered
                }]);

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.decrypt.calledOnce).to.be.true;
                    expect(dao._account.folders[0].count).to.equal(1);

                    done();
                });
            });

            it('should initially error on decryption', function(done) {
                var folder, localListStub, invocations;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [dummyEncryptedMail]);
                keychainStub.getReceiverPublicKey.yields({});

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;

                    done();
                });
            });

            it('should initially sync downstream when storage is empty', function(done) {
                var folder, localListStub, localStoreStub, invocations, imapListStub, imapGetStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder
                }];

                dummyEncryptedMail.unread = true;

                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, []);
                keychainStub.getReceiverPublicKey.withArgs(dummyEncryptedMail.from[0].address).yields(null, mockKeyPair);
                pgpStub.decrypt.withArgs(dummyEncryptedMail.body, mockKeyPair.publicKey).yields(null, dummyDecryptedMail.body);
                imapListStub = sinon.stub(dao, '_imapListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);
                imapGetStub = sinon.stub(dao, '_imapGetMessage').withArgs({
                    folder: folder,
                    uid: dummyEncryptedMail.uid
                }).yields(null, dummyEncryptedMail);
                localStoreStub = sinon.stub(dao, '_localStoreMessages').yields();

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.decrypt.calledOnce).to.be.true;
                    expect(dao._account.folders[0].count).to.equal(1);

                    done();
                });
            });

            it('should not work when busy', function(done) {
                dao._account.busy = true;

                dao.sync({
                    folder: 'OOGA'
                }, function(err) {
                    expect(err).to.exist;
                    done();
                });
            });

            it('should fetch messages downstream from the remote', function(done) {
                dao.sync({}, function(err) {
                    expect(err).to.exist;
                    done();
                });
            });

            it('should not work when initial setup errors', function(done) {
                var folder, localListStub;

                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields({});

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(dao._account.busy).to.be.false;
                    expect(localListStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should be up to date', function(done) {
                var folder, localListStub, imapListStub, invocations;

                invocations = 0;
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


                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should error while listing from imap', function(done) {
                var folder, localListStub, imapListStub, invocations;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [dummyEncryptedMail]);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields({});


                dao.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should error while listing local messages', function(done) {
                var folder, localListStub;

                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields({});

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(dao._account.busy).to.be.false;
                    expect(localListStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should remove messages from the remote', function(done) {
                var invocations, folder, localListStub, imapListStub, localDeleteStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [dummyEncryptedMail]);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, []);
                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage').yields();
                localDeleteStub = sinon.stub(dao, '_localDeleteMessage').yields();

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(localDeleteStub.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should error whilte removing messages from local', function(done) {
                var invocations, folder, localListStub, imapListStub, localDeleteStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [dummyEncryptedMail]);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, []);
                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage').yields();
                localDeleteStub = sinon.stub(dao, '_localDeleteMessage').yields({});

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.called).to.be.false;
                    expect(localDeleteStub.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should error while removing messages from the remote', function(done) {
                var folder, localListStub, imapListStub, localDeleteStub, imapDeleteStub;

                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [dummyEncryptedMail]);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, []);
                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage').yields({});
                localDeleteStub = sinon.stub(dao, '_localDeleteMessage');

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;
                    expect(localDeleteStub.called).to.be.false;

                    done();
                });
            });

            it('should delete messages locally if not present on remote', function(done) {
                var invocations, folder, localListStub, imapListStub, localDeleteStub;

                invocations = 0;
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

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(localDeleteStub.calledOnce).to.be.true;
                    done();
                });

            });

            it('should error while deleting locally if not present on remote', function(done) {
                var invocations, folder, localListStub, imapListStub, localDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];


                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [dummyEncryptedMail]);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, []);
                localDeleteStub = sinon.stub(dao, '_localDeleteMessage').yields({});

                dao.sync({
                    folder: folder
                }, function(err) {
                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(localDeleteStub.calledOnce).to.be.true;
                    done();
                });

            });

            it('should fetch messages downstream from the remote', function(done) {
                var invocations, folder, localListStub, imapListStub, imapGetStub, localStoreStub;

                invocations = 0;
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


                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.decrypt.calledOnce).to.be.true;
                    done();
                });
            });

            it('should not fetch non-whitelisted mails', function(done) {
                var invocations, folder, localListStub, imapListStub, imapGetStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, []);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, [nonWhitelistedMail]);
                imapGetStub = sinon.stub(dao, '_imapGetMessage').yields(null, nonWhitelistedMail);
                localStoreStub = sinon.stub(dao, '_localStoreMessages').yields();

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(imapGetStub.called).to.be.false;
                    expect(localStoreStub.called).to.be.false;
                    expect(keychainStub.getReceiverPublicKey.called).to.be.false;
                    expect(pgpStub.decrypt.called).to.be.false;
                    done();
                });
            });

            it('should error while decrypting fetch messages from the remote', function(done) {
                var invocations, folder, localListStub, imapListStub, imapGetStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, []);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, [dummyEncryptedMail]);
                imapGetStub = sinon.stub(dao, '_imapGetMessage').yields(null, dummyEncryptedMail);
                localStoreStub = sinon.stub(dao, '_localStoreMessages').yields();
                keychainStub.getReceiverPublicKey.yields({});

                dao.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.decrypt.called).to.be.false;
                    done();
                });
            });

            it('should error while storing messages from the remote locally', function(done) {
                var invocations, folder, localListStub, imapListStub, imapGetStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, []);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, [dummyEncryptedMail]);
                imapGetStub = sinon.stub(dao, '_imapGetMessage').yields(null, dummyEncryptedMail);
                localStoreStub = sinon.stub(dao, '_localStoreMessages').yields({});

                dao.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    expect(keychainStub.getReceiverPublicKey.called).to.be.false;
                    expect(pgpStub.decrypt.called).to.be.false;
                    done();
                });
            });

            it('should error while fetching messages from the remote', function(done) {
                var invocations, folder, localListStub, imapListStub, imapGetStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, []);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, [dummyEncryptedMail]);
                imapGetStub = sinon.stub(dao, '_imapGetMessage').yields({});
                localStoreStub = sinon.stub(dao, '_localStoreMessages');

                dao.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(localStoreStub.called).to.be.false;
                    expect(keychainStub.getReceiverPublicKey.called).to.be.false;
                    expect(pgpStub.decrypt.called).to.be.false;
                    done();
                });
            });

            it('should verify an authentication mail', function(done) {
                var invocations, folder, localListStub, imapListStub,
                    imapGetStub, markReadStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, []);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, [verificationMail]);
                imapGetStub = sinon.stub(dao, '_imapGetMessage').yields(null, verificationMail);
                keychainStub.verifyPublicKey.withArgs(verificationUuid).yields();
                markReadStub = sinon.stub(dao, '_imapMark').withArgs({
                    folder: folder,
                    uid: verificationMail.uid,
                    unread: false
                }).yields();
                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage').withArgs({
                    folder: folder,
                    uid: verificationMail.uid
                }).yields();

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(keychainStub.verifyPublicKey.calledOnce).to.be.true;
                    expect(markReadStub.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail during deletion of an authentication mail', function(done) {
                var invocations, folder, localListStub, imapListStub,
                    imapGetStub, markReadStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, []);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, [verificationMail]);
                imapGetStub = sinon.stub(dao, '_imapGetMessage').yields(null, verificationMail);
                keychainStub.verifyPublicKey.yields();
                markReadStub = sinon.stub(dao, '_imapMark').yields();
                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage').yields({});

                dao.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(keychainStub.verifyPublicKey.calledOnce).to.be.true;
                    expect(markReadStub.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;

                    done();
                });
            });
            it('should fail during marking an authentication mail read', function(done) {
                var invocations, folder, localListStub, imapListStub,
                    imapGetStub, markReadStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, []);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, [verificationMail]);
                imapGetStub = sinon.stub(dao, '_imapGetMessage').yields(null, verificationMail);
                keychainStub.verifyPublicKey.yields();
                markReadStub = sinon.stub(dao, '_imapMark').yields({});
                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage');

                dao.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(keychainStub.verifyPublicKey.calledOnce).to.be.true;
                    expect(markReadStub.calledOnce).to.be.true;
                    expect(imapDeleteStub.called).to.be.false;

                    done();
                });
            });
            it('should fail during verifying authentication', function(done) {
                var invocations, folder, localListStub, imapListStub,
                    imapGetStub, markReadStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, []);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, [verificationMail]);
                imapGetStub = sinon.stub(dao, '_imapGetMessage').yields(null, verificationMail);
                keychainStub.verifyPublicKey.yields({});
                markReadStub = sinon.stub(dao, '_imapMark');
                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage');

                dao.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(keychainStub.verifyPublicKey.calledOnce).to.be.true;
                    expect(markReadStub.called).to.be.false;
                    expect(imapDeleteStub.called).to.be.false;

                    done();
                });
            });
            it('should not bother about read authentication mails', function(done) {
                var invocations, folder, localListStub, imapListStub,
                    imapGetStub, markReadStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                verificationMail.unread = false;

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, []);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, [verificationMail]);
                imapGetStub = sinon.stub(dao, '_imapGetMessage').yields(null, verificationMail);
                markReadStub = sinon.stub(dao, '_imapMark');
                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage');

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(keychainStub.verifyPublicKey.called).to.be.false;
                    expect(markReadStub.called).to.be.false;
                    expect(imapDeleteStub.called).to.be.false;

                    done();
                });
            });
            it('should not bother about read authentication mails', function(done) {
                var invocations, folder, localListStub, imapListStub,
                    imapGetStub, markReadStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                verificationMail.body = 'url? there is no url.';

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, []);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, [verificationMail]);
                imapGetStub = sinon.stub(dao, '_imapGetMessage').yields(null, verificationMail);
                markReadStub = sinon.stub(dao, '_imapMark');
                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage');

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(keychainStub.verifyPublicKey.called).to.be.false;
                    expect(markReadStub.called).to.be.false;
                    expect(imapDeleteStub.called).to.be.false;

                    done();
                });
            });

            it('should sync tags from memory to imap and storage', function(done) {
                var folder, localListStub, imapListStub, invocations,
                    markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                var inImap = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inImap.unread = true;

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [inStorage]);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, [inImap]);
                markStub = sinon.stub(dao, '_imapMark').withArgs({
                    folder: folder,
                    uid: dummyDecryptedMail.uid,
                    unread: dummyDecryptedMail.unread,
                    answered: dummyDecryptedMail.answered
                }).yields();
                localStoreStub = sinon.stub(dao, '_localStoreMessages').withArgs({
                    folder: folder,
                    emails: [inStorage]
                }).yields();

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(markStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;

                    expect(inStorage.unread).to.equal(dummyDecryptedMail.unread);
                    expect(inStorage.answered).to.equal(dummyDecryptedMail.answered);

                    done();
                });
            });

            it('should error while syncing tags from memory to storage', function(done) {
                var folder, localListStub, imapListStub, invocations,
                    markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                var inImap = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inImap.unread = true;

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [inStorage]);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, [inImap]);
                markStub = sinon.stub(dao, '_imapMark').yields();
                localStoreStub = sinon.stub(dao, '_localStoreMessages').yields({});

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(markStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    expect(imapListStub.called).to.be.false;
                    done();
                });
            });

            it('should error while syncing tags from memory to imap', function(done) {
                var folder, localListStub, imapListStub, invocations,
                    markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                var inImap = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inImap.unread = true;

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [inStorage]);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, [inImap]);
                markStub = sinon.stub(dao, '_imapMark').yields({});
                localStoreStub = sinon.stub(dao, '_localStoreMessages');

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(markStub.calledOnce).to.be.true;
                    expect(localStoreStub.called).to.be.false;
                    expect(imapListStub.called).to.be.false;
                    done();
                });
            });

            it('should sync tags from imap to memory and storage', function(done) {
                var folder, localListStub, imapListStub, invocations,
                    markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                var inImap = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inStorage.unread = true;

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [inStorage]);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, [inImap]);
                markStub = sinon.stub(dao, '_imapMark');
                localStoreStub = sinon.stub(dao, '_localStoreMessages').yields();

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledTwice).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(markStub.called).to.be.false;
                    expect(localStoreStub.calledOnce).to.be.true;

                    expect(dummyDecryptedMail.unread).to.equal(inImap.unread);
                    expect(inStorage.unread).to.equal(inImap.unread);

                    done();
                });
            });

            it('should error while syncing tags from imap to storage', function(done) {
                var folder, localListStub, imapListStub, invocations,
                    markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                var inImap = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inStorage.unread = true;

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [inStorage]);
                imapListStub = sinon.stub(dao, '_imapListMessages').yields(null, [inImap]);
                markStub = sinon.stub(dao, '_imapMark');
                localStoreStub = sinon.stub(dao, '_localStoreMessages').yields({});

                dao.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledTwice).to.be.true;
                    expect(imapListStub.calledOnce).to.be.true;
                    expect(markStub.called).to.be.false;
                    expect(localStoreStub.calledOnce).to.be.true;

                    expect(inStorage.unread).to.equal(inImap.unread);
                    expect(dummyDecryptedMail.unread).to.equal(true); // the live object has not been touched!

                    done();
                });
            });
        });

        describe('mark', function() {
            it('should work', function(done) {
                imapClientStub.updateFlags.withArgs({
                    path: 'asdf',
                    uid: 1,
                    unread: false,
                    answered: false
                }).yields();

                dao._imapMark({
                    folder: 'asdf',
                    uid: 1,
                    unread: false,
                    answered: false
                }, function(err) {
                    expect(imapClientStub.updateFlags.calledOnce).to.be.true;
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        describe('move', function() {
            it('should work', function(done) {
                imapClientStub.moveMessage.withArgs({
                    path: 'asdf',
                    uid: 1,
                    destination: 'asdasd'
                }).yields();

                dao.move({
                    folder: 'asdf',
                    uid: 1,
                    destination: 'asdasd'
                }, function(err) {
                    expect(imapClientStub.moveMessage.calledOnce).to.be.true;
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        describe('sendPlaintext', function() {
            it('should work', function(done) {
                smtpClientStub.send.withArgs(dummyEncryptedMail).yields();

                dao.sendPlaintext({
                    email: dummyEncryptedMail
                }, function(err) {
                    expect(err).to.not.exist;
                    expect(smtpClientStub.send.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('sendEncrypted', function() {
            it('should work', function(done) {
                var encryptStub = sinon.stub(dao, '_encrypt').yields(null, {});
                keychainStub.getReceiverPublicKey.withArgs(dummyDecryptedMail.to[0].address).yields(null, {
                    _id: "fcf8b4aa-5d09-4089-8b4f-e3bc5091daf3",
                    userId: dummyDecryptedMail.to[0].address,
                    publicKey: publicKey
                });
                smtpClientStub.send.yields();

                dao.sendEncrypted({
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

                dao.sendEncrypted({
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

                dao.sendEncrypted({
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

                dao.sendEncrypted({
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

                dao.sendEncrypted({
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

                dao.sendEncrypted({
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

                dao.sendEncrypted({
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

        describe('store', function() {
            it('should work', function(done) {
                pgpStub.exportKeys.yields(null, {
                    publicKeyArmored: 'omgsocrypto'
                });
                pgpStub.encrypt.yields(null, 'asdfasfd');
                devicestorageStub.storeList.yields();

                dao.store(dummyDecryptedMail, function(err) {
                    expect(err).to.not.exist;
                    expect(pgpStub.exportKeys.calledOnce).to.be.true;
                    expect(pgpStub.encrypt.calledOnce).to.be.true;
                    expect(devicestorageStub.storeList.calledOnce).to.be.true;

                    done();
                });
            });
        });

        describe('list', function() {
            it('should work', function(done) {
                devicestorageStub.listItems.yields(null, [dummyEncryptedMail]);
                pgpStub.exportKeys.yields(null, {
                    publicKeyArmored: 'omgsocrypto'
                });
                pgpStub.decrypt.yields(null, dummyDecryptedMail.body);

                dao.list(function(err, mails) {
                    expect(err).to.not.exist;

                    expect(devicestorageStub.listItems.calledOnce).to.be.true;
                    expect(pgpStub.exportKeys.calledOnce).to.be.true;
                    expect(pgpStub.decrypt.calledOnce).to.be.true;
                    expect(mails.length).to.equal(1);
                    expect(mails[0].body).to.equal(dummyDecryptedMail.body);
                    expect(mails[0].subject).to.equal(dummyDecryptedMail.subject);

                    done();
                });
            });
        });

    });
});