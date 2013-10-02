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
            it('should work', function(done) {
                appController.fetchOAuthToken(test.passphrase, function(err, userId) {
                    expect(err).to.not.exist;
                    expect(userId).to.exist;
                    emailDao = appController._emailDao;

                    emailDao.imapLogin(function(err) {
                        expect(err).to.not.exist;
                        done();
                    });
                });
            });
        });

        describe('IMAP sync messages', function() {
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

        describe('IMAP sync messages', function() {
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

    });
});