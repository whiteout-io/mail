define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        WriteCtrl = require('js/controller/write'),
        EmailDAO = require('js/dao/email-dao'),
        KeychainDAO = require('js/dao/keychain-dao'),
        appController = require('js/app-controller');

    describe('Write controller unit test', function() {
        var ctrl, scope, origEmailDao, emailDaoMock, keychainMock, emailAddress;

        beforeEach(function() {
            origEmailDao = appController._emailDao;
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
            // restore the module
            appController._emailDao = origEmailDao;
        });

        describe('scope variables', function() {
            it('should be set correctly', function() {
                expect(scope.state.writer).to.exist;
                expect(scope.state.writer.open).to.be.false;
                expect(scope.state.writer.write).to.exist;
                expect(scope.state.writer.close).to.exist;
                expect(scope.verifyTo).to.exist;
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
                var verifyToMock = sinon.stub(scope, 'verifyTo');

                scope.state.writer.write();

                expect(scope.writerTitle).to.equal('New email');
                expect(scope.to).to.equal('');
                expect(scope.subject).to.equal('');
                expect(scope.body).to.equal('');
                expect(scope.ciphertextPreview).to.equal('');
                expect(verifyToMock.calledOnce).to.be.true;

                scope.verifyTo.restore();
            });

            it('should prefill write view for response', function() {
                var verifyToMock = sinon.stub(scope, 'verifyTo'),
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
                expect(scope.to).to.equal(address);
                expect(scope.subject).to.equal('Re: ' + subject);
                expect(scope.body).to.contain(body);
                expect(scope.ciphertextPreview).to.not.be.empty;
                expect(verifyToMock.calledOnce).to.be.true;

                scope.verifyTo.restore();
            });

        });

        describe('verifyTo', function() {
            it('should verify the recipient as secure', function() {
                var id = scope.to = 'pity@da.fool';
                keychainMock.getReceiverPublicKey.withArgs(id).yields(null, {
                    userId: id
                });

                scope.verifyTo();

                expect(scope.toSecure).to.be.true;
                expect(scope.sendBtnText).to.equal('Send securely');
            });

            it('should verify the recipient as not secure', function(done) {
                var id = scope.to = 'pity@da.fool';
                keychainMock.getReceiverPublicKey.withArgs(id).yields({
                    errMsg: '404 not found yadda yadda'
                });
                scope.onError = function() {
                    expect(scope.toSecure).to.be.false;
                    expect(scope.sendBtnText).to.equal('Invite & send securely');
                    done();
                };

                scope.verifyTo();
            });

            it('should reset display if there is no recipient', function() {
                scope.to = undefined;
                scope.verifyTo();
            });
        });

        describe('send to outbox', function() {
            it('should work', function() {
                var verifyToSpy = sinon.spy(scope, 'verifyTo'),
                    re = {
                        from: [{
                            address: 'pity@dafool'
                        }],
                        subject: 'Ermahgerd!',
                        sentDate: new Date(),
                        body: 'so much body!'
                    };

                scope.state.nav = {
                    currentFolder: 'currentFolder'
                };

                scope.emptyOutbox = function() {};

                emailDaoMock.store.yields();

                scope.state.writer.write(re);
                scope.sendToOutbox();

                expect(scope.state.writer.open).to.be.false;
                expect(emailDaoMock.store.calledOnce).to.be.true;
                expect(verifyToSpy.calledOnce).to.be.true;

                scope.verifyTo.restore();
            });

            it('should not work and not close the write view', function(done) {
                scope.state.writer.open = true;
                scope.to = 'a, b, c';
                scope.body = 'asd';
                scope.subject = 'yaddablabla';
                scope.toKey = 'Public Key';

                emailDaoMock.store.withArgs(sinon.match(function(mail) {
                    return mail.from[0].address === emailAddress && mail.to.length === 3;
                })).yields({
                    errMsg: 'snafu'
                });

                scope.onError = function(err) {
                    expect(err).to.exist;
                    expect(scope.state.writer.open).to.be.true;
                    expect(emailDaoMock.store.calledOnce).to.be.true;
                    done();
                };

                scope.sendToOutbox();
            });
        });
    });
});