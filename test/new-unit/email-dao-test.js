define(function(require) {
    'use strict';

    var KeychainDAO = require('js/dao/keychain-dao'),
        EmailDAO = require('js/dao/email-dao'),
        SmtpClient = require('SmtpClient'),
        ImapClient = require('ImapClient'),
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
            keychainStub, imapClientStub, smtpClientStub;

        beforeEach(function() {
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

            emailDao = new EmailDAO(keychainStub, imapClientStub, smtpClientStub);
        });

        afterEach(function() {});

        describe('init', function() {
            it('should fail due to error in imap login', function(done) {
                imapClientStub.login.yields(42);

                emailDao.init(account, emaildaoTest.passphrase, function(err) {
                    expect(err).to.equal(42);
                    done();
                });
            });

            it('should fail due to error in getUserKeyPair', function(done) {
                imapClientStub.login.yields();
                keychainStub.getUserKeyPair.yields(42);

                emailDao.init(account, emaildaoTest.passphrase, function(err) {
                    expect(imapClientStub.login.calledOnce).to.be.true;
                    expect(err).to.equal(42);
                    done();
                });
            });

            it('should init with new keygen', function(done) {
                imapClientStub.login.yields();
                keychainStub.getUserKeyPair.yields();
                keychainStub.putUserKeyPair.yields();

                emailDao.init(account, emaildaoTest.passphrase, function(err) {
                    expect(imapClientStub.login.calledOnce).to.be.true;
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;
                    expect(keychainStub.putUserKeyPair.calledOnce).to.be.true;
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        describe('IMAP/SMTP tests', function() {
            beforeEach(function(done) {
                imapClientStub.login.yields();
                keychainStub.getUserKeyPair.yields();
                keychainStub.putUserKeyPair.yields();

                emailDao.init(account, emaildaoTest.passphrase, function(err) {
                    expect(imapClientStub.login.calledOnce).to.be.true;
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;
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

                it('should work without attachments', function(done) {
                    keychainStub.getReveiverPublicKey.yields(null, {
                        _id: "fcf8b4aa-5d09-4089-8b4f-e3bc5091daf3",
                        userId: "safewithme.testuser@gmail.com",
                        publicKey: publicKey
                    });
                    smtpClientStub.send.yields();

                    emailDao.smtpSend(dummyMail, function(err) {
                        expect(keychainStub.getReveiverPublicKey.calledOnce).to.be.true;
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
                    smtpClientStub.send.yields();

                    emailDao.smtpSend(dummyMail, function(err) {
                        expect(keychainStub.getReveiverPublicKey.calledOnce).to.be.true;
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

            describe('IMAP Caching', function() {
                describe('write cache', function() {
                    it('should work if cache is empty', function() {
                        expect(emailDao._account.folders).to.not.exist;
                        emailDao.cacheItem('INBOX', {
                            uid: 42
                        });
                        expect(emailDao._account.folders.INBOX[42]).to.exist;
                    });

                    it('should work if cache is not empty', function() {
                        expect(emailDao._account.folders).to.not.exist;
                        emailDao.cacheItem('INBOX', {
                            uid: 42
                        });
                        emailDao.cacheItem('INBOX', {
                            uid: 43
                        });
                        expect(emailDao._account.folders.INBOX[42]).to.exist;
                        expect(emailDao._account.folders.INBOX[43]).to.exist;
                    });
                });

                describe('read cache', function() {
                    it('should work if cache is empty', function() {
                        expect(emailDao._account.folders).to.not.exist;
                        var item = emailDao.readCache('INBOX', 42);
                        expect(item).to.not.exist;
                    });

                    it('should work if cache is not empty', function() {
                        expect(emailDao._account.folders).to.not.exist;
                        emailDao.cacheItem('INBOX', {
                            uid: 42
                        });
                        expect(emailDao._account.folders.INBOX[42]).to.exist;

                        var item = emailDao.readCache('INBOX', 42);
                        expect(item.uid).to.equal(42);
                    });
                });
            });

            describe('IMAP: list folders', function() {
                it('should work', function(done) {
                    imapClientStub.listFolders.yields();
                    emailDao.imapListFolders(function(err) {
                        expect(imapClientStub.listFolders.calledOnce).to.be.true;
                        expect(err).to.not.exist;
                        done();
                    });
                });
            });

            describe('IMAP: list messages from folder', function() {
                it('should fail due to bad options', function(done) {
                    emailDao.imapListMessages({}, function(err) {
                        expect(imapClientStub.listMessages.called).to.be.false;
                        expect(err).to.exist;
                        done();
                    });
                });

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

            describe('IMAP: get message content', function() {
                it('should fail due to bad options', function(done) {
                    emailDao.imapGetMessage({
                        folder: 'INBOX'
                    }, function(err) {
                        expect(imapClientStub.getMessage.called).to.be.false;
                        expect(err).to.exist;
                        done();
                    });
                });

                it('should parse message body without attachement', function(done) {
                    var uid = 415;

                    imapClientStub.getMessage.yieldsTo('onMessageBody', null, {
                        uid: uid,
                        body: ''
                    });
                    emailDao.imapGetMessage({
                        folder: 'INBOX',
                        uid: uid
                    }, function(err, message) {
                        expect(imapClientStub.getMessage.calledOnce).to.be.true;
                        expect(err).to.not.exist;
                        expect(message.uid).to.equal(uid);
                        expect(message.attachments).to.not.exist;
                        done();
                    });
                });

                it('should parse message body and attachement', function(done) {
                    var uid = 415,
                        newImapClientStub = {
                            getMessage: function() {}
                        };
                    sinon.stub(newImapClientStub, 'getMessage', function(options) {
                        options.onMessageBody(null, {
                            uid: uid,
                            body: '',
                            attachments: ['file.txt']
                        });
                        // options.onAttachment(null, {
                        //     uint8Array: new Uint8Array(42)
                        // });
                    });
                    emailDao._imapClient = newImapClientStub;

                    emailDao.imapGetMessage({
                        folder: 'INBOX',
                        uid: uid
                    }, function(err, message) {
                        expect(newImapClientStub.getMessage.calledOnce).to.be.true;
                        expect(err).to.not.exist;
                        expect(message.uid).to.equal(uid);
                        //expect(message.attachments[0].uint8Array).to.exist;
                        emailDao._imapClient = imapClientStub;
                        done();
                    });
                });
            });
        });
    });

});