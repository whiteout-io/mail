define(function(require) {
    'use strict';

    var appController = require('js/app-controller'),
        expect = chai.expect;

    var test = {
        user: "whiteout.test@gmail.com",
        passphrase: 'asdf'
    };

    describe('Email DAO integration tests', function() {
        this.timeout(5000);

        var offset = 0,
            num = 100,
            emailDao;

        beforeEach(function() {});

        afterEach(function() {});

        describe('login', function() {
            this.timeout(20000);

            it('should work', function(done) {
                appController.start(function(err) {
                    expect(err).to.not.exist;

                    appController.fetchOAuthToken(test.passphrase, function(err) {
                        expect(err).to.not.exist;
                        emailDao = appController._emailDao;

                        emailDao.imapLogin(function(err) {
                            expect(err).to.not.exist;
                            done();
                        });
                    });
                });
            });
        });

        describe('IMAP sync INBOX messages', function() {
            it('should work', function(done) {
                emailDao.imapSync({
                    folder: 'INBOX',
                    offset: -num,
                    num: offset
                }, function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        describe('IMAP list INBOX messages', function() {
            it('should work', function(done) {
                emailDao.listMessages({
                    folder: 'INBOX',
                    offset: offset,
                    num: num
                }, function(err, emails) {
                    expect(err).to.not.exist;
                    expect(emails).to.exist;
                    expect(emails.length).to.be.at.least(1);
                    done();
                });
            });
        });

        describe('IMAP sync SENT messages', function() {
            it('should work', function(done) {
                emailDao.imapSync({
                    folder: '[Gmail]/Gesendet',
                    offset: -num,
                    num: offset
                }, function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        describe('IMAP list SENT messages', function() {
            it('should work', function(done) {
                emailDao.listMessages({
                    folder: '[Gmail]/Gesendet',
                    offset: offset,
                    num: num
                }, function(err, emails) {
                    expect(err).to.not.exist;
                    expect(emails).to.exist;
                    expect(emails.length).to.be.at.least(0);
                    done();
                });
            });
        });

    });
});