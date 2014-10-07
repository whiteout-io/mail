'use strict';

var mocks = angular.mocks,
    Auth = require('../../src/js/bo/auth'),
    LoginPrivateKeyDownloadCtrl = require('../../src/js/controller/login-privatekey-download'),
    EmailDAO = require('../../src/js/dao/email-dao'),
    appController = require('../../src/js/app-controller'),
    KeychainDAO = require('../../src/js/dao/keychain-dao');

describe('Login Private Key Download Controller unit test', function() {
    var scope, location, ctrl,
        origEmailDao, emailDaoMock,
        origAuth, authMock,
        origKeychain, keychainMock,
        emailAddress = 'fred@foo.com';

    beforeEach(function(done) {
        // remember original module to restore later, then replace it
        origEmailDao = appController._emailDao;
        origKeychain = appController._keychain;
        origAuth = appController._auth;

        appController._emailDao = emailDaoMock = sinon.createStubInstance(EmailDAO);
        appController._keychain = keychainMock = sinon.createStubInstance(KeychainDAO);
        appController._auth = authMock = sinon.createStubInstance(Auth);

        emailDaoMock._account = {
            emailAddress: emailAddress
        };

        angular.module('login-privatekey-download-test', []);
        mocks.module('login-privatekey-download-test');
        mocks.inject(function($controller, $rootScope) {
            scope = $rootScope.$new();
            scope.state = {};
            ctrl = $controller(LoginPrivateKeyDownloadCtrl, {
                $location: location,
                $scope: scope,
                $routeParams: {}
            });
            done();
        });
    });

    afterEach(function() {
        // restore the app controller module
        appController._emailDao = origEmailDao;
        appController._keychain = origKeychain;
        appController._auth = origAuth;
    });

    describe('initialization', function() {
        it('should work', function() {
            expect(scope.step).to.equal(1);
        });
    });

    describe('verifyRecoveryToken', function() {
        var testKeypair = {
            publicKey: {
                _id: 'id'
            }
        };

        it('should fail for empty recovery token', function(done) {
            scope.onError = function(err) {
                expect(err).to.exist;
                done();
            };

            scope.recoveryToken = undefined;
            scope.verifyRecoveryToken();
        });

        it('should fail in keychain.getUserKeyPair', function(done) {
            keychainMock.getUserKeyPair.yields(42);

            scope.onError = function(err) {
                expect(err).to.exist;
                expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
                done();
            };

            scope.recoveryToken = 'token';
            scope.verifyRecoveryToken();
        });

        it('should fail in keychain.downloadPrivateKey', function(done) {
            keychainMock.getUserKeyPair.yields(null, testKeypair);
            keychainMock.downloadPrivateKey.yields(42);

            scope.onError = function(err) {
                expect(err).to.exist;
                expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
                expect(keychainMock.downloadPrivateKey.calledOnce).to.be.true;
                done();
            };

            scope.recoveryToken = 'token';
            scope.verifyRecoveryToken();
        });

        it('should work', function(done) {
            keychainMock.getUserKeyPair.yields(null, testKeypair);
            keychainMock.downloadPrivateKey.yields(null, 'encryptedPrivateKey');

            scope.recoveryToken = 'token';
            scope.verifyRecoveryToken(function() {
                expect(scope.encryptedPrivateKey).to.equal('encryptedPrivateKey');
                done();
            });
        });
    });

    describe('handlePaste', function() {
        it('should work', function() {
            scope.handlePaste({
                clipboardData: {
                    getData: function(val) {
                        expect(val).to.equal('text/plain');
                        return '1qaz-2wsx-3edc-4rfv-5tgb-6yhn';
                    }
                }
            });

            expect(scope.code0).to.equal('1qaz');
            expect(scope.code1).to.equal('2wsx');
            expect(scope.code2).to.equal('3edc');
            expect(scope.code3).to.equal('4rfv');
            expect(scope.code4).to.equal('5tgb');
            expect(scope.code5).to.equal('6yhn');
        });
    });

    describe('decryptAndStorePrivateKeyLocally', function() {
        beforeEach(function() {
            scope.code0 = '0';
            scope.code1 = '1';
            scope.code2 = '2';
            scope.code3 = '3';
            scope.code4 = '4';
            scope.code5 = '5';

            scope.encryptedPrivateKey = {
                encryptedPrivateKey: 'encryptedPrivateKey'
            };
            scope.cachedKeypair = {
                publicKey: {
                    _id: 'keyId'
                }
            };
        });

        it('should fail on empty code', function(done) {
            scope.code0 = '';
            scope.code1 = '';
            scope.code2 = '';
            scope.code3 = '';
            scope.code4 = '';
            scope.code5 = '';

            scope.onError = function(err) {
                expect(err).to.exist;
                done();
            };

            scope.decryptAndStorePrivateKeyLocally();
        });

        it('should fail on decryptAndStorePrivateKeyLocally', function(done) {
            keychainMock.decryptAndStorePrivateKeyLocally.yields(42);

            scope.onError = function(err) {
                expect(err).to.exist;
                expect(keychainMock.decryptAndStorePrivateKeyLocally.calledOnce).to.be.true;
                done();
            };

            scope.decryptAndStorePrivateKeyLocally();
        });

        it('should goto /login-existing on emailDao.unlock fail', function(done) {
            keychainMock.decryptAndStorePrivateKeyLocally.yields(null, {
                encryptedKey: 'keyArmored'
            });
            emailDaoMock.unlock.yields(42);

            scope.goTo = function(location) {
                expect(location).to.equal('/login-existing');
                expect(keychainMock.decryptAndStorePrivateKeyLocally.calledOnce).to.be.true;
                expect(emailDaoMock.unlock.calledOnce).to.be.true;
                done();
            };

            scope.decryptAndStorePrivateKeyLocally();
        });

        it('should goto /desktop on emailDao.unlock success', function(done) {
            keychainMock.decryptAndStorePrivateKeyLocally.yields(null, {
                encryptedKey: 'keyArmored'
            });
            emailDaoMock.unlock.yields();
            authMock.storeCredentials.yields();

            scope.goTo = function(location) {
                expect(location).to.equal('/desktop');
                expect(keychainMock.decryptAndStorePrivateKeyLocally.calledOnce).to.be.true;
                expect(emailDaoMock.unlock.calledOnce).to.be.true;
                done();
            };

            scope.decryptAndStorePrivateKeyLocally();
        });
    });

    describe('goForward', function() {
        it('should work in step 1', function() {
            var verifyRecoveryTokenStub = sinon.stub(scope, 'verifyRecoveryToken');
            verifyRecoveryTokenStub.yields();
            scope.step = 1;

            scope.goForward();

            expect(verifyRecoveryTokenStub.calledOnce).to.be.true;
            expect(scope.step).to.equal(2);
            verifyRecoveryTokenStub.restore();
        });
        it('should work in step 2', function() {
            var decryptAndStorePrivateKeyLocallyStub = sinon.stub(scope, 'decryptAndStorePrivateKeyLocally');
            decryptAndStorePrivateKeyLocallyStub.returns();
            scope.step = 2;

            scope.goForward();

            expect(decryptAndStorePrivateKeyLocallyStub.calledOnce).to.be.true;
            decryptAndStorePrivateKeyLocallyStub.restore();
        });
    });

    describe('goTo', function() {
        it('should work', function(done) {
            mocks.inject(function($controller, $rootScope, $location) {
                location = $location;
                sinon.stub(location, 'path', function(path) {
                    expect(path).to.equal('/desktop');
                    done();
                });
                scope = $rootScope.$new();
                scope.state = {};
                ctrl = $controller(LoginPrivateKeyDownloadCtrl, {
                    $location: location,
                    $scope: scope,
                    $routeParams: {}
                });
            });

            scope.goTo('/desktop');
        });
    });
});