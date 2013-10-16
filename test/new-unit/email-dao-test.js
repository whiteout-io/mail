define(function(require) {
    'use strict';

    var KeychainDAO = require('js/dao/keychain-dao'),
        EmailDAO = require('js/dao/email-dao'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        SmtpClient = require('smtp-client'),
        ImapClient = require('imap-client'),
        PGP = require('js/crypto/pgp'),
        app = require('js/app-config'),
        expect = chai.expect;

    var emaildaoTest = {
        user: "whiteout.test@t-online.de",
        passphrase: 'asdf',
        asymKeySize: 512
    };

    var dummyMail;

    var publicKey = "-----BEGIN PUBLIC KEY-----\r\n" + "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCxy+Te5dyeWd7g0P+8LNO7fZDQ\r\n" + "g96xTb1J6pYE/pPTMlqhB6BRItIYjZ1US5q2vk5Zk/5KasBHAc9RbCqvh9v4XFEY\r\n" + "JVmTXC4p8ft1LYuNWIaDk+R3dyYXmRNct/JC4tks2+8fD3aOvpt0WNn3R75/FGBt\r\n" + "h4BgojAXDE+PRQtcVQIDAQAB\r\n" + "-----END PUBLIC KEY-----";

    describe('Email DAO unit tests', function() {

        var emailDao, account,
            keychainStub, imapClientStub, smtpClientStub, pgpStub, devicestorageStub;

        beforeEach(function() {
            // init dummy object
            dummyMail = {
                from: [{
                    name: 'Whiteout Test',
                    address: 'whiteout.test@t-online.de'
                }], // sender address
                to: [{
                    address: 'safewithme.testuser@gmail.com'
                }], // list of receivers
                subject: "Hello", // Subject line
                body: "Hello world" // plaintext body
            };

            account = {
                emailAddress: emaildaoTest.user,
                symKeySize: app.config.symKeySize,
                symIvSize: app.config.symIvSize,
                asymKeySize: emaildaoTest.asymKeySize
            };

            keychainStub = sinon.createStubInstance(KeychainDAO);
            imapClientStub = sinon.createStubInstance(ImapClient);
            smtpClientStub = sinon.createStubInstance(SmtpClient);
            pgpStub = sinon.createStubInstance(PGP);
            devicestorageStub = sinon.createStubInstance(DeviceStorageDAO);

            emailDao = new EmailDAO(keychainStub, imapClientStub, smtpClientStub, pgpStub, devicestorageStub);
        });

        afterEach(function() {});

        describe('init', function() {
            it('should fail due to error in getUserKeyPair', function(done) {
                devicestorageStub.init.yields();
                keychainStub.getUserKeyPair.yields(42);

                emailDao.init(account, emaildaoTest.passphrase, function(err) {
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(err).to.equal(42);
                    done();
                });
            });

            it('should init with new keygen', function(done) {
                devicestorageStub.init.yields();
                keychainStub.getUserKeyPair.yields();
                pgpStub.generateKeys.yields(null, {});
                pgpStub.importKeys.yields();
                keychainStub.putUserKeyPair.yields();

                emailDao.init(account, emaildaoTest.passphrase, function(err) {
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;
                    expect(pgpStub.generateKeys.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledOnce).to.be.true;
                    expect(keychainStub.putUserKeyPair.calledOnce).to.be.true;
                    expect(err).to.not.exist;
                    done();
                });
            });

            it('should init with stored keygen', function(done) {
                devicestorageStub.init.yields();
                keychainStub.getUserKeyPair.yields(null, {
                    publicKey: {
                        _id: 'keyId',
                        userId: emaildaoTest.user,
                        publicKey: 'publicKeyArmored'
                    },
                    privateKey: {
                        _id: 'keyId',
                        userId: emaildaoTest.user,
                        encryptedKey: 'privateKeyArmored'
                    }
                });
                pgpStub.importKeys.yields();

                emailDao.init(account, emaildaoTest.passphrase, function(err) {
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledOnce).to.be.true;
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        describe('login', function() {
            it('should fail due to error in imap login', function(done) {
                imapClientStub.login.yields(42);

                emailDao.imapLogin(function(err) {
                    expect(err).to.equal(42);
                    done();
                });
            });

            it('should work', function(done) {
                imapClientStub.login.yields();

                emailDao.imapLogin(function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        describe('IMAP/SMTP tests', function() {
            beforeEach(function(done) {
                devicestorageStub.init.yields();
                keychainStub.getUserKeyPair.yields();
                pgpStub.generateKeys.yields(null, {});
                pgpStub.importKeys.yields();
                keychainStub.putUserKeyPair.yields();

                emailDao.init(account, emaildaoTest.passphrase, function(err) {
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;
                    expect(pgpStub.generateKeys.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledOnce).to.be.true;
                    expect(keychainStub.putUserKeyPair.calledOnce).to.be.true;
                    expect(err).to.not.exist;
                    done();
                });
            });

            afterEach(function(done) {
                imapClientStub.logout.yields();
                emailDao.destroy(function(err) {
                    expect(imapClientStub.logout.calledOnce).to.be.true;
                    expect(err).to.not.exist;
                    done();
                });
            });

            describe('SMTP: send email', function() {
                it('should fail due to bad input', function(done) {
                    emailDao.smtpSend({}, function(err) {
                        expect(smtpClientStub.send.called).to.be.false;
                        expect(keychainStub.getReveiverPublicKey.called).to.be.false;
                        expect(err).to.exist;
                        done();
                    });
                });

                it('should fail due to invalid email address input', function(done) {
                    dummyMail.to = [{
                        address: 'asfd'
                    }];
                    emailDao.smtpSend(dummyMail, function(err) {
                        expect(smtpClientStub.send.called).to.be.false;
                        expect(keychainStub.getReveiverPublicKey.called).to.be.false;
                        expect(err).to.exist;
                        done();
                    });
                });

                it('should work for a new user', function(done) {
                    keychainStub.getReveiverPublicKey.yields(null, null);
                    smtpClientStub.send.yields();

                    emailDao.smtpSend(dummyMail, function(err) {
                        expect(keychainStub.getReveiverPublicKey.calledOnce).to.be.true;
                        // expect(smtpClientStub.send.called).to.be.true;
                        // smtpClientStub.send.calledWith(sinon.match(function(o) {
                        //     return typeof o.attachments === 'undefined';
                        // }));
                        expect(err).to.exist;
                        done();
                    });
                });

                it('should work without attachments', function(done) {
                    keychainStub.getReveiverPublicKey.yields(null, {
                        _id: "fcf8b4aa-5d09-4089-8b4f-e3bc5091daf3",
                        userId: "safewithme.testuser@gmail.com",
                        publicKey: publicKey
                    });
                    pgpStub.exportKeys.yields(null, {});
                    pgpStub.encrypt.yields(null, 'asdfasfd');
                    smtpClientStub.send.yields();

                    emailDao.smtpSend(dummyMail, function(err) {
                        expect(keychainStub.getReveiverPublicKey.calledOnce).to.be.true;
                        expect(pgpStub.exportKeys.calledOnce).to.be.true;
                        expect(pgpStub.encrypt.calledOnce).to.be.true;
                        expect(smtpClientStub.send.calledOnce).to.be.true;
                        smtpClientStub.send.calledWith(sinon.match(function(o) {
                            return typeof o.attachments === 'undefined';
                        }));
                        expect(err).to.not.exist;
                        done();
                    });
                });

                it('should work with attachments', function(done) {
                    dummyMail.attachments = [{
                        fileName: 'bar.txt',
                        contentType: 'text/plain',
                        binStr: 'barbarbarbarbar'
                    }];
                    keychainStub.getReveiverPublicKey.yields(null, {
                        _id: "fcf8b4aa-5d09-4089-8b4f-e3bc5091daf3",
                        userId: "safewithme.testuser@gmail.com",
                        publicKey: publicKey
                    });
                    pgpStub.exportKeys.yields(null, {});
                    pgpStub.encrypt.yields(null, 'asdfasfd');
                    smtpClientStub.send.yields();

                    emailDao.smtpSend(dummyMail, function(err) {
                        expect(keychainStub.getReveiverPublicKey.calledOnce).to.be.true;
                        expect(pgpStub.exportKeys.calledOnce).to.be.true;
                        expect(pgpStub.encrypt.calledOnce).to.be.true;
                        expect(smtpClientStub.send.calledOnce).to.be.true;
                        smtpClientStub.send.calledWith(sinon.match(function(o) {
                            var ptAt = dummyMail.attachments[0];
                            var ctAt = o.attachments[0];
                            return ctAt.uint8Array && !ctAt.binStr && ctAt.fileName && ctAt.fileName !== ptAt.fileName;
                        }));
                        expect(err).to.not.exist;
                        done();
                    });
                });
            });

            describe('IMAP: list folders', function() {
                var dummyFolders = [{
                    type: 'Inbox',
                    path: 'INBOX'
                }, {
                    type: 'Outbox',
                    path: 'OUTBOX'
                }];

                it('should work on empty local db', function(done) {
                    devicestorageStub.listItems.yields(null, [dummyFolders]);

                    emailDao.imapListFolders(function(err, folders) {
                        expect(err).to.not.exist;
                        expect(devicestorageStub.listItems.calledOnce).to.be.true;
                        expect(folders[0].type).to.equal('Inbox');
                        done();
                    });
                });

                it('should work with local cache', function(done) {
                    devicestorageStub.listItems.yields(null, []);
                    imapClientStub.listWellKnownFolders.yields(null, {
                        inbox: dummyFolders[0]
                    });
                    devicestorageStub.storeList.yields();

                    emailDao.imapListFolders(function(err, folders) {
                        expect(err).to.not.exist;
                        expect(devicestorageStub.listItems.calledOnce).to.be.true;
                        expect(imapClientStub.listWellKnownFolders.calledOnce).to.be.true;
                        expect(devicestorageStub.storeList.calledOnce).to.be.true;
                        expect(folders[0].type).to.equal('Inbox');
                        done();
                    });
                });
            });

            describe('IMAP: get unread message count for folder', function() {
                it('should work', function(done) {
                    imapClientStub.unreadMessages.yields();
                    emailDao.unreadMessages(function(err) {
                        expect(imapClientStub.unreadMessages.calledOnce).to.be.true;
                        expect(err).to.not.exist;
                        done();
                    });
                });
            });

            describe('IMAP: list messages from folder', function() {
                it('should work', function(done) {
                    imapClientStub.listMessages.yields();
                    emailDao.imapListMessages({
                        folder: 'INBOX',
                        offset: 0,
                        num: 10
                    }, function(err) {
                        expect(imapClientStub.listMessages.calledOnce).to.be.true;
                        expect(err).to.not.exist;
                        done();
                    });
                });
            });

            describe('IMAP: get message preview', function() {
                it('should parse message body without attachement', function(done) {
                    var uid = 415;

                    imapClientStub.getMessagePreview.yields(null, {
                        uid: uid,
                        body: ''
                    });
                    emailDao.imapGetMessage({
                        folder: 'INBOX',
                        uid: uid
                    }, function(err, message) {
                        expect(imapClientStub.getMessagePreview.calledOnce).to.be.true;
                        expect(err).to.not.exist;
                        expect(message.uid).to.equal(uid);
                        expect(message.attachments).to.not.exist;
                        done();
                    });
                });

                // it('should parse message body and attachement', function(done) {
                //     var uid = 415,
                //         newImapClientStub = {
                //             getMessage: function() {}
                //         };
                //     sinon.stub(newImapClientStub, 'getMessage', function(options) {
                //         options.onMessageBody(null, {
                //             uid: uid,
                //             body: '',
                //             attachments: ['file.txt']
                //         });
                //         options.onAttachment(null, {
                //             uint8Array: new Uint8Array(42)
                //         });
                //     });
                //     emailDao._imapClient = newImapClientStub;

                //     emailDao.imapGetMessage({
                //         folder: 'INBOX',
                //         uid: uid
                //     }, function(err, message) {
                //         expect(newImapClientStub.getMessagePreview.calledOnce).to.be.true;
                //         expect(err).to.not.exist;
                //         expect(message.uid).to.equal(uid);
                //         expect(message.attachments[0].uint8Array).to.exist;
                //         emailDao._imapClient = imapClientStub;
                //         done();
                //     });
                // });
            });

            describe('IMAP: move messages', function() {
                it('should move messages and remove from local storage', function(done) {
                    imapClientStub.moveMessage.yields();
                    devicestorageStub.removeList.yields();

                    emailDao.imapMoveMessage({
                        folder: 'ORIGIN',
                        uid: 1234,
                        destination: 'DESTINATION'
                    }, function(err) {
                        expect(err).to.not.exist;
                        expect(imapClientStub.moveMessage.calledWith({
                            path: 'ORIGIN',
                            uid: 1234,
                            destination: 'DESTINATION'
                        })).to.be.true;
                        expect(imapClientStub.moveMessage.calledOnce).to.be.true;
                        expect(devicestorageStub.removeList.calledOnce).to.be.true;
                        done();
                    });
                });

                it('should not remove from local storage after imap error', function(done) {
                    imapClientStub.moveMessage.yields(new Error('tis a silly place...'));

                    emailDao.imapMoveMessage({
                        folder: 'ORIGIN',
                        uid: 1234,
                        destination: 'DESTINATION'
                    }, function(err) {
                        expect(err).to.exist;
                        expect(imapClientStub.moveMessage.calledWith({
                            path: 'ORIGIN',
                            uid: 1234,
                            destination: 'DESTINATION'
                        })).to.be.true;
                        expect(imapClientStub.moveMessage.calledOnce).to.be.true;
                        done();
                    });
                });
            });

            describe('IMAP: delete messages', function() {
                it('should delete messages and remove from local storage', function(done) {
                    imapClientStub.deleteMessage.yields();
                    devicestorageStub.removeList.yields();

                    emailDao.imapDeleteMessage({
                        folder: 'FOLDAAAA',
                        uid: 1234
                    }, function(err) {
                        expect(err).to.not.exist;
                        expect(imapClientStub.deleteMessage.calledWith({
                            path: 'FOLDAAAA',
                            uid: 1234
                        })).to.be.true;
                        expect(imapClientStub.deleteMessage.calledOnce).to.be.true;
                        expect(devicestorageStub.removeList.calledOnce).to.be.true;
                        done();
                    });
                });

                it('should not remove from local storage after imap error', function(done) {
                    imapClientStub.deleteMessage.yields(new Error('tis a silly place...'));

                    emailDao.imapDeleteMessage({
                        folder: 'FOLDAAAA',
                        uid: 1234
                    }, function(err) {
                        expect(err).to.exist;
                        expect(imapClientStub.deleteMessage.calledWith({
                            path: 'FOLDAAAA',
                            uid: 1234
                        })).to.be.true;
                        expect(imapClientStub.deleteMessage.calledOnce).to.be.true;
                        done();
                    });
                });
            });

            describe('IMAP: sync messages to local storage', function() {
                it('should not list unencrypted messages', function(done) {
                    imapClientStub.listMessages.yields(null, [{
                        uid: 413,
                    }, {
                        uid: 414,
                    }]);
                    imapClientStub.getMessagePreview.yields(null, {
                        body: 'asdf'
                    });
                    devicestorageStub.removeList.yields();
                    devicestorageStub.storeList.yields();

                    emailDao.imapSync({
                        folder: 'INBOX',
                        offset: 0,
                        num: 2
                    }, function(err) {
                        expect(err).to.not.exist;
                        expect(imapClientStub.listMessages.calledOnce).to.be.true;
                        expect(imapClientStub.getMessagePreview.called).to.be.false;
                        expect(devicestorageStub.removeList.calledOnce).to.be.true;
                        expect(devicestorageStub.storeList.calledOnce).to.be.true;
                        done();
                    });
                });

                it('should work', function(done) {
                    imapClientStub.listMessages.yields(null, [{
                        uid: 413,
                        subject: app.string.subject
                    }, {
                        uid: 414,
                        subject: app.string.subject
                    }]);
                    imapClientStub.getMessagePreview.yields(null, {
                        body: 'asdf'
                    });
                    devicestorageStub.removeList.yields();
                    devicestorageStub.storeList.yields();

                    emailDao.imapSync({
                        folder: 'INBOX',
                        offset: 0,
                        num: 2
                    }, function(err) {
                        expect(err).to.not.exist;
                        expect(imapClientStub.listMessages.calledOnce).to.be.true;
                        expect(imapClientStub.getMessagePreview.calledTwice).to.be.true;
                        expect(devicestorageStub.removeList.calledOnce).to.be.true;
                        expect(devicestorageStub.storeList.calledOnce).to.be.true;
                        done();
                    });
                });
            });

            describe('IMAP: list messages from local storage', function() {
                it('should work', function(done) {
                    dummyMail.body = app.string.cryptPrefix + btoa('asdf') + app.string.cryptSuffix;
                    devicestorageStub.listItems.yields(null, [dummyMail, dummyMail]);
                    keychainStub.getReveiverPublicKey.yields(null, {
                        _id: "fcf8b4aa-5d09-4089-8b4f-e3bc5091daf3",
                        userId: "safewithme.testuser@gmail.com",
                        publicKey: publicKey
                    });
                    pgpStub.decrypt.yields(null, JSON.stringify({
                        body: 'test body',
                        subject: 'test subject'
                    }));

                    emailDao.listMessages({
                        folder: 'INBOX',
                        offset: 0,
                        num: 2
                    }, function(err, emails) {
                        expect(devicestorageStub.listItems.calledOnce).to.be.true;
                        expect(keychainStub.getReveiverPublicKey.calledTwice).to.be.true;
                        expect(pgpStub.decrypt.calledTwice).to.be.true;
                        expect(err).to.not.exist;
                        expect(emails.length).to.equal(2);
                        done();
                    });
                });
            });
        });

        describe('IMAP: mark message as read', function() {
            it('should work', function(done) {
                imapClientStub.updateFlags.yields();

                emailDao.imapMarkMessageRead({
                    folder: 'asdf',
                    uid: 1
                }, function(err) {
                    expect(imapClientStub.updateFlags.calledOnce).to.be.true;
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

    });

});