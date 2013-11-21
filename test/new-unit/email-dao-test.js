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

    var dummyMail, verificationMail, plaintextMail;

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
                subject: "[whiteout] Hello", // Subject line
                body: "Hello world" // plaintext body
            }, verificationMail = {
                from: [{
                    name: 'Whiteout Test',
                    address: 'whiteout.test@t-online.de'
                }], // sender address
                to: [{
                    address: 'safewithme.testuser@gmail.com'
                }], // list of receivers
                subject: "[whiteout] New public key uploaded", // Subject line
                body: "https://keys.whiteout.io/verify/OMFG_FUCKING_BASTARD_UUID_FROM_HELL!", // plaintext body
                unread: true
            }, plaintextMail = {
                from: [{
                    name: 'Whiteout Test',
                    address: 'whiteout.test@t-online.de'
                }], // sender address
                to: [{
                    address: 'safewithme.testuser@gmail.com'
                }], // list of receivers
                subject: "OMG SO PLAIN TEXT", // Subject line
                body: "yo dawg, we be all plaintext and stuff...", // plaintext body
                unread: true
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
            emailDao._account = account;
        });

        afterEach(function() {});

        describe('init', function() {
            beforeEach(function() {
                delete emailDao._account;
            });

            it('should fail due to error in getUserKeyPair', function(done) {
                devicestorageStub.init.yields();
                keychainStub.getUserKeyPair.yields(42);

                emailDao.init(account, function(err) {
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(err).to.equal(42);
                    done();
                });
            });

            it('should init', function(done) {
                var mockKeyPair = {};

                devicestorageStub.init.yields();
                keychainStub.getUserKeyPair.yields(null, mockKeyPair);

                emailDao.init(account, function(err, keyPair) {
                    expect(err).to.not.exist;

                    expect(keyPair === mockKeyPair).to.be.true;
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;

                    done();
                });
            });
        });

        describe('unlock', function() {
            it('should unlock with new key', function(done) {
                pgpStub.generateKeys.yields(null, {});
                pgpStub.importKeys.yields();
                keychainStub.putUserKeyPair.yields();

                emailDao.unlock({}, emaildaoTest.passphrase, function(err) {
                    expect(err).to.not.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledOnce).to.be.true;
                    expect(keychainStub.putUserKeyPair.calledOnce).to.be.true;
                    expect(pgpStub.generateKeys.calledWith({
                        emailAddress: account.emailAddress,
                        keySize: account.asymKeySize,
                        passphrase: emaildaoTest.passphrase
                    })).to.be.true;

                    done();
                });
            });

            it('should unlock with existing key pair', function(done) {
                pgpStub.importKeys.yields();

                emailDao.unlock({
                    privateKey: {
                        encryptedKey: 'cryptocrypto'
                    },
                    publicKey: {
                        publicKey: 'omgsocrypto'
                    }
                }, emaildaoTest.passphrase, function(err) {
                    expect(err).to.not.exist;

                    expect(pgpStub.importKeys.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledWith({
                        passphrase: emaildaoTest.passphrase,
                        privateKeyArmored: 'cryptocrypto',
                        publicKeyArmored: 'omgsocrypto'
                    })).to.be.true;

                    done();
                });
            });

            it('should not unlock with error during keygen', function(done) {
                pgpStub.generateKeys.yields(new Error('fubar'));

                emailDao.unlock({}, emaildaoTest.passphrase, function(err) {
                    expect(err).to.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;

                    done();
                });
            });

            it('should not unloch with error during key import', function(done) {
                pgpStub.generateKeys.yields(null, {});
                pgpStub.importKeys.yields(new Error('fubar'));

                emailDao.unlock({}, emaildaoTest.passphrase, function(err) {
                    expect(err).to.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledOnce).to.be.true;

                    done();
                });
            });

            it('should not unlock with error during key store', function(done) {
                pgpStub.generateKeys.yields(null, {});
                pgpStub.importKeys.yields();
                keychainStub.putUserKeyPair.yields(new Error('omgwtf'));

                emailDao.unlock({}, emaildaoTest.passphrase, function(err) {
                    expect(err).to.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledOnce).to.be.true;
                    expect(keychainStub.putUserKeyPair.calledOnce).to.be.true;

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

                emailDao.init(account, function(err, keyPair) {
                    emailDao.unlock(keyPair, emaildaoTest.passphrase, function(err) {
                        expect(devicestorageStub.init.calledOnce).to.be.true;
                        expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;
                        expect(pgpStub.generateKeys.calledOnce).to.be.true;
                        expect(pgpStub.importKeys.calledOnce).to.be.true;
                        expect(keychainStub.putUserKeyPair.calledOnce).to.be.true;
                        expect(err).to.not.exist;
                        done();
                    });
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
                    emailDao.encryptedSend({}, function(err) {
                        expect(smtpClientStub.send.called).to.be.false;
                        expect(keychainStub.getReceiverPublicKey.called).to.be.false;
                        expect(err).to.exist;
                        done();
                    });
                });

                it('should fail due to invalid email address input', function(done) {
                    dummyMail.to = [{
                        address: 'asfd'
                    }];
                    emailDao.encryptedSend(dummyMail, function(err) {
                        expect(smtpClientStub.send.called).to.be.false;
                        expect(keychainStub.getReceiverPublicKey.called).to.be.false;
                        expect(err).to.exist;
                        done();
                    });
                });

                it('should work for a new user', function(done) {
                    keychainStub.getReceiverPublicKey.yields(null, null);
                    smtpClientStub.send.yields();

                    emailDao.encryptedSend(dummyMail, function(err) {
                        expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                        // expect(smtpClientStub.send.called).to.be.true;
                        // smtpClientStub.send.calledWith(sinon.match(function(o) {
                        //     return typeof o.attachments === 'undefined';
                        // }));
                        expect(err).to.exist;
                        done();
                    });
                });

                it('should work without attachments', function(done) {
                    keychainStub.getReceiverPublicKey.yields(null, {
                        _id: "fcf8b4aa-5d09-4089-8b4f-e3bc5091daf3",
                        userId: "safewithme.testuser@gmail.com",
                        publicKey: publicKey
                    });
                    pgpStub.exportKeys.yields(null, {});
                    pgpStub.encrypt.yields(null, 'asdfasfd');
                    smtpClientStub.send.yields();

                    emailDao.encryptedSend(dummyMail, function(err) {
                        expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                        expect(pgpStub.exportKeys.calledOnce).to.be.true;
                        expect(pgpStub.encrypt.calledOnce).to.be.true;
                        expect(smtpClientStub.send.calledOnce).to.be.true;
                        expect(smtpClientStub.send.calledWith(sinon.match(function(o) {
                            return typeof o.attachments === 'undefined';
                        }))).to.be.true;
                        expect(err).to.not.exist;
                        done();
                    });
                });

                // it('should work with attachments', function(done) {
                //     dummyMail.attachments = [{
                //         fileName: 'bar.txt',
                //         contentType: 'text/plain',
                //         binStr: 'barbarbarbarbar'
                //     }];
                //     keychainStub.getReceiverPublicKey.yields(null, {
                //         _id: "fcf8b4aa-5d09-4089-8b4f-e3bc5091daf3",
                //         userId: "safewithme.testuser@gmail.com",
                //         publicKey: publicKey
                //     });
                //     pgpStub.exportKeys.yields(null, {});
                //     pgpStub.encrypt.yields(null, 'asdfasfd');
                //     smtpClientStub.send.yields();

                //     emailDao.encryptedSend(dummyMail, function(err) {
                //         expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                //         expect(pgpStub.exportKeys.calledOnce).to.be.true;
                //         expect(pgpStub.encrypt.calledOnce).to.be.true;
                //         expect(smtpClientStub.send.calledOnce).to.be.true;
                //         expect(smtpClientStub.send.calledWith(sinon.match(function(o) {
                //             var ptAt = dummyMail.attachments[0];
                //             var ctAt = o.attachments[0];
                //             return ctAt.uint8Array && !ctAt.binStr && ctAt.fileName && ctAt.fileName !== ptAt.fileName;
                //         }))).to.be.true;
                //         expect(err).to.not.exist;
                //         done();
                //     });
                // });
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
                        subject: ''
                    }, {
                        uid: 414,
                        subject: ''
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
                        subject: app.string.subjectPrefix + 'asd'
                    }, {
                        uid: 414,
                        subject: app.string.subjectPrefix + 'asd'
                    }]);
                    imapClientStub.getMessagePreview.yields(null, {
                        body: app.string.cryptPrefix + '\nasdf\n' + app.string.cryptSuffix
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
                it('should fail for empty public key', function(done) {
                    dummyMail.body = app.string.cryptPrefix + btoa('asdf') + app.string.cryptSuffix;
                    devicestorageStub.listItems.yields(null, [dummyMail]);
                    keychainStub.getReceiverPublicKey.yields();

                    emailDao.listMessages({
                        folder: 'INBOX',
                        offset: 0,
                        num: 1
                    }, function(err, emails) {
                        expect(err).to.exist;
                        expect(emails).to.not.exist;
                        expect(devicestorageStub.listItems.calledOnce).to.be.true;
                        expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                        done();
                    });
                });

                it('should work', function(done) {
                    dummyMail.body = app.string.cryptPrefix + btoa('asdf') + app.string.cryptSuffix;
                    devicestorageStub.listItems.yields(null, [dummyMail]);
                    keychainStub.getReceiverPublicKey.yields(null, {
                        _id: "fcf8b4aa-5d09-4089-8b4f-e3bc5091daf3",
                        userId: "safewithme.testuser@gmail.com",
                        publicKey: publicKey
                    });
                    pgpStub.decrypt.yields(null, 'test body');

                    emailDao.listMessages({
                        folder: 'INBOX',
                        offset: 0,
                        num: 1
                    }, function(err, emails) {
                        expect(err).to.not.exist;
                        expect(devicestorageStub.listItems.calledOnce).to.be.true;
                        expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                        expect(pgpStub.decrypt.calledOnce).to.be.true;
                        expect(emails.length).to.equal(1);
                        done();
                    });
                });
            });

            describe('Plain text', function() {
                it('should display plaintext mails with [whiteout] prefix', function(done) {
                    devicestorageStub.listItems.yields(null, [plaintextMail]);

                    emailDao.listMessages({
                        folder: 'INBOX',
                        offset: 0,
                        num: 1
                    }, function(err, emails) {
                        expect(err).to.not.exist;
                        expect(emails.length).to.equal(1);
                        expect(devicestorageStub.listItems.calledOnce).to.be.true;
                        done();
                    });
                });
            });

            describe('Verification', function() {
                it('should verify pending public keys', function(done) {
                    devicestorageStub.listItems.yields(null, [verificationMail]);
                    keychainStub.verifyPublicKey.yields();
                    imapClientStub.updateFlags.yields();
                    imapClientStub.deleteMessage.yields();
                    devicestorageStub.removeList.yields();

                    emailDao.listMessages({
                        folder: 'INBOX',
                        offset: 0,
                        num: 1
                    }, function(err, emails) {
                        expect(err).to.not.exist;
                        expect(emails.length).to.equal(0);
                        expect(devicestorageStub.listItems.calledOnce).to.be.true;
                        expect(keychainStub.verifyPublicKey.calledOnce).to.be.true;
                        expect(imapClientStub.updateFlags.calledOnce).to.be.true;
                        expect(imapClientStub.deleteMessage.calledOnce).to.be.true;
                        expect(devicestorageStub.removeList.calledOnce).to.be.true;
                        done();
                    });
                });

                it('should not verify pending public keys if the mail was read', function(done) {
                    verificationMail.unread = false;
                    devicestorageStub.listItems.yields(null, [verificationMail]);

                    emailDao.listMessages({
                        folder: 'INBOX',
                        offset: 0,
                        num: 1
                    }, function(err) {
                        expect(err).to.not.exist;
                        expect(devicestorageStub.listItems.calledOnce).to.be.true;
                        verificationMail.unread = true;
                        done();
                    });
                });

                it('should not verify pending public keys if the mail contains erroneous links', function(done) {
                    var properBody = verificationMail.body;
                    verificationMail.body = 'UGA UGA!';
                    devicestorageStub.listItems.yields(null, [verificationMail]);

                    emailDao.listMessages({
                        folder: 'INBOX',
                        offset: 0,
                        num: 1
                    }, function(err) {
                        expect(err).to.not.exist;
                        expect(devicestorageStub.listItems.calledOnce).to.be.true;
                        verificationMail.body = properBody;
                        done();
                    });
                });

                it('should not mark verification mails read if verification fails', function(done) {
                    devicestorageStub.listItems.yields(null, [verificationMail]);
                    keychainStub.verifyPublicKey.yields({
                        errMsg: 'snafu.'
                    });

                    emailDao.listMessages({
                        folder: 'INBOX',
                        offset: 0,
                        num: 1
                    }, function(err) {
                        expect(err).to.exist;
                        expect(devicestorageStub.listItems.calledOnce).to.be.true;
                        expect(keychainStub.verifyPublicKey.calledOnce).to.be.true;
                        done();
                    });
                });
                it('should not delete verification mails read if marking read fails', function(done) {
                    devicestorageStub.listItems.yields(null, [verificationMail]);
                    keychainStub.verifyPublicKey.yields();
                    imapClientStub.updateFlags.yields({
                        errMsg: 'snafu.'
                    });

                    emailDao.listMessages({
                        folder: 'INBOX',
                        offset: 0,
                        num: 1
                    }, function(err) {
                        expect(err).to.not.exist;
                        expect(devicestorageStub.listItems.calledOnce).to.be.true;
                        expect(keychainStub.verifyPublicKey.calledOnce).to.be.true;
                        expect(imapClientStub.updateFlags.calledOnce).to.be.true;
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

        describe('IMAP: mark message as answered', function() {
            it('should work', function(done) {
                imapClientStub.updateFlags.yields();

                emailDao.imapMarkAnswered({
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