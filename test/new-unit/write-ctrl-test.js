define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        WriteCtrl = require('js/controller/write'),
        EmailDAO = require('js/dao/email-dao'),
        OutboxBO = require('js/bo/outbox'),
        KeychainDAO = require('js/dao/keychain-dao'),
        appController = require('js/app-controller');

    describe('Write controller unit test', function() {
        var ctrl, scope,
            origEmailDao, origOutbox,
            emailDaoMock, keychainMock, outboxMock, emailAddress;

        beforeEach(function() {
            // the app controller is a singleton, we need to remember the
            // outbox and email dao to restore it after the tests
            origEmailDao = appController._emailDao;
            origOutbox = appController._outboxBo;

            outboxMock = sinon.createStubInstance(OutboxBO);
            appController._outboxBo = outboxMock;

            emailDaoMock = sinon.createStubInstance(EmailDAO);
            appController._emailDao = emailDaoMock;

            emailAddress = 'fred@foo.com';
            emailDaoMock._account = {
                emailAddress: emailAddress,
            };

            keychainMock = sinon.createStubInstance(KeychainDAO);
            emailDaoMock._keychain = keychainMock;

            angular.module('writetest', []);
            mocks.module('writetest');
            mocks.inject(function($rootScope, $controller) {
                scope = $rootScope.$new();
                scope.state = {};
                ctrl = $controller(WriteCtrl, {
                    $scope: scope
                });
            });
        });

        afterEach(function() {
            // restore the app controller
            appController._emailDao = origEmailDao;
            appController._outboxBo = origOutbox;
        });

        describe('scope variables', function() {
            it('should be set correctly', function() {
                expect(scope.state.writer).to.exist;
                expect(scope.state.writer.open).to.be.false;
                expect(scope.state.writer.write).to.exist;
                expect(scope.state.writer.close).to.exist;
                expect(scope.verify).to.exist;
                expect(scope.onAddressUpdate).to.exist;
                expect(scope.checkSendStatus).to.exist;
                expect(scope.updatePreview).to.exist;
                expect(scope.sendToOutbox).to.exist;
            });
        });

        describe('close', function() {
            it('should close the writer', function() {
                scope.state.writer.open = true;

                scope.state.writer.close();

                expect(scope.state.writer.open).to.be.false;
            });
        });

        describe('write', function() {
            it('should prepare write view', function() {
                var verifyMock = sinon.stub(scope, 'verify');

                scope.state.writer.write();

                expect(scope.writerTitle).to.equal('New email');
                expect(scope.to).to.deep.equal([{
                    address: ''
                }]);
                expect(scope.subject).to.equal('');
                expect(scope.body).to.equal('');
                expect(scope.ciphertextPreview).to.equal('');
                expect(verifyMock.calledOnce).to.be.true;

                scope.verify.restore();
            });

            it('should prefill write view for response', function() {
                var verifyMock = sinon.stub(scope, 'verify'),
                    address = 'pity@dafool',
                    subject = 'Ermahgerd!',
                    body = 'so much body!',
                    re = {
                        from: [{
                            address: address
                        }],
                        subject: subject,
                        sentDate: new Date(),
                        body: body
                    };

                scope.state.writer.write(re);

                expect(scope.writerTitle).to.equal('Reply');
                expect(scope.to).to.deep.equal([{
                    address: address,
                }, {
                    address: ''
                }]);
                expect(scope.subject).to.equal('Re: ' + subject);
                expect(scope.body).to.contain(body);
                expect(scope.ciphertextPreview).to.not.be.empty;
                expect(verifyMock.calledOnce).to.be.true;

                scope.verify.restore();
            });

        });

        describe('onAddressUpdate', function() {
            var verifyMock;

            beforeEach(function() {
                verifyMock = sinon.stub(scope, 'verify');
            });

            afterEach(function() {
                scope.verify.restore();
            });

            it('should do nothing for normal address', function() {
                var to = [{
                    address: 'asdf@asdf.de'
                }];
                scope.onAddressUpdate(to, 0);

                expect(to.length).to.equal(1);
                expect(to[0].address).to.equal('asdf@asdf.de');
                expect(verifyMock.calledOnce).to.be.true;
            });
        });

        describe('verify', function() {
            var checkSendStatusMock;

            beforeEach(function() {
                checkSendStatusMock = sinon.stub(scope, 'checkSendStatus');
            });

            afterEach(function() {
                scope.checkSendStatus.restore();
            });

            it('should not work for invalid email addresses', function() {
                var recipient = {
                    address: ''
                };

                scope.verify(recipient);

                expect(recipient.key).to.be.undefined;
                expect(recipient.secure).to.be.undefined;
                expect(scope.checkSendStatus.calledOnce).to.be.true;
                expect(keychainMock.getReceiverPublicKey.called).to.be.false;
            });

            it('should not work for error in keychain', function(done) {
                var recipient = {
                    address: 'asds@example.com'
                };

                keychainMock.getReceiverPublicKey.withArgs(recipient.address).yields({
                    errMsg: '404 not found yadda yadda'
                });
                scope.onError = function() {
                    expect(recipient.key).to.be.undefined;
                    expect(recipient.secure).to.be.false;
                    expect(scope.checkSendStatus.called).to.be.false;
                    expect(keychainMock.getReceiverPublicKey.calledOnce).to.be.true;
                    done();
                };

                scope.verify(recipient);
            });

            it('should work', function(done) {
                var recipient = {
                    address: 'asdf@example.com'
                };

                keychainMock.getReceiverPublicKey.yields(null, {
                    userId: 'asdf@example.com'
                });
                scope.$apply = function() {
                    expect(recipient.key).to.deep.equal({
                        userId: 'asdf@example.com'
                    });
                    expect(recipient.secure).to.be.true;
                    expect(scope.checkSendStatus.calledOnce).to.be.true;
                    expect(keychainMock.getReceiverPublicKey.calledOnce).to.be.true;
                    done();
                };

                scope.verify(recipient);
            });
        });

        describe('checkSendStatus', function() {
            beforeEach(function() {
                scope.state.writer.write();
            });

            afterEach(function() {});

            it('should not be able to send with no recipients', function() {
                scope.checkSendStatus();

                expect(scope.okToSend).to.be.false;
                expect(scope.sendBtnText).to.be.undefined;
                expect(scope.sendBtnSecure).to.be.undefined;
            });

            it('should not be to invite 1 user', function() {
                scope.to = [{
                    address: 'asdf@asdf.de'
                }];
                scope.checkSendStatus();

                expect(scope.okToSend).to.be.true;
                expect(scope.sendBtnText).to.equal('Invite & send securely');
                expect(scope.sendBtnSecure).to.be.false;
            });

            it('should not be able to invite multiple recipients', function() {
                scope.to = [{
                    address: 'asdf@asdf.de'
                }, {
                    address: 'asdf@asdfg.de'
                }];
                scope.checkSendStatus();

                expect(scope.okToSend).to.be.false;
                expect(scope.sendBtnText).to.be.undefined;
                expect(scope.sendBtnSecure).to.be.undefined;
            });

            it('should be able to send securely to multiple recipients', function() {
                scope.to = [{
                    address: 'asdf@asdf.de',
                    secure: true
                }, {
                    address: 'asdf@asdfg.de',
                    secure: true
                }];
                scope.checkSendStatus();

                expect(scope.okToSend).to.be.true;
                expect(scope.sendBtnText).to.equal('Send securely');
                expect(scope.sendBtnSecure).to.be.true;
            });
        });

        describe('send to outbox', function() {
            it('should work', function() {
                scope.from = [{
                    address: 'pity@dafool'
                }];
                scope.to = [{
                    address: 'pity@dafool'
                }];
                scope.cc = [];
                scope.bcc = [];
                scope.subject = 'Ermahgerd!';
                scope.body = 'wow. much body! very text!';
                scope.attachments = [];
                scope.state.nav = {
                    currentFolder: 'currentFolder'
                };

                scope.replyTo = {};

                outboxMock.put.yields();
                emailDaoMock.sync.yields();

                scope.onError = function(err) {
                    expect(err).to.not.exist;
                };

                scope.sendToOutbox();

                expect(outboxMock.put.calledOnce).to.be.true;
                expect(emailDaoMock.sync.calledOnce).to.be.true;

                expect(scope.state.writer.open).to.be.false;
                expect(scope.replyTo.answered).to.be.true;
            });
        });
    });
});