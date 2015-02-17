'use strict';

var mailreader = require('mailreader'),
    ImapClient = require('imap-client'),
    PgpMailer = require('pgpmailer'),
    PgpBuilder = require('pgpbuilder'),
    cfg = require('../../../src/js/app-config').config,
    EmailDAO = require('../../../src/js/email/email'),
    KeychainDAO = require('../../../src/js/service/keychain'),
    PGP = require('../../../src/js/crypto/pgp'),
    DeviceStorageDAO = require('../../../src/js/service/devicestorage'),
    appConfig = require('../../../src/js/app-config'),
    Auth = require('../../../src/js/service/auth'),
    Dialog = require('../../../src/js/util/dialog');


describe('Email DAO unit tests', function() {
    // show the stack trace when an error occurred
    chai.config.includeStack = true;

    // SUT
    var dao;

    // mocks
    var keychainStub, imapClientStub, pgpMailerStub, pgpBuilderStub, pgpStub, devicestorageStub, parseStub, dialogStub, authStub;

    // config
    var emailAddress, passphrase, asymKeySize, account;

    // test data
    var folders, inboxFolder, sentFolder, draftsFolder, outboxFolder, trashFolder, flaggedFolder, otherFolder, mockKeyPair;

    beforeEach(function() {
        //
        // test data
        //
        emailAddress = 'asdf@asdf.com';
        passphrase = 'asdf';
        asymKeySize = 2048;

        inboxFolder = {
            name: 'Inbox',
            type: 'Inbox',
            path: 'INBOX',
            messages: []
        };

        sentFolder = {
            name: 'Sent',
            type: 'Sent',
            path: 'SENT',
            messages: []
        };

        draftsFolder = {
            name: 'Drafts',
            type: 'Drafts',
            path: 'DRAFTS',
            messages: []
        };

        outboxFolder = {
            name: 'Outbox',
            type: 'Outbox',
            path: 'OUTBOX',
            messages: []
        };

        trashFolder = {
            name: 'Trash',
            type: 'Trash',
            path: 'TRASH',
            messages: []
        };

        flaggedFolder = {
            name: 'Flagged',
            type: 'Flagged',
            path: 'FLAGGED',
            messages: []
        };

        otherFolder = {
            name: 'Other',
            type: 'Other',
            path: 'OTHER',
            messages: []
        };

        folders = [inboxFolder, outboxFolder, trashFolder, sentFolder, otherFolder];

        account = {
            emailAddress: emailAddress,
            asymKeySize: asymKeySize,
            folders: folders,
            online: true
        };

        mockKeyPair = {
            publicKey: {
                _id: 1234,
                userId: emailAddress,
                publicKey: 'publicpublicpublicpublic'
            },
            privateKey: {
                _id: 1234,
                userId: emailAddress,
                encryptedKey: 'privateprivateprivateprivate'
            }
        };

        //
        // setup the mocks
        //
        keychainStub = sinon.createStubInstance(KeychainDAO);
        imapClientStub = sinon.createStubInstance(ImapClient);
        pgpMailerStub = sinon.createStubInstance(PgpMailer);
        pgpBuilderStub = sinon.createStubInstance(PgpBuilder);
        pgpStub = sinon.createStubInstance(PGP);
        parseStub = sinon.stub(mailreader, 'parse');
        devicestorageStub = sinon.createStubInstance(DeviceStorageDAO);
        dialogStub = sinon.createStubInstance(Dialog);
        authStub = sinon.createStubInstance(Auth);

        //
        // setup the SUT
        //
        dao = new EmailDAO(keychainStub, pgpStub, devicestorageStub, pgpBuilderStub, mailreader, dialogStub, appConfig, authStub);
        dao._account = account;
        dao._pgpMailer = pgpMailerStub;
        dao._imapClient = imapClientStub;

        //
        // check configuration
        //
        expect(dao._keychain).to.equal(keychainStub);
        expect(dao._pgp).to.equal(pgpStub);
        expect(dao._devicestorage).to.equal(devicestorageStub);
        expect(dao._mailreader).to.equal(mailreader);
        expect(dao._pgpbuilder).to.equal(pgpBuilderStub);
    });

    afterEach(function() {
        mailreader.parse.restore();
    });


    describe('#init', function() {
        var initFoldersStub;

        beforeEach(function() {
            delete dao._account;
            initFoldersStub = sinon.stub(dao, '_initFoldersFromDisk');
        });

        it('should initialize folders', function(done) {
            initFoldersStub.returns(resolves());

            dao.init({
                account: account
            }).then(function() {
                expect(initFoldersStub.calledOnce).to.be.true;

                done();
            });
        });
    });

    describe('#unlock', function() {
        it('should unlock', function(done) {
            pgpStub.getKeyParams.returns({
                _id: mockKeyPair.publicKey._id,
                userId: emailAddress,
                userIds: [{
                    emailAddress: emailAddress
                }]
            });

            pgpStub.importKeys.withArgs({
                passphrase: passphrase,
                privateKeyArmored: mockKeyPair.privateKey.encryptedKey,
                publicKeyArmored: mockKeyPair.publicKey.publicKey
            }).returns(resolves());
            pgpStub._privateKey = {
                foo: 'bar'
            };

            dao.unlock({
                passphrase: passphrase,
                keypair: mockKeyPair
            }).then(function() {
                expect(pgpStub.importKeys.calledOnce).to.be.true;
                expect(dao._pgpbuilder._privateKey).to.equal(pgpStub._privateKey);

                done();
            });
        });

        it('should generate a keypair and unlock', function(done) {
            var keypair = {
                keyId: 123,
                publicKeyArmored: mockKeyPair.publicKey.publicKey,
                privateKeyArmored: mockKeyPair.privateKey.encryptedKey
            };
            var name = 'Hans Dampf';

            pgpStub.generateKeys.withArgs({
                emailAddress: emailAddress,
                realname: name,
                keySize: asymKeySize,
                passphrase: passphrase
            }).returns(resolves(keypair));

            pgpStub.importKeys.withArgs({
                passphrase: passphrase,
                privateKeyArmored: mockKeyPair.privateKey.encryptedKey,
                publicKeyArmored: mockKeyPair.publicKey.publicKey
            }).returns(resolves());
            keychainStub.putUserKeyPair.withArgs().returns(resolves());

            dao.unlock({
                realname: name,
                passphrase: passphrase
            }).then(function() {
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
            pgpStub.generateKeys.returns(resolves(keypair));
            pgpStub.importKeys.withArgs().returns(resolves());
            keychainStub.putUserKeyPair.returns(rejects({}));

            dao.unlock({
                passphrase: passphrase
            }).catch(function(err) {
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

            pgpStub.generateKeys.withArgs().returns(resolves(keypair));
            pgpStub.importKeys.withArgs().returns(rejects({}));

            dao.unlock({
                passphrase: passphrase
            }).catch(function(err) {
                expect(err).to.exist;

                expect(pgpStub.generateKeys.calledOnce).to.be.true;
                expect(pgpStub.importKeys.calledOnce).to.be.true;

                done();
            });
        });

        it('should fail when generation fails', function(done) {
            pgpStub.generateKeys.returns(rejects({}));

            dao.unlock({
                passphrase: passphrase
            }).catch(function(err) {
                expect(err).to.exist;

                expect(pgpStub.generateKeys.calledOnce).to.be.true;

                done();
            });
        });
    });

    describe('#openFolder', function() {
        it('should open an imap mailbox', function(done) {
            imapClientStub.selectMailbox.withArgs({
                path: inboxFolder.path
            }).returns(resolves());

            dao.openFolder({
                folder: inboxFolder
            }).then(function() {
                expect(imapClientStub.selectMailbox.calledOnce).to.be.true;
                done();
            });
        });

        it('should not open the virtual outbox folder in imap', function(done) {
            dao.openFolder({
                folder: outboxFolder
            }).then(function() {
                expect(imapClientStub.selectMailbox.called).to.be.false;
                done();
            });
        });

        it('should not do anything in offline mode', function(done) {
            account.online = false;

            dao.openFolder({
                folder: inboxFolder
            }).catch(function(err) {
                expect(err).to.exist;
                expect(imapClientStub.selectMailbox.called).to.be.false;
                done();
            });
        });
    });

    describe('#refreshFolder', function() {
        var localListStub, mail;

        beforeEach(function() {
            localListStub = sinon.stub(dao, '_localListMessages');
            mail = {
                uid: 123,
                unread: true
            };
        });

        it('should add messages from disk', function(done) {
            localListStub.withArgs({
                folder: inboxFolder
            }).returns(resolves([mail]));

            dao.refreshFolder({
                folder: inboxFolder
            }).then(function() {
                expect(inboxFolder.count).to.equal(1);
                expect(inboxFolder.messages).to.contain(mail);

                done();
            });
        });

        it('should not add messages from disk', function(done) {
            inboxFolder.messages = [mail];
            localListStub.withArgs({
                folder: inboxFolder
            }).returns(resolves([mail]));

            dao.refreshFolder({
                folder: inboxFolder
            }).then(function() {
                expect(inboxFolder.count).to.equal(1);
                expect(inboxFolder.messages).to.contain(mail);

                done();
            });
        });

        it('should remove messages from memory', function(done) {
            inboxFolder.messages = [mail];
            localListStub.withArgs({
                folder: inboxFolder
            }).returns(resolves([]));

            dao.refreshFolder({
                folder: inboxFolder
            }).then(function() {
                expect(inboxFolder.count).to.equal(0);
                expect(inboxFolder.messages).to.be.empty;

                done();
            });
        });
    });

    describe('#fetchMessages', function() {
        var imapListStub, imapGetStub, imapDeleteStub, localStoreStub;
        var opts, message, validUuid, corruptedUuid, verificationSubject;
        var notified;

        beforeEach(function() {
            imapListStub = sinon.stub(dao, '_imapListMessages');
            imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage');
            imapGetStub = sinon.stub(dao, '_getBodyParts');
            localStoreStub = sinon.stub(dao, '_localStoreMessages');

            opts = {
                folder: inboxFolder,
                firstUid: 123,
                lastUid: 123
            };
            message = {
                uid: 123,
                subject: 'asdasd',
                unread: true,
                bodyParts: []
            };
            validUuid = '9A858952-17EE-4273-9E74-D309EAFDFAFB';
            corruptedUuid = 'OMFG_FUCKING_BASTARD_UUID_FROM_HELL!';
            verificationSubject = "[whiteout] New public key uploaded";

            notified = false;
            dao.onIncomingMessage = function(newMessages) {
                expect(newMessages).to.contain(message);
                notified = true;
            };
        });

        it('should fetch message downstream', function(done) {
            imapListStub.withArgs(opts).returns(resolves([message]));

            localStoreStub.withArgs({
                folder: inboxFolder,
                emails: [message]
            }).returns(resolves());

            dao.fetchMessages(opts).then(function() {
                expect(inboxFolder.messages).to.contain(message);
                expect(notified).to.be.true;
                expect(localStoreStub.calledOnce).to.be.true;
                expect(imapListStub.calledOnce).to.be.true;

                done();
            });
        });

        it('should not notify for other folders', function(done) {
            opts.folder = sentFolder;

            imapListStub.withArgs(opts).returns(resolves([message]));

            localStoreStub.withArgs({
                folder: sentFolder,
                emails: [message]
            }).returns(resolves());

            dao.fetchMessages(opts).then(function() {
                expect(sentFolder.messages).to.contain(message);
                expect(notified).to.be.false;
                expect(localStoreStub.calledOnce).to.be.true;
                expect(imapListStub.calledOnce).to.be.true;

                done();
            });
        });

        it('should verify verification mails', function(done) {
            message.subject = verificationSubject;

            imapListStub.withArgs(opts).returns(resolves([message]));

            imapGetStub.withArgs({
                folder: inboxFolder,
                uid: message.uid,
                bodyParts: message.bodyParts
            }).returns(resolves([{
                type: 'text',
                content: '' + cfg.keyServerUrl + cfg.verificationUrl + validUuid
            }]));

            keychainStub.verifyPublicKey.withArgs(validUuid).returns(resolves());

            imapDeleteStub.withArgs({
                folder: inboxFolder,
                uid: message.uid
            }).returns(resolves());

            dao.fetchMessages(opts).then(function() {
                expect(inboxFolder.messages).to.not.contain(message);
                expect(notified).to.be.false;
                expect(imapListStub.calledOnce).to.be.true;
                expect(imapGetStub.calledOnce).to.be.true;
                expect(keychainStub.verifyPublicKey.calledOnce).to.be.true;
                expect(imapDeleteStub.calledOnce).to.be.true;
                expect(localStoreStub.called).to.be.false;
                done();
            });
        });

        it('should not verify invalid verification mails', function(done) {
            message.subject = verificationSubject;

            imapListStub.withArgs(opts).returns(resolves([message]));

            imapGetStub.withArgs({
                folder: inboxFolder,
                uid: message.uid,
                bodyParts: message.bodyParts
            }).returns(resolves([{
                type: 'text',
                content: '' + cfg.keyServerUrl + cfg.verificationUrl + corruptedUuid
            }]));

            localStoreStub.withArgs({
                folder: inboxFolder,
                emails: [message]
            }).returns(resolves());

            dao.fetchMessages(opts).then(function() {
                expect(inboxFolder.messages).to.contain(message);
                expect(notified).to.be.true;
                expect(imapListStub.calledOnce).to.be.true;
                expect(imapGetStub.calledOnce).to.be.true;
                expect(keychainStub.verifyPublicKey.called).to.be.false;
                expect(imapDeleteStub.called).to.be.false;
                expect(localStoreStub.calledOnce).to.be.true;
                done();
            });
        });

        it('should display verification mail when verification failed', function(done) {
            message.subject = verificationSubject;

            imapListStub.withArgs(opts).returns(resolves([message]));

            imapGetStub.withArgs({
                folder: inboxFolder,
                uid: message.uid,
                bodyParts: message.bodyParts
            }).returns(resolves([{
                type: 'text',
                content: '' + cfg.keyServerUrl + cfg.verificationUrl + validUuid
            }]));

            keychainStub.verifyPublicKey.withArgs(validUuid).returns(rejects({}));

            localStoreStub.withArgs({
                folder: inboxFolder,
                emails: [message]
            }).returns(resolves());

            dao.fetchMessages(opts).then(function() {
                expect(inboxFolder.messages).to.contain(message);
                expect(notified).to.be.true;
                expect(imapListStub.calledOnce).to.be.true;
                expect(imapGetStub.calledOnce).to.be.true;
                expect(keychainStub.verifyPublicKey.calledOnce).to.be.true;
                expect(imapDeleteStub.called).to.be.false;
                expect(localStoreStub.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('#deleteMessage', function() {
        var imapDeleteStub, localDeleteStub, message;

        beforeEach(function() {
            message = {
                uid: 1234
            };
            imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage');
            localDeleteStub = sinon.stub(dao, '_localDeleteMessage');
            inboxFolder.messages = [message];
            outboxFolder.messages = [message];
        });

        it('should delete from imap, local, memory', function(done) {
            var deleteOpts = {
                folder: inboxFolder,
                uid: message.uid
            };

            imapDeleteStub.withArgs(deleteOpts).returns(resolves());
            localDeleteStub.withArgs(deleteOpts).returns(resolves());

            dao.deleteMessage({
                folder: inboxFolder,
                message: message
            }).then(function() {
                expect(imapDeleteStub.calledOnce).to.be.true;
                expect(localDeleteStub.calledOnce).to.be.true;
                expect(inboxFolder.messages).to.not.contain(message);

                done();
            });
        });

        it('should delete from local, memory', function(done) {
            var deleteOpts = {
                folder: inboxFolder,
                uid: message.uid
            };

            localDeleteStub.withArgs(deleteOpts).returns(resolves());

            dao.deleteMessage({
                folder: inboxFolder,
                message: message,
                localOnly: true
            }).then(function() {
                expect(imapDeleteStub.called).to.be.false;
                expect(localDeleteStub.calledOnce).to.be.true;
                expect(inboxFolder.messages).to.not.contain(message);

                done();
            });
        });

        it('should delete from outbox from local, memory', function(done) {
            var deleteOpts = {
                folder: outboxFolder,
                uid: message.uid
            };

            localDeleteStub.withArgs(deleteOpts).returns(resolves());

            dao.deleteMessage({
                folder: outboxFolder,
                message: message
            }).then(function() {
                expect(imapDeleteStub.called).to.be.false;
                expect(localDeleteStub.calledOnce).to.be.true;
                expect(outboxFolder.messages).to.not.contain(message);

                done();
            });
        });

        it('should fail at delete from local', function(done) {
            var deleteOpts = {
                folder: inboxFolder,
                uid: message.uid
            };

            imapDeleteStub.withArgs(deleteOpts).returns(resolves());
            localDeleteStub.withArgs(deleteOpts).returns(rejects({}));

            dao.deleteMessage({
                folder: inboxFolder,
                message: message
            }).catch(function(err) {
                expect(err).to.exist;
                expect(imapDeleteStub.calledOnce).to.be.true;
                expect(localDeleteStub.calledOnce).to.be.true;
                expect(inboxFolder.messages).to.contain(message);

                done();
            });
        });

        it('should fail at delete from imap', function(done) {
            var deleteOpts = {
                folder: inboxFolder,
                uid: message.uid
            };

            imapDeleteStub.withArgs(deleteOpts).returns(rejects({}));

            dao.deleteMessage({
                folder: inboxFolder,
                message: message
            }).catch(function(err) {
                expect(err).to.exist;
                expect(imapDeleteStub.calledOnce).to.be.true;
                expect(localDeleteStub.called).to.be.false;
                expect(inboxFolder.messages).to.contain(message);

                done();
            });
        });

        it('should fail at delete from imap in offline', function(done) {
            account.online = false;
            dao.deleteMessage({
                folder: inboxFolder,
                message: message
            }).catch(function(err) {
                expect(err).to.exist;
                expect(imapDeleteStub.called).to.be.false;
                expect(localDeleteStub.called).to.be.false;
                expect(inboxFolder.messages).to.contain(message);

                done();
            });
        });
    });

    describe('#setFlags', function() {
        var imapMark, localListStub, localStoreStub, message;

        beforeEach(function() {
            message = {
                uid: 1234
            };
            imapMark = sinon.stub(dao, '_imapMark');
            localListStub = sinon.stub(dao, '_localListMessages');
            localStoreStub = sinon.stub(dao, '_localStoreMessages');
            inboxFolder.messages = [message];
            outboxFolder.messages = [message];
        });

        it('should set flags for imap, disk, memory', function(done) {
            imapMark.withArgs({
                folder: inboxFolder,
                uid: message.uid,
                unread: message.unread,
                answered: message.answered,
                flagged: message.flagged
            }).returns(resolves());

            localListStub.withArgs({
                folder: inboxFolder,
                uid: message.uid
            }).returns(resolves([message]));

            localStoreStub.withArgs({
                folder: inboxFolder,
                emails: [message]
            }).returns(resolves());

            dao.setFlags({
                folder: inboxFolder,
                message: message
            }).then(function() {
                expect(imapMark.calledOnce).to.be.true;
                expect(localListStub.calledOnce).to.be.true;
                expect(localStoreStub.calledOnce).to.be.true;

                done();
            });
        });

        it('should not explode when message has been deleted during imap roundtrip', function(done) {
            imapMark.withArgs({
                folder: inboxFolder,
                uid: message.uid,
                unread: message.unread,
                answered: message.answered,
                flagged: message.flagged
            }).returns(resolves());

            localListStub.withArgs({
                folder: inboxFolder,
                uid: message.uid
            }).returns(resolves([]));

            dao.setFlags({
                folder: inboxFolder,
                message: message
            }).then(function() {
                expect(imapMark.calledOnce).to.be.true;
                expect(localListStub.calledOnce).to.be.true;
                expect(localStoreStub.called).to.be.false;

                done();
            });
        });

        it('should set flags for outbox for disk, memory', function(done) {
            localListStub.withArgs({
                folder: outboxFolder,
                uid: message.uid
            }).returns(resolves([message]));

            localStoreStub.withArgs({
                folder: outboxFolder,
                emails: [message]
            }).returns(resolves());

            dao.setFlags({
                folder: outboxFolder,
                message: message
            }).then(function() {
                expect(imapMark.called).to.be.false;
                expect(localListStub.calledOnce).to.be.true;
                expect(localStoreStub.calledOnce).to.be.true;

                done();
            });
        });

        it('should set flags for disk, memory', function(done) {
            localListStub.withArgs({
                folder: inboxFolder,
                uid: message.uid
            }).returns(resolves([message]));

            localStoreStub.withArgs({
                folder: inboxFolder,
                emails: [message]
            }).returns(resolves());

            dao.setFlags({
                folder: inboxFolder,
                message: message,
                localOnly: true
            }).then(function() {
                expect(imapMark.called).to.be.false;
                expect(localListStub.calledOnce).to.be.true;
                expect(localStoreStub.calledOnce).to.be.true;

                done();
            });
        });

        it('should fail to set flags for imap', function(done) {
            imapMark.returns(rejects({}));
            localListStub.returns(resolves([message]));
            localStoreStub.returns(resolves());

            dao.setFlags({
                folder: inboxFolder,
                message: message
            }).catch(function(err) {
                expect(err).to.exist;
                expect(imapMark.calledOnce).to.be.true;
                expect(localListStub.called).to.be.false;
                expect(localStoreStub.called).to.be.false;

                done();
            });
        });
        it('should fail to set flags for imap in offline mode', function(done) {
            account.online = false;
            localListStub.returns(resolves([message]));
            localStoreStub.returns(resolves());

            dao.setFlags({
                folder: inboxFolder,
                message: message
            }).catch(function(err) {
                expect(err).to.exist;
                expect(imapMark.called).to.be.false;
                expect(localListStub.called).to.be.false;
                expect(localStoreStub.called).to.be.false;

                done();
            });
        });
    });

    describe('#moveMessage', function() {
        var localDeleteStub, imapMoveStub, message;

        beforeEach(function() {
            localDeleteStub = sinon.stub(dao, '_localDeleteMessage');
            imapMoveStub = sinon.stub(dao, '_imapMoveMessage');
            message = {
                uid: 123
            };
            inboxFolder.messages.push(message);
        });

        it('should move a message to a destination folder', function(done) {
            imapMoveStub.withArgs({
                folder: inboxFolder,
                destination: sentFolder,
                uid: message.uid
            }).returns(resolves());

            localDeleteStub.withArgs({
                folder: inboxFolder,
                uid: message.uid
            }).returns(resolves());

            dao.moveMessage({
                folder: inboxFolder,
                destination: sentFolder,
                message: message
            }).then(function() {
                expect(imapMoveStub.calledOnce).to.be.true;
                expect(localDeleteStub.calledOnce).to.be.true;
                expect(inboxFolder.messages).to.not.contain(message);

                done();
            });
        });

        it('should not a message if IMAP errors', function(done) {
            imapMoveStub.withArgs({
                folder: inboxFolder,
                destination: sentFolder,
                uid: message.uid
            }).returns(rejects(new Error()));

            dao.moveMessage({
                folder: inboxFolder,
                destination: sentFolder,
                message: message
            }).catch(function(err) {
                expect(err).to.exist;
                expect(imapMoveStub.calledOnce).to.be.true;
                expect(localDeleteStub.called).to.be.false;
                expect(inboxFolder.messages).to.contain(message);

                done();
            });
        });

        it('should fail at delete from imap in offline', function(done) {
            account.online = false;

            dao.moveMessage({
                folder: inboxFolder,
                destination: sentFolder,
                message: message
            }).catch(function(err) {
                expect(err).to.exist;
                expect(imapMoveStub.called).to.be.false;
                expect(localDeleteStub.called).to.be.false;
                expect(inboxFolder.messages).to.contain(message);

                done();
            });
        });
    });

    describe('#getBody', function() {
        var localListStub, localStoreStub, imapGetStub, uid;

        beforeEach(function() {
            uid = 12345;
            localListStub = sinon.stub(dao, '_localListMessages');
            localStoreStub = sinon.stub(dao, '_localStoreMessages');
            imapGetStub = sinon.stub(dao, '_getBodyParts');
        });

        it('should not do anything if the message already has content', function() {
            var message = {
                body: 'bender is great!'
            };

            dao.getBody({
                message: message
            });

            // should do nothing
        });

        it('should read an unencrypted body from the device', function(done) {
            var message, body;

            body = 'bender is great! bender is great!';
            message = {
                uid: uid
            };

            localListStub.withArgs({
                folder: inboxFolder,
                uid: uid
            }).returns(resolves([{
                bodyParts: [{
                    type: 'text',
                    content: body
                }]
            }]));

            dao.getBody({
                message: message,
                folder: inboxFolder
            }).then(function(msg) {
                expect(msg).to.equal(message);
                expect(msg.body).to.equal(body);
                expect(msg.loadingBody).to.be.false;

                expect(localListStub.calledOnce).to.be.true;

                done();
            });
            expect(message.loadingBody).to.be.true;
        });

        it('should read a pgp/mime from the device', function(done) {
            var message, ct, pt;

            pt = 'bender is great!';
            ct = '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----';
            message = {
                uid: uid,
                encrypted: true
            };

            localListStub.withArgs({
                folder: inboxFolder,
                uid: uid
            }).returns(resolves([{
                bodyParts: [{
                    type: 'text',
                    content: pt
                }, {
                    type: 'encrypted',
                    content: ct
                }]
            }]));

            dao.getBody({
                message: message,
                folder: inboxFolder
            }).then(function(msg) {
                expect(msg).to.equal(message);
                expect(msg.body).to.equal(ct);
                expect(msg.encrypted).to.be.true;
                expect(message.loadingBody).to.be.false;

                expect(localListStub.calledOnce).to.be.true;

                done();
            });
            expect(message.loadingBody).to.be.true;
        });

        it('should read a signed pgp/mime from the device', function(done) {
            var message, signed, pt, signedMimeTree, signature;

            pt = 'bender is great!';
            signed = 'omg signed text';
            signedMimeTree = 'trallalalalala';
            signature = 'ugauga';
            message = {
                uid: uid,
                signed: true,
                from: [{
                    address: 'asdasdasd'
                }]
            };

            localListStub.withArgs({
                folder: inboxFolder,
                uid: uid
            }).returns(resolves([{
                bodyParts: [{
                    type: 'text',
                    content: pt
                }, {
                    type: 'signed',
                    content: [{
                        type: 'text',
                        content: signed
                    }],
                    signedMessage: signedMimeTree,
                    signature: signature
                }]
            }]));
            keychainStub.getReceiverPublicKey.withArgs(message.from[0].address).returns(resolves(mockKeyPair.publicKey));
            pgpStub.verifySignedMessage.withArgs(signedMimeTree, signature, mockKeyPair.publicKey.publicKey).returns(resolves(true));

            dao.getBody({
                message: message,
                folder: inboxFolder
            }).then(function(msg) {
                expect(msg).to.equal(message);
                expect(msg.body).to.equal(signed);
                expect(message.signed).to.be.true;
                expect(message.signaturesValid).to.be.true;
                expect(message.loadingBody).to.be.false;

                expect(localListStub.calledOnce).to.be.true;
                expect(pgpStub.verifySignedMessage.calledOnce).to.be.true;
                expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;

                done();
            });
            expect(message.loadingBody).to.be.true;
        });

        it('should read a pgp/inline from the device', function(done) {
            var message, ct, pt;

            ct = '-----BEGIN PGP MESSAGE-----\nasdasdasd\n-----END PGP MESSAGE-----';
            pt = 'bla bla yadda yadda';
            message = {
                uid: uid
            };

            localListStub.returns(resolves([{
                bodyParts: [{
                    type: 'text',
                    content: pt
                }, {
                    type: 'text',
                    content: ct
                }, {
                    type: 'text',
                    content: pt
                }]
            }]));

            dao.getBody({
                message: message,
                folder: inboxFolder
            }).then(function(msg) {
                expect(msg).to.equal(message);
                expect(msg.body).to.equal(ct);
                expect(msg.bodyParts[0].type).to.equal('encrypted');
                expect(msg.bodyParts[0].content).to.equal(ct);
                expect(msg.encrypted).to.be.true;
                expect(message.loadingBody).to.be.false;

                expect(localListStub.calledOnce).to.be.true;

                done();
            });
            expect(message.loadingBody).to.be.true;
        });

        it('should read a signed pgp/inline from the device', function(done) {
            var message, pt, expected;

            expected = 'Lorem ipsum Aliquip tempor veniam proident.\n\nafguab;igab;igubalw\n\nLorem ipsum Dolor sed irure sint in non.\n\n\n';
            pt = '-----BEGIN PGP SIGNED MESSAGE-----\nHash: WTFHASH\n\n' + expected + '\n-----BEGIN PGP SIGNATURE----------END PGP SIGNATURE-----';
            message = {
                uid: uid,
                from: [{
                    address: 'asdasdasd'
                }]
            };

            localListStub.returns(resolves([{
                bodyParts: [{
                    type: 'text',
                    content: pt
                }]
            }]));
            keychainStub.getReceiverPublicKey.withArgs(message.from[0].address).returns(resolves(mockKeyPair.publicKey));
            pgpStub.verifyClearSignedMessage.withArgs(pt, mockKeyPair.publicKey.publicKey).returns(resolves(true));

            dao.getBody({
                message: message,
                folder: inboxFolder
            }).then(function(msg) {
                expect(msg).to.equal(message);
                expect(msg.body).to.equal(expected);
                expect(message.signed).to.be.true;
                expect(message.signaturesValid).to.be.true;
                expect(message.loadingBody).to.be.false;

                expect(localListStub.calledOnce).to.be.true;
                expect(pgpStub.verifyClearSignedMessage.calledOnce).to.be.true;
                expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;

                done();
            });
            expect(message.loadingBody).to.be.true;
        });

        it('should stream from imap and set plain text body', function(done) {
            var message, body, uid;

            body = 'bender is great! bender is great!';
            uid = 1234;
            message = {
                uid: uid,
                bodyParts: [{
                    type: 'text'
                }]
            };

            localListStub.withArgs({
                folder: inboxFolder,
                uid: uid
            }).returns(resolves([message]));

            localStoreStub.withArgs({
                folder: inboxFolder,
                emails: [message]
            }).returns(resolves());

            imapGetStub.withArgs({
                folder: inboxFolder,
                uid: message.uid,
                bodyParts: message.bodyParts
            }).returns(resolves([{
                type: 'text',
                content: body
            }]));

            dao.getBody({
                message: message,
                folder: inboxFolder
            }).then(function(msg) {
                expect(msg).to.equal(message);
                expect(msg.body).to.equal(body);
                expect(msg.loadingBody).to.be.false;

                expect(localListStub.calledOnce).to.be.true;
                expect(imapGetStub.calledOnce).to.be.true;
                expect(localStoreStub.calledOnce).to.be.true;

                done();
            });
            expect(message.loadingBody).to.be.true;
        });

        it('should stream from imap and set encrypted body', function(done) {
            var message, ct, pt;

            pt = 'bender is great';
            ct = '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----';
            message = {
                uid: uid,
                encrypted: true,
                bodyParts: [{
                    type: 'text'
                }, {
                    type: 'encrypted'
                }]
            };

            localListStub.withArgs({
                folder: inboxFolder,
                uid: uid
            }).returns(resolves([message]));

            localStoreStub.withArgs({
                folder: inboxFolder,
                emails: [message]
            }).returns(resolves());

            imapGetStub.withArgs({
                folder: inboxFolder,
                uid: message.uid,
                bodyParts: message.bodyParts
            }).returns(resolves([{
                type: 'text',
                content: pt
            }, {
                type: 'encrypted',
                content: ct
            }]));


            dao.getBody({
                message: message,
                folder: inboxFolder
            }).then(function(msg) {
                expect(msg).to.equal(message);
                expect(msg.body).to.equal(ct);
                expect(msg.encrypted).to.be.true;
                expect(msg.loadingBody).to.be.false;

                expect(localListStub.calledOnce).to.be.true;
                expect(imapGetStub.calledOnce).to.be.true;
                expect(localStoreStub.calledOnce).to.be.true;

                done();
            });
            expect(message.loadingBody).to.be.true;
        });

        it('should not error when message is deleted from imap', function(done) {
            var error = new Error('Can not get the contents of this message. It has already been deleted!');
            error.hide = true;

            var message = {
                uid: uid,
                encrypted: true,
                bodyParts: [{
                    type: 'text'
                }]
            };

            localListStub.withArgs({
                folder: inboxFolder,
                uid: uid
            }).returns(resolves([message]));

            localStoreStub.withArgs({
                folder: inboxFolder,
                emails: [message]
            }).returns(resolves());

            imapGetStub.withArgs({
                folder: inboxFolder,
                uid: message.uid,
                bodyParts: message.bodyParts
            }).returns(rejects(error));


            dao.getBody({
                message: message,
                folder: inboxFolder
            }).then(function(msg) {
                expect(msg).to.equal(message);
                expect(msg.body).to.not.exist;
                expect(msg.loadingBody).to.be.false;

                expect(localListStub.calledOnce).to.be.true;
                expect(imapGetStub.calledOnce).to.be.true;
                expect(localStoreStub.called).to.be.false;

                done();
            });
            expect(message.loadingBody).to.be.true;
        });

        it('should not error when message has already been removed from memory', function(done) {
            var message = {
                uid: uid,
                encrypted: true,
                bodyParts: [{
                    type: 'text'
                }]
            };

            localListStub.returns(resolves([]));

            dao.getBody({
                message: message,
                folder: inboxFolder
            }).then(function(msg) {
                expect(msg).to.equal(message);
                expect(msg.body).to.not.exist;
                expect(msg.loadingBody).to.be.false;

                expect(localListStub.calledOnce).to.be.true;
                expect(imapGetStub.called).to.be.false;
                expect(localStoreStub.called).to.be.false;

                done();
            });
            expect(message.loadingBody).to.be.true;
        });

        it('fail to stream from imap due to error when persisting', function(done) {
            var message = {
                uid: uid,
                bodyParts: [{
                    type: 'text'
                }]
            };

            localListStub.returns(resolves([message]));
            localStoreStub.returns(rejects({}));
            imapGetStub.returns(resolves([{
                type: 'text',
                content: 'bender is great! bender is great!'
            }]));

            dao.getBody({
                message: message,
                folder: inboxFolder
            }).catch(function(err) {
                expect(err).to.exist;
                expect(localListStub.calledOnce).to.be.true;
                expect(imapGetStub.calledOnce).to.be.true;
                expect(localStoreStub.calledOnce).to.be.true;

                expect(message.loadingBody).to.be.false;

                done();
            });
        });

        it('fail to stream from imap due to stream error', function(done) {
            var message = {
                uid: uid,
                bodyParts: [{
                    type: 'text'
                }]
            };

            localListStub.returns(resolves([message]));
            imapGetStub.returns(rejects({}));

            dao.getBody({
                message: message,
                folder: inboxFolder
            }).catch(function(err) {
                expect(err).to.exist;
                expect(localListStub.calledOnce).to.be.true;
                expect(imapGetStub.calledOnce).to.be.true;
                expect(localStoreStub.called).to.be.false;

                expect(message.loadingBody).to.be.false;

                done();
            });
        });
    });

    describe('#getAttachment', function() {
        var imapGetStub, uid;

        beforeEach(function() {
            uid = 123456;
            imapGetStub = sinon.stub(dao, '_getBodyParts');
        });

        it('should fetch an attachment from imap', function(done) {
            var attmt = {};

            imapGetStub.withArgs({
                folder: inboxFolder,
                uid: uid,
                bodyParts: [attmt]
            }).returns(resolves([{
                content: 'CONTENT!!!'
            }]));

            dao.getAttachment({
                folder: inboxFolder,
                uid: uid,
                attachment: attmt
            }).then(function(fetchedAttmt) {
                expect(fetchedAttmt).to.equal(attmt);
                expect(attmt.content).to.not.be.empty;
                expect(imapGetStub.calledOnce).to.be.true;

                done();
            });
        });

        it('should error during fetch', function(done) {
            var attmt = {};

            imapGetStub.returns(resolves());

            dao.getAttachment({
                folder: inboxFolder,
                uid: uid,
                attachment: attmt
            }).catch(function(err) {
                expect(err).to.exist;
                expect(imapGetStub.calledOnce).to.be.true;

                done();
            });
        });
    });

    describe('#decryptBody', function() {
        it('should do nothing when the message is not encrypted', function(done) {
            var message = {
                encrypted: false,
                decrypted: true,
                body: 'asd'
            };

            dao.decryptBody({
                message: message
            }).then(function(msg) {
                expect(msg).to.equal(message);
                done();
            });
        });

        it('should do nothing when the message is already decrypted', function(done) {
            var message = {
                encrypted: true,
                decrypted: true,
                body: 'asd'
            };

            dao.decryptBody({
                message: message
            }).then(function(msg) {
                expect(msg).to.equal(message);
                done();
            });
        });

        it('should do nothing when the message has no body', function(done) {
            var message = {
                encrypted: true,
                decrypted: false,
                body: ''
            };

            dao.decryptBody({
                message: message
            }).then(function(msg) {
                expect(msg).to.equal(message);
                done();
            });
        });

        it('should do nothing when the message is decrypting', function(done) {
            var message = {
                encrypted: true,
                decrypted: false,
                body: 'asd',
                decryptingBody: true
            };

            dao.decryptBody({
                message: message
            }).then(function(msg) {
                expect(msg).to.equal(message);
                done();
            });
        });

        it('decrypt a pgp/mime message', function(done) {
            var message, ct, pt, parsed;

            pt = 'bender is great';
            ct = '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----';
            parsed = 'bender! bender! bender!';
            message = {
                from: [{
                    address: 'asdasdasd'
                }],
                body: ct,
                encrypted: true,
                bodyParts: [{
                    type: 'encrypted',
                    content: ct
                }]
            };

            keychainStub.getReceiverPublicKey.withArgs(message.from[0].address).returns(resolves(mockKeyPair.publicKey));
            pgpStub.decrypt.withArgs(ct, mockKeyPair.publicKey.publicKey).returns(resolves({
                decrypted: pt,
                signaturesValid: true
            }));
            parseStub.withArgs({
                bodyParts: [{
                    type: 'encrypted',
                    content: ct,
                    raw: pt
                }]
            }).yieldsAsync(null, [{
                type: 'encrypted',
                content: [{
                    type: 'text',
                    content: parsed
                }]
            }]);

            dao.decryptBody({
                message: message
            }).then(function(msg) {
                expect(msg).to.equal(message);
                expect(message.decrypted).to.be.true;
                expect(message.signed).to.be.true;
                expect(message.signaturesValid).to.be.true;
                expect(message.body).to.equal(parsed);
                expect(message.decryptingBody).to.be.false;
                expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                expect(pgpStub.decrypt.calledOnce).to.be.true;
                expect(parseStub.calledOnce).to.be.true;

                done();
            });

            expect(message.decryptingBody).to.be.true;
        });

        it('decrypt a pgp/mime message with inner signature', function(done) {
            var message, ct, pt, parsed, signed, signedMimeTree, signature;

            pt = 'bender is great';
            ct = '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----';
            signedMimeTree = 'trallalalalala';
            signature = 'ugauga';
            signed = 'omg signed text';
            parsed = 'bender! bender! bender!';
            message = {
                from: [{
                    address: 'asdasdasd'
                }],
                body: ct,
                encrypted: true,
                bodyParts: [{
                    type: 'encrypted',
                    content: ct
                }]
            };

            keychainStub.getReceiverPublicKey.withArgs(message.from[0].address).returns(resolves(mockKeyPair.publicKey));
            pgpStub.decrypt.withArgs(ct, mockKeyPair.publicKey.publicKey).returns(resolves({
                decrypted: pt,
                signaturesValid: undefined
            }));
            pgpStub.verifySignedMessage.withArgs(signedMimeTree, signature, mockKeyPair.publicKey.publicKey).returns(resolves(true));

            parseStub.withArgs({
                bodyParts: [{
                    type: 'encrypted',
                    content: ct,
                    raw: pt
                }]
            }).yieldsAsync(null, [{
                type: 'encrypted',
                content: [{
                    type: 'signed',
                    content: [{
                        type: 'text',
                        content: signed
                    }],
                    signedMessage: signedMimeTree,
                    signature: signature
                }]
            }]);

            dao.decryptBody({
                message: message
            }).then(function(msg) {
                expect(msg).to.equal(message);
                expect(message.decrypted).to.be.true;
                expect(message.body).to.equal(signed);
                expect(message.signed).to.be.true;
                expect(message.signaturesValid).to.be.true;
                expect(message.decryptingBody).to.be.false;
                expect(keychainStub.getReceiverPublicKey.calledTwice).to.be.true;
                expect(pgpStub.decrypt.calledOnce).to.be.true;
                expect(pgpStub.verifySignedMessage.calledOnce).to.be.true;
                expect(parseStub.calledOnce).to.be.true;

                done();
            });

            expect(message.decryptingBody).to.be.true;
        });

        it('decrypt a pgp/inline message', function(done) {
            var message, ct, pt;

            pt = 'bender is great';
            ct = '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----';
            message = {
                from: [{
                    address: 'asdasdasd'
                }],
                body: ct,
                encrypted: true,
                bodyParts: [{
                    type: 'encrypted',
                    content: ct,
                    _isPgpInline: true
                }]
            };

            keychainStub.getReceiverPublicKey.withArgs(message.from[0].address).returns(resolves(mockKeyPair.publicKey));
            pgpStub.decrypt.withArgs(ct, mockKeyPair.publicKey.publicKey).returns(resolves({
                decrypted: pt,
                signaturesValid: true
            }));

            dao.decryptBody({
                message: message
            }).then(function(msg) {
                expect(msg).to.equal(message);
                expect(message.decrypted).to.be.true;
                expect(message.body).to.equal(pt);
                expect(message.decryptingBody).to.be.false;
                expect(message.signed).to.be.true;
                expect(message.signaturesValid).to.be.true;
                expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                expect(pgpStub.decrypt.calledOnce).to.be.true;
                expect(parseStub.called).to.be.false;

                done();
            });

            expect(message.decryptingBody).to.be.true;
        });

        it('should fail during decryption message', function(done) {
            var message = {
                from: [{
                    address: 'asdasdasd'
                }],
                body: 'asdjafuad',
                encrypted: true,
                bodyParts: [{
                    type: 'encrypted',
                    content: '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----'
                }]
            };

            keychainStub.getReceiverPublicKey.returns(resolves(mockKeyPair.publicKey));
            pgpStub.decrypt.returns(rejects(new Error('fail.')));

            dao.decryptBody({
                message: message
            }).then(function(msg) {
                expect(msg.body).to.equal('fail.');
                expect(msg).to.exist;
                expect(message.decryptingBody).to.be.false;
                expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                expect(pgpStub.decrypt.calledOnce).to.be.true;
                expect(parseStub.called).to.be.false;

                done();
            });
        });

        it('should fail during key export', function(done) {
            var message = {
                from: [{
                    address: 'asdasdasd'
                }],
                encrypted: true,
                body: 'asdjafuad',
                bodyParts: [{
                    type: 'encrypted',
                    content: '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----'
                }]
            };

            keychainStub.getReceiverPublicKey.returns(resolves());

            dao.decryptBody({
                message: message
            }).then(function(msg) {
                expect(msg).to.equal(message);
                expect(message.decryptingBody).to.be.false;
                expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                expect(pgpStub.decrypt.called).to.be.true;
                expect(parseStub.called).to.be.false;

                done();
            });
        });
    });

    describe('#sendEncrypted', function() {
        var credentials,
            publicKeys,
            dummyMail,
            msg;

        beforeEach(function() {
            credentials = {
                smtp: {
                    host: 'foo.io'
                }
            };
            publicKeys = ["PUBLIC KEY"];
            dummyMail = {
                publicKeysArmored: publicKeys
            };
            msg = 'wow. such message. much rfc2822.';
        });

        it('should send encrypted and upload to sent', function(done) {
            imapClientStub.uploadMessage.withArgs({
                path: sentFolder.path,
                message: msg
            }).returns(resolves());

            authStub.getCredentials.returns(resolves(credentials));
            pgpMailerStub.send.withArgs({
                encrypt: true,
                mail: dummyMail,
                smtpclient: undefined,
                publicKeysArmored: publicKeys
            }).returns(resolves(msg));

            dao.sendEncrypted({
                email: dummyMail
            }, pgpMailerStub).then(function() {
                expect(authStub.getCredentials.calledOnce).to.be.true;
                expect(pgpMailerStub.send.calledOnce).to.be.true;
                expect(imapClientStub.uploadMessage.calledOnce).to.be.true;
                expect(dao.ignoreUploadOnSent).to.be.false;

                done();
            });
        });

        it('should send encrypted and not upload to sent', function(done) {
            credentials.smtp.host = 'smtp.gmail.com';

            authStub.getCredentials.returns(resolves(credentials));
            pgpMailerStub.send.withArgs({
                encrypt: true,
                mail: dummyMail,
                smtpclient: undefined,
                publicKeysArmored: publicKeys
            }).returns(resolves(msg));

            dao.sendEncrypted({
                email: dummyMail
            }, pgpMailerStub).then(function() {
                expect(authStub.getCredentials.calledOnce).to.be.true;
                expect(pgpMailerStub.send.calledOnce).to.be.true;
                expect(imapClientStub.uploadMessage.called).to.be.false;
                expect(dao.ignoreUploadOnSent).to.be.true;

                done();
            });
        });

        it('should send encrypted and ignore error on upload', function(done) {
            imapClientStub.uploadMessage.returns(rejects(new Error()));
            pgpMailerStub.send.returns(resolves(msg));
            authStub.getCredentials.returns(resolves(credentials));

            dao.sendEncrypted({
                email: dummyMail
            }, pgpMailerStub).then(function() {
                expect(pgpMailerStub.send.calledOnce).to.be.true;
                expect(imapClientStub.uploadMessage.calledOnce).to.be.true;
                expect(authStub.getCredentials.calledOnce).to.be.true;

                done();
            });
        });

        it('should not send when pgpmailer fails', function(done) {
            pgpMailerStub.send.returns(rejects({}));
            authStub.getCredentials.returns(resolves(credentials));

            dao.sendEncrypted({
                email: dummyMail
            }, pgpMailerStub).catch(function(err) {
                expect(err).to.exist;

                expect(authStub.getCredentials.calledOnce).to.be.true;
                expect(pgpMailerStub.send.calledOnce).to.be.true;
                expect(imapClientStub.uploadMessage.called).to.be.false;

                done();
            });
        });

        it('should not send in offline mode', function(done) {
            account.online = false;

            dao.sendEncrypted({
                email: dummyMail
            }, pgpMailerStub).catch(function(err) {
                expect(err.code).to.equal(42);
                expect(authStub.getCredentials.called).to.be.false;
                expect(pgpMailerStub.send.called).to.be.false;
                expect(imapClientStub.uploadMessage.called).to.be.false;
                done();
            });
        });

    });

    describe('#sendPlaintext', function() {
        var credentials,
            dummyMail,
            msg;

        beforeEach(function() {
            credentials = {
                smtp: {
                    host: 'foo.io'
                }
            };
            dummyMail = {};
            msg = 'wow. such message. much rfc2822.';
        });

        it('should send in the plain and upload to sent', function(done) {
            pgpMailerStub.send.withArgs({
                smtpclient: undefined,
                mail: dummyMail
            }).returns(resolves(msg));
            authStub.getCredentials.returns(resolves(credentials));

            imapClientStub.uploadMessage.withArgs({
                path: sentFolder.path,
                message: msg
            }).returns(resolves());

            dao.sendPlaintext({
                email: dummyMail
            }, pgpMailerStub).then(function() {
                expect(authStub.getCredentials.calledOnce).to.be.true;
                expect(pgpMailerStub.send.calledOnce).to.be.true;
                expect(imapClientStub.uploadMessage.calledOnce).to.be.true;
                done();
            });
        });

        it('should send in the plain and not upload to sent', function(done) {
            dao.ignoreUploadOnSent = true;
            credentials.smtp.host = 'smtp.gmail.com';

            pgpMailerStub.send.withArgs({
                smtpclient: undefined,
                mail: dummyMail
            }).returns(resolves(msg));
            authStub.getCredentials.returns(resolves(credentials));

            dao.sendPlaintext({
                email: dummyMail
            }, pgpMailerStub).then(function() {
                expect(authStub.getCredentials.calledOnce).to.be.true;
                expect(pgpMailerStub.send.calledOnce).to.be.true;
                expect(imapClientStub.uploadMessage.called).to.be.false;
                done();
            });
        });

        it('should send  and ignore error on upload', function(done) {
            imapClientStub.uploadMessage.returns(rejects(new Error()));
            pgpMailerStub.send.returns(resolves(msg));
            authStub.getCredentials.returns(resolves(credentials));

            dao.sendPlaintext({
                email: dummyMail
            }, pgpMailerStub).then(function() {
                expect(authStub.getCredentials.calledOnce).to.be.true;
                expect(pgpMailerStub.send.calledOnce).to.be.true;
                expect(imapClientStub.uploadMessage.calledOnce).to.be.true;

                done();
            });
        });

        it('should not send due to error', function(done) {
            pgpMailerStub.send.returns(rejects({}));
            authStub.getCredentials.returns(resolves(credentials));

            dao.sendPlaintext({
                email: dummyMail
            }, pgpMailerStub).catch(function(err) {
                expect(err).to.exist;
                expect(authStub.getCredentials.calledOnce).to.be.true;
                expect(pgpMailerStub.send.calledOnce).to.be.true;
                expect(imapClientStub.uploadMessage.called).to.be.false;
                done();
            });
        });

        it('should not send in offline mode', function(done) {
            account.online = false;

            dao.sendPlaintext({
                email: dummyMail
            }, pgpMailerStub).catch(function(err) {
                expect(err.code).to.equal(42);
                expect(authStub.getCredentials.called).to.be.false;
                expect(pgpMailerStub.send.called).to.be.false;
                expect(imapClientStub.uploadMessage.called).to.be.false;
                done();
            });
        });
    });

    describe('#encrypt', function() {
        it('should encrypt', function(done) {
            pgpBuilderStub.encrypt.returns(resolves());

            dao.encrypt({}).then(function() {
                expect(pgpBuilderStub.encrypt.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('event handlers', function() {

        describe('#onConnect', function() {
            var initFoldersStub, credentials;

            beforeEach(function() {
                initFoldersStub = sinon.stub(dao, '_initFoldersFromImap');
                delete dao._imapClient;

                credentials = {
                    imap: {}
                };
            });

            it('should connect', function(done) {
                inboxFolder.messages = [{
                    uid: 123,
                    modseq: '123'
                }];
                authStub.getCredentials.returns(resolves(credentials));
                imapClientStub.login.returns(resolves());
                imapClientStub.selectMailbox.returns(resolves());
                imapClientStub.listenForChanges.returns(resolves());
                initFoldersStub.returns(resolves());

                dao.onConnect(imapClientStub).then(function() {
                    expect(imapClientStub.login.calledOnce).to.be.true;
                    expect(imapClientStub.selectMailbox.calledOnce).to.be.true;
                    expect(initFoldersStub.calledOnce).to.be.true;
                    expect(imapClientStub.mailboxCache).to.deep.equal({
                        'INBOX': {
                            exists: 123,
                            uidNext: 124,
                            uidlist: [123],
                            highestModseq: '123'
                        }
                    });

                    done();
                });
            });
        });

        describe('#onDisconnect', function() {
            it('should discard imapClient and pgpMailer', function(done) {
                imapClientStub.stopListeningForChanges.returns(resolves());
                imapClientStub.logout.returns(resolves());

                dao.onDisconnect().then(function() {
                    expect(imapClientStub.stopListeningForChanges.calledOnce).to.be.true;
                    expect(imapClientStub.logout.calledOnce).to.be.true;
                    expect(dao._account.online).to.be.false;
                    expect(dao._imapClient).to.not.exist;
                    expect(dao._pgpMailer).to.not.exist;
                    done();
                });

            });
        });

        describe('#_onSyncUpdate', function() {
            var fetchMessagesStub, deleteMessagesStub, setFlagsStub, msgs;

            beforeEach(function() {
                msgs = [{
                    uid: 5,
                    flags: ['\\Answered', '\\Seen']
                }];
                inboxFolder.messages = msgs;
                fetchMessagesStub = sinon.stub(dao, 'fetchMessages');
                deleteMessagesStub = sinon.stub(dao, 'deleteMessage');
                setFlagsStub = sinon.stub(dao, 'setFlags');
            });

            it('should get new message', function(done) {
                fetchMessagesStub.withArgs({
                    folder: inboxFolder,
                    firstUid: 1,
                    lastUid: 3
                }).returns(resolves());

                dao._onSyncUpdate({
                    type: 'new',
                    path: inboxFolder.path,
                    list: [1, 3]
                });

                setTimeout(function() {
                    expect(dialogStub.error.calledOnce).to.be.true;
                    expect(fetchMessagesStub.calledOnce).to.be.true;
                    done();
                }, 0);
            });

            it('should delete message', function(done) {
                deleteMessagesStub.withArgs({
                    folder: inboxFolder,
                    message: msgs[0],
                    localOnly: true
                }).returns(resolves());

                dao._onSyncUpdate({
                    type: 'deleted',
                    path: inboxFolder.path,
                    list: [5]
                });

                setTimeout(function() {
                    expect(dialogStub.error.calledOnce).to.be.true;
                    expect(deleteMessagesStub.calledOnce).to.be.true;
                    done();
                }, 0);
            });

            it('should fetch flags', function(done) {
                setFlagsStub.withArgs({
                    folder: inboxFolder,
                    message: msgs[0],
                    localOnly: true
                }).returns(resolves());

                dao._onSyncUpdate({
                    type: 'messages',
                    path: inboxFolder.path,
                    list: msgs
                });

                setTimeout(function() {
                    expect(dialogStub.error.calledOnce).to.be.true;
                    expect(setFlagsStub.calledOnce).to.be.true;
                    done();
                }, 0);
            });
        });
    });


    describe('internal API', function() {
        describe('#_checkSignatures', function() {
            it('should check signatures in clearsigned message', function(done) {
                var message = {
                    from: [{
                        address: 'asdasdasd'
                    }],
                    clearSignedMessage: 'trallalalalala'
                };

                keychainStub.getReceiverPublicKey.withArgs(message.from[0].address).returns(resolves(mockKeyPair.publicKey));
                pgpStub.verifyClearSignedMessage.withArgs(message.clearSignedMessage, mockKeyPair.publicKey.publicKey).returns(resolves(true));

                dao._checkSignatures(message).then(function(signaturesValid) {
                    expect(signaturesValid).to.be.true;
                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.verifyClearSignedMessage.calledOnce).to.be.true;
                    done();
                });
            });

            it('should check signatures in pgp/mime signed message', function(done) {
                var message = {
                    from: [{
                        address: 'asdasdasd'
                    }],
                    signedMessage: 'trallalalalala',
                    signature: 'ugauga'
                };

                keychainStub.getReceiverPublicKey.withArgs(message.from[0].address).returns(resolves(mockKeyPair.publicKey));
                pgpStub.verifySignedMessage.withArgs(message.signedMessage, message.signature, mockKeyPair.publicKey.publicKey).returns(resolves(true));

                dao._checkSignatures(message).then(function(signaturesValid) {
                    expect(signaturesValid).to.be.true;
                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.verifySignedMessage.calledOnce).to.be.true;
                    done();
                });
            });

            it('should error while checking signatures', function(done) {
                var message = {
                    from: [{
                        address: 'asdasdasd'
                    }],
                    signedMessage: 'trallalalalala',
                    signature: 'ugauga'
                };

                keychainStub.getReceiverPublicKey.withArgs(message.from[0].address).returns(resolves(mockKeyPair.publicKey));
                pgpStub.verifySignedMessage.returns(rejects(new Error()));

                dao._checkSignatures(message).catch(function(error) {
                    expect(error).to.exist;
                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.verifySignedMessage.calledOnce).to.be.true;
                    done();
                });
            });

            it('should error while fetching public key', function(done) {
                var message = {
                    from: [{
                        address: 'asdasdasd'
                    }],
                    signedMessage: 'trallalalalala',
                    signature: 'ugauga'
                };

                keychainStub.getReceiverPublicKey.returns(rejects(new Error()));

                dao._checkSignatures(message).catch(function(error) {
                    expect(error).to.exist;
                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.verifySignedMessage.called).to.be.false;
                    done();
                });
            });
        });

        describe('#_initFoldersFromDisk', function() {
            beforeEach(function() {
                sinon.stub(dao, 'refreshFolder');
            });

            it('should initialize from disk if offline and not refresh folder', function(done) {
                devicestorageStub.listItems.withArgs('folders').returns(resolves([
                    [inboxFolder]
                ]));
                dao.refreshFolder.withArgs({
                    folder: inboxFolder
                }).returns(resolves());

                dao._initFoldersFromDisk().then(function() {
                    expect(devicestorageStub.listItems.calledOnce).to.be.true;
                    expect(dao.refreshFolder.called).to.be.false;
                    done();
                });
            });

            it('should initialize from disk if offline and refresh folder', function(done) {
                delete inboxFolder.messages;
                devicestorageStub.listItems.withArgs('folders').returns(resolves([
                    [inboxFolder]
                ]));
                dao.refreshFolder.withArgs({
                    folder: inboxFolder
                }).returns(resolves());

                dao._initFoldersFromDisk().then(function() {
                    expect(devicestorageStub.listItems.calledOnce).to.be.true;
                    expect(dao.refreshFolder.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('#_initFoldersFromImap', function() {
            beforeEach(function() {
                sinon.stub(dao, 'refreshFolder');
            });

            it('should initialize from imap if online', function(done) {
                account.folders = [];
                imapClientStub.listWellKnownFolders.returns(resolves({
                    Inbox: [inboxFolder],
                    Sent: [sentFolder],
                    Drafts: [draftsFolder],
                    Trash: [trashFolder],
                    Flagged: [flaggedFolder],
                    Other: [otherFolder]
                }));
                devicestorageStub.storeList.withArgs(sinon.match(function(arg) {
                    expect(arg[0][0].name).to.deep.equal(inboxFolder.name);
                    expect(arg[0][0].path).to.deep.equal(inboxFolder.path);
                    expect(arg[0][0].type).to.deep.equal(inboxFolder.type);
                    expect(arg[0][1].name).to.deep.equal(sentFolder.name);
                    expect(arg[0][1].path).to.deep.equal(sentFolder.path);
                    expect(arg[0][1].type).to.deep.equal(sentFolder.type);
                    expect(arg[0][2].name).to.deep.equal(outboxFolder.name);
                    expect(arg[0][2].path).to.deep.equal(outboxFolder.path);
                    expect(arg[0][2].type).to.deep.equal(outboxFolder.type);
                    expect(arg[0][3].name).to.deep.equal(draftsFolder.name);
                    expect(arg[0][3].path).to.deep.equal(draftsFolder.path);
                    expect(arg[0][3].type).to.deep.equal(draftsFolder.type);
                    expect(arg[0][4].name).to.deep.equal(trashFolder.name);
                    expect(arg[0][4].path).to.deep.equal(trashFolder.path);
                    expect(arg[0][4].type).to.deep.equal(trashFolder.type);
                    expect(arg[0][5].name).to.deep.equal(flaggedFolder.name);
                    expect(arg[0][5].path).to.deep.equal(flaggedFolder.path);
                    expect(arg[0][5].type).to.deep.equal(flaggedFolder.type);
                    expect(arg[0][6].name).to.deep.equal(otherFolder.name);
                    expect(arg[0][6].path).to.deep.equal(otherFolder.path);
                    expect(arg[0][6].type).to.deep.equal(otherFolder.type);
                    return true;
                }), 'folders').returns(resolves());

                dao.refreshFolder.returns(resolves());

                dao._initFoldersFromImap().then(function() {
                    expect(imapClientStub.listWellKnownFolders.calledOnce).to.be.true;
                    expect(devicestorageStub.storeList.calledOnce).to.be.true;
                    done();
                });
            });

            it('should update folders from imap', function(done) {
                account.folders = [inboxFolder, outboxFolder, trashFolder, {
                    name: 'foo',
                    type: 'Sent',
                    path: 'bar',
                }];

                imapClientStub.listWellKnownFolders.returns(resolves({
                    Inbox: [inboxFolder],
                    Sent: [sentFolder],
                    Drafts: [draftsFolder],
                    Trash: [trashFolder],
                    Flagged: [flaggedFolder],
                    Other: [otherFolder]
                }));
                devicestorageStub.storeList.withArgs(sinon.match(function(arg) {
                    expect(arg[0]).to.deep.equal([{
                        name: inboxFolder.name,
                        path: inboxFolder.path,
                        type: inboxFolder.type,
                        wellknown: true
                    }, {
                        name: sentFolder.name,
                        path: sentFolder.path,
                        type: sentFolder.type,
                        wellknown: true
                    }, {
                        name: outboxFolder.name,
                        path: outboxFolder.path,
                        type: outboxFolder.type,
                        wellknown: true
                    }, {
                        name: draftsFolder.name,
                        path: draftsFolder.path,
                        type: draftsFolder.type,
                        wellknown: true
                    }, {
                        name: trashFolder.name,
                        path: trashFolder.path,
                        type: trashFolder.type,
                        wellknown: true
                    }, {
                        name: flaggedFolder.name,
                        path: flaggedFolder.path,
                        type: flaggedFolder.type,
                        wellknown: true
                    }, {
                        name: otherFolder.name,
                        path: otherFolder.path,
                        type: otherFolder.type,
                        wellknown: false
                    }]);

                    return true;
                }), 'folders').returns(resolves());

                dao.refreshFolder.returns(resolves());

                dao._initFoldersFromImap().then(function() {
                    expect(imapClientStub.listWellKnownFolders.calledOnce).to.be.true;
                    expect(devicestorageStub.storeList.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('#_imapMark', function() {
            it('should flag a mail', function(done) {
                imapClientStub.updateFlags.withArgs({
                    path: inboxFolder.path,
                    folder: inboxFolder,
                    uid: 1,
                    unread: false,
                    answered: false
                }).returns(resolves());

                dao._imapMark({
                    folder: inboxFolder,
                    uid: 1,
                    unread: false,
                    answered: false
                }).then(function() {
                    expect(imapClientStub.updateFlags.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('#_imapMoveMessage', function() {
            it('should move a message to a destination folder', function(done) {
                imapClientStub.moveMessage.withArgs({
                    path: inboxFolder.path,
                    destination: sentFolder.path,
                    uid: 123
                }).returns(resolves());

                dao._imapMoveMessage({
                    folder: inboxFolder,
                    destination: sentFolder,
                    uid: 123
                }).then(done);
            });
        });

        describe('#_imapDeleteMessage', function() {
            var uid = 1337;

            it('should fail when disconnected', function(done) {
                dao._account.online = false;

                dao._imapDeleteMessage({}).catch(function(err) {
                    expect(err.code).to.equal(42);
                    done();
                });
            });

            it('should move to trash', function(done) {
                imapClientStub.moveMessage.withArgs({
                    path: inboxFolder.path,
                    uid: uid,
                    destination: trashFolder.path
                }).returns(resolves());

                dao._imapDeleteMessage({
                    folder: inboxFolder,
                    uid: uid
                }).then(done);
            });

            it('should purge message', function(done) {
                imapClientStub.deleteMessage.withArgs({
                    path: trashFolder.path,
                    uid: uid
                }).returns(resolves());

                dao._imapDeleteMessage({
                    folder: trashFolder,
                    uid: uid
                }).then(done);
            });
        });

        describe('#_imapListMessages', function() {
            var firstUid = 1337,
                lastUid = 1339;

            it('should list messages', function(done) {
                imapClientStub.listMessages.withArgs({
                    folder: inboxFolder,
                    path: inboxFolder.path,
                    firstUid: firstUid,
                    lastUid: lastUid
                }).returns(resolves([]));

                dao._imapListMessages({
                    folder: inboxFolder,
                    firstUid: firstUid,
                    lastUid: lastUid
                }).then(function(msgs) {
                    expect(msgs).to.exist;

                    expect(imapClientStub.listMessages.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when listMessages fails', function(done) {
                imapClientStub.listMessages.returns(rejects({}));

                dao._imapListMessages({
                    folder: inboxFolder,
                    firstUid: firstUid,
                    lastUid: lastUid
                }).catch(function(err) {
                    expect(err).to.exist;
                    expect(imapClientStub.listMessages.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when disconnected', function(done) {
                dao._account.online = false;

                dao._imapListMessages({}).catch(function(err) {
                    expect(err.code).to.equal(42);
                    done();
                });
            });
        });

        describe('#_imapUploadMessage', function() {
            it('should upload a message', function(done) {
                var msg = 'wow. such message. much rfc2822.';

                imapClientStub.uploadMessage.withArgs({
                    path: draftsFolder.path,
                    message: msg
                }).returns(resolves());

                dao._imapUploadMessage({
                    folder: draftsFolder,
                    message: msg
                }).then(function() {
                    expect(imapClientStub.uploadMessage.calledOnce).to.be.true;

                    done();
                });
            });
        });

        describe('#_getBodyParts', function() {
            it('should get bodyParts', function(done) {
                var bp = [{
                    type: 'text',
                    content: 'bender is great! bender is great!'
                }];

                imapClientStub.getBodyParts.withArgs({
                    folder: inboxFolder,
                    path: inboxFolder.path,
                    uid: 123,
                    bodyParts: bp
                }).returns(resolves(bp));
                parseStub.yieldsAsync(null, []);

                dao._getBodyParts({
                    folder: inboxFolder,
                    uid: 123,
                    bodyParts: bp
                }).then(function(parts) {
                    expect(parts).to.exist;

                    expect(imapClientStub.getBodyParts.calledOnce).to.be.true;
                    expect(parseStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when deleted on IMAP', function(done) {
                var bp = [{
                    type: 'text'
                }];

                imapClientStub.getBodyParts.withArgs({
                    folder: inboxFolder,
                    path: inboxFolder.path,
                    uid: 123,
                    bodyParts: bp
                }).returns(resolves());
                parseStub.yieldsAsync(null, []);

                dao._getBodyParts({
                    folder: inboxFolder,
                    uid: 123,
                    bodyParts: bp
                }).catch(function(err) {
                    expect(err).to.exist;

                    expect(imapClientStub.getBodyParts.calledOnce).to.be.true;
                    expect(parseStub.called).to.be.false;

                    done();
                });
            });

            it('should fail when getBody fails', function(done) {
                imapClientStub.getBodyParts.returns(rejects({}));

                dao._getBodyParts({
                    folder: inboxFolder,
                    uid: 123,
                    bodyParts: []
                }).catch(function(err) {
                    expect(err).to.exist;

                    expect(imapClientStub.getBodyParts.calledOnce).to.be.true;
                    expect(parseStub.called).to.be.false;

                    done();
                });
            });

            it('should fail when getBody fails', function(done) {
                imapClientStub.getBodyParts.returns(rejects({}));

                dao._getBodyParts({
                    folder: inboxFolder,
                    uid: 123,
                    bodyParts: []
                }).catch(function(err) {
                    expect(err).to.exist;

                    expect(imapClientStub.getBodyParts.calledOnce).to.be.true;
                    expect(parseStub.called).to.be.false;

                    done();
                });
            });

            it('should fail when disconnected', function(done) {
                dao._account.online = false;

                dao._getBodyParts({}).catch(function(err) {
                    expect(err.code).to.equal(42);
                    done();
                });
            });
        });

        describe('#_localListMessages', function() {
            var uid = 123;

            it('should list without uid', function(done) {
                devicestorageStub.listItems.withArgs('email_' + inboxFolder.path, 0, null).returns(resolves([{}]));

                dao._localListMessages({
                    folder: inboxFolder
                }).then(function(messages) {
                    expect(messages.length).to.exist;
                    done();
                });
            });

            it('should list with uid', function(done) {
                devicestorageStub.listItems.withArgs('email_' + inboxFolder.path + '_' + uid, 0, null).returns(resolves([{}]));

                dao._localListMessages({
                    folder: inboxFolder,
                    uid: uid
                }).then(function(messages) {
                    expect(messages.length).to.exist;
                    done();
                });
            });

        });

        describe('#_localStoreMessages', function() {
            it('should store messages', function(done) {
                devicestorageStub.storeList.withArgs([{}], 'email_' + inboxFolder.path).returns(resolves());

                dao._localStoreMessages({
                    folder: inboxFolder,
                    emails: [{}]
                }).then(done);
            });
        });

        describe('#_localDeleteMessage', function() {
            var uid = 1337;

            it('should delete message', function(done) {
                devicestorageStub.removeList.withArgs('email_' + inboxFolder.path + '_' + uid).returns(resolves());

                dao._localDeleteMessage({
                    folder: inboxFolder,
                    uid: uid
                }).then(done);
            });

            it('should fail when uid is missing', function(done) {
                dao._localDeleteMessage({
                    folder: inboxFolder
                }).catch(function(err) {
                    expect(err).to.exist;
                    done();
                });
            });

        });

        describe('#_uploadToSent', function() {
            it('should upload', function(done) {
                var msg = 'wow. such message. much rfc2822.';

                imapClientStub.uploadMessage.withArgs({
                    path: sentFolder.path,
                    message: msg
                }).returns(resolves());

                dao._uploadToSent({
                    message: msg
                }).then(function() {
                    expect(imapClientStub.uploadMessage.calledOnce).to.be.true;
                    done();
                });
            });
        });


        describe('#checkIgnoreUploadOnSent', function() {
            it('should ignore upload on gmail', function() {
                expect(dao.checkIgnoreUploadOnSent('bla.gmail.com')).to.be.true;
                expect(dao.checkIgnoreUploadOnSent('bla.googlemail.com')).to.be.true;
            });

            it('should not ignore upload on other domain', function() {
                expect(dao.checkIgnoreUploadOnSent('imap.foo.com')).to.be.false;
            });
        });
    });
});