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

    var dummyMail = {
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

    describe('Email DAO unit tests', function() {

        var emailDao, account,
            keychainStub, imapClientStub, smtpClientStub;

        beforeEach(function() {
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
                it('should fail due to back input', function(done) {
                    emailDao.smtpSend({}, function(err) {
                        expect(smtpClientStub.send.called).to.be.false;
                        expect(err).to.exist;
                        done();
                    });
                });

                it('should work', function(done) {
                    smtpClientStub.send.yields();
                    emailDao.smtpSend(dummyMail, function(err) {
                        expect(smtpClientStub.send.calledOnce).to.be.true;
                        expect(err).to.not.exist;
                        done();
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

            describe('IMAP: get message content from', function() {
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

                    imapClientStub.getMessage.yields(null, {
                        uid: uid
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
                    sinon.stub(newImapClientStub, 'getMessage', function(options, messageReady, attachmentReady) {
                        messageReady(null, {
                            uid: uid,
                            attachments: ['file.txt']
                        });
                        attachmentReady(null, {
                            uint8Array: new Uint8Array(42)
                        });
                    });
                    emailDao._imapClient = newImapClientStub;

                    emailDao.imapGetMessage({
                        folder: 'INBOX',
                        uid: uid
                    }, function(err, message) {
                        expect(newImapClientStub.getMessage.calledOnce).to.be.true;
                        expect(err).to.not.exist;
                        expect(message.uid).to.equal(uid);
                        expect(message.attachments[0].base64).to.exist;
                        emailDao._imapClient = imapClientStub;
                        done();
                    });
                });
            });
        });
    });

});