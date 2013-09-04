define(function(require) {
    'use strict';

    var controller = require('js/app-controller'),
        EmailDAO = require('js/dao/email-dao'),
        $ = require('jquery'),
        expect = chai.expect;

    var appControllerTest = {
        user: 'test@exmaple.com',
        passphrase: 'asdf'
    };

    describe('App Controller unit tests', function() {

        beforeEach(function() {
            sinon.stub(controller, 'login', function(userId, password, token, callback) {
                controller._emailDao = sinon.createStubInstance(EmailDAO);
                callback();
            });

            sinon.stub($, 'get');
            sinon.stub($, 'ajax').yieldsTo('success', {
                email: appControllerTest.user
            });

            window.chrome = window.chrome || {};
            window.chrome.identity = window.chrome.identity || {};
            if (typeof window.chrome.identity.getAuthToken !== 'function') {
                window.chrome.identity.getAuthToken = function() {};
            }
            sinon.stub(window.chrome.identity, 'getAuthToken');
            window.chrome.identity.getAuthToken.yields('token42');
        });

        afterEach(function() {
            controller.login.restore();
            $.get.restore();
            $.ajax.restore();
            window.chrome.identity.getAuthToken.restore();
        });

        describe('start', function() {
            it('should not explode', function(done) {
                controller.start(function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        describe('execute', function() {
            describe('login', function() {
                it('should work', function(done) {
                    controller.execute('login', {
                        password: appControllerTest.passphrase
                    }, function(resArgs) {
                        expect(resArgs.err).to.not.exist;
                        expect(resArgs.userId).to.equal(appControllerTest.user);
                        expect($.ajax.calledOnce).to.be.true;
                        expect(window.chrome.identity.getAuthToken.calledOnce).to.be.true;
                        done();
                    });
                });
            });

            describe('sendEmail', function() {
                it('should work', function(done) {
                    controller._emailDao.smtpSend.yields();
                    controller.execute('sendEmail', {
                        password: appControllerTest.passphrase
                    }, function(resArgs) {
                        expect(resArgs.err).to.not.exist;
                        expect(controller._emailDao.smtpSend.calledOnce).to.be.true;
                        done();
                    });
                });
            });

            describe('listFolders', function() {
                it('should work', function(done) {
                    controller._emailDao.imapListFolders.yields(null, ['inbox', 'sent']);
                    controller.execute('listFolders', {
                        password: appControllerTest.passphrase
                    }, function(resArgs) {
                        expect(resArgs.err).to.not.exist;
                        expect(resArgs.folders[1]).to.equal('sent');
                        expect(controller._emailDao.imapListFolders.calledOnce).to.be.true;
                        done();
                    });
                });
            });

            describe('listEmails', function() {
                it('should work', function(done) {
                    controller._emailDao.imapListMessages.yields(null, []);
                    controller.execute('listEmails', {
                        folder: 'INBOX',
                        offset: 0,
                        num: 10
                    }, function(resArgs) {
                        expect(resArgs.err).to.not.exist;
                        expect(resArgs.emails).to.a('Array');
                        expect(controller._emailDao.imapListMessages.calledOnce).to.be.true;
                        done();
                    });
                });
            });

            describe('getEmail', function() {
                it('should work', function(done) {
                    controller._emailDao.imapGetMessage.yields(null, {});
                    controller.execute('getEmail', {
                        folder: 'INBOX',
                        messageId: 415
                    }, function(resArgs) {
                        expect(resArgs.err).to.not.exist;
                        expect(resArgs.email).to.a('Object');
                        expect(controller._emailDao.imapGetMessage.calledOnce).to.be.true;
                        done();
                    });
                });
            });
        });

    });

});