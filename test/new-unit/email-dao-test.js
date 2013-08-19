define(function(require) {
    'use strict';

    var KeychainDAO = require('js/dao/keychain-dao'),
        EmailDAO = require('js/dao/email-dao'),
        SmtpClient = require('SmtpClient'),
        ImapClient = require('ImapClient'),
        Account = require('js/model/account-model'),
        app = require('js/app-config'),
        expect = chai.expect;

    var emaildaoTest = {
        user: "whiteout.test@t-online.de",
        passphrase: 'asdf',
        asymKeySize: 512
    };

    describe('Email DAO unit tests', function() {

        var emailDao, account,
            keychainStub, imapClientStub, smtpClientStub;

        beforeEach(function() {
            account = new Account({
                emailAddress: emaildaoTest.user,
                symKeySize: app.config.symKeySize,
                symIvSize: app.config.symIvSize,
                asymKeySize: emaildaoTest.asymKeySize
            });

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

            it('should initialize', function(done) {
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

    });

});