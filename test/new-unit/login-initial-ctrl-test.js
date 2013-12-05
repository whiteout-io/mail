define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        LoginInitialCtrl = require('js/controller/login-initial'),
        dl = require('js/util/download'),
        PGP = require('js/crypto/pgp'),
        EmailDAO = require('js/dao/email-dao'),
        appController = require('js/app-controller');

    describe('Login (initial user) Controller unit test', function() {
        var scope, ctrl, location, origEmailDao, emailDaoMock,
            emailAddress = 'fred@foo.com',
            passphrase = 'asd',
            keyId, expectedKeyId,
            cryptoMock;

        beforeEach(function() {
            // remember original module to restore later
            origEmailDao = appController._emailDao;

            emailDaoMock = sinon.createStubInstance(EmailDAO);
            appController._emailDao = emailDaoMock;

            keyId = '9FEB47936E712926';
            expectedKeyId = '6E712926';
            cryptoMock = sinon.createStubInstance(PGP);
            emailDaoMock._crypto = cryptoMock;

            emailDaoMock._account = {
                emailAddress: emailAddress,
            };

            angular.module('logininitialtest', []);
            mocks.module('logininitialtest');
            mocks.inject(function($rootScope, $controller, $location) {
                scope = $rootScope.$new();
                location = $location;
                scope.state = {
                    ui: {}
                };
                ctrl = $controller(LoginInitialCtrl, {
                    $scope: scope
                });
            });
        });

        afterEach(function() {
            // restore the module
            appController._emailDao = origEmailDao;
        });

        describe('initial state', function() {
            it('should be well defined', function() {
                expect(scope.proceed).to.exist;
                expect(scope.exportKeypair).to.exist;
                expect(scope.confirmPassphrase).to.exist;
                expect(scope.state.ui).to.equal(1);
            });
        });

        describe('confirm passphrase', function() {
            var setStateStub;

            it('should unlock crypto', function(done) {
                scope.state.passphrase = passphrase;
                scope.state.confirmation = passphrase;
                emailDaoMock.unlock.withArgs({
                    passphrase: passphrase
                }).yields();
                setStateStub = sinon.stub(scope, 'setState', function(state) {
                    if (setStateStub.calledOnce) {
                        expect(state).to.equal(2);
                    } else if (setStateStub.calledTwice) {
                        expect(state).to.equal(4);
                        expect(emailDaoMock.unlock.calledOnce).to.be.true;
                        scope.setState.restore();
                        done();
                    }
                });

                scope.confirmPassphrase();
            });

            it('should not do anything matching passphrases', function() {
                scope.state.passphrase = 'a';
                scope.state.confirmation = 'b';

                scope.confirmPassphrase();
            });

            it('should not work when keypair generation fails', function(done) {
                scope.state.passphrase = passphrase;
                scope.state.confirmation = passphrase;
                emailDaoMock.unlock.withArgs({
                    passphrase: passphrase
                }).yields(new Error('asd'));
                setStateStub = sinon.stub(scope, 'setState', function(state) {
                    if (setStateStub.calledOnce) {
                        expect(state).to.equal(2);
                    } else if (setStateStub.calledTwice) {
                        expect(state).to.equal(1);
                        expect(emailDaoMock.unlock.calledOnce).to.be.true;
                        scope.setState.restore();
                        done();
                    }
                });

                scope.confirmPassphrase();
            });
        });

        describe('proceed', function() {
            it('should forward', function() {
                var locationSpy = sinon.spy(location, 'path');

                scope.proceed();

                expect(locationSpy.calledWith('/desktop')).to.be.true;
            });
        });

        describe('export keypair', function() {
            it('should work', function() {
                var locationSpy, createDownloadMock;

                createDownloadMock = sinon.stub(dl, 'createDownload');
                cryptoMock.exportKeys.yields(null, {
                    publicKeyArmored: 'a',
                    privateKeyArmored: 'b',
                    keyId: keyId
                });
                createDownloadMock.withArgs(sinon.match(function(arg) {
                    return arg.content === 'ab' && arg.filename === expectedKeyId + '.asc' && arg.contentType === 'text/plain';
                })).yields();

                locationSpy = sinon.spy(location, 'path');

                scope.exportKeypair();

                expect(cryptoMock.exportKeys.calledOnce).to.be.true;
                expect(createDownloadMock.calledOnce).to.be.true;
                expect(locationSpy.calledWith('/desktop')).to.be.true;
                dl.createDownload.restore();
            });

            it('should not work when download fails', function() {
                var createDownloadMock = sinon.stub(dl, 'createDownload');
                cryptoMock.exportKeys.yields(null, {
                    publicKeyArmored: 'a',
                    privateKeyArmored: 'b',
                    keyId: keyId
                });
                createDownloadMock.yields({
                    errMsg: 'snafu.'
                });
                scope.exportKeypair();

                expect(cryptoMock.exportKeys.calledOnce).to.be.true;
                expect(createDownloadMock.calledOnce).to.be.true;
                dl.createDownload.restore();
            });

            it('should not work when export fails', function() {
                cryptoMock.exportKeys.yields(new Error('snafu.'));

                scope.exportKeypair();

                expect(cryptoMock.exportKeys.calledOnce).to.be.true;
            });
        });
    });
});