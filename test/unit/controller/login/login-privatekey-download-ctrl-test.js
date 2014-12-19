'use strict';

var Auth = require('../../../../src/js/service/auth'),
    LoginPrivateKeyDownloadCtrl = require('../../../../src/js/controller/login/login-privatekey-download'),
    Email = require('../../../../src/js/email/email'),
    Keychain = require('../../../../src/js/service/keychain');

describe('Login Private Key Download Controller unit test', function() {
    var scope, location, ctrl,
        emailDaoMock, authMock, keychainMock,
        emailAddress = 'fred@foo.com';

    beforeEach(function(done) {
        emailDaoMock = sinon.createStubInstance(Email);
        keychainMock = sinon.createStubInstance(Keychain);
        authMock = sinon.createStubInstance(Auth);

        authMock.emailAddress = emailAddress;

        angular.module('login-privatekey-download-test', ['woServices']);
        angular.mock.module('login-privatekey-download-test');
        angular.mock.inject(function($controller, $rootScope, $location) {
            scope = $rootScope.$new();
            scope.state = {};
            scope.tokenForm = {};
            scope.codeForm = {};
            location = $location;
            ctrl = $controller(LoginPrivateKeyDownloadCtrl, {
                $location: location,
                $scope: scope,
                $routeParams: {},
                $q: window.qMock,
                auth: authMock,
                email: emailDaoMock,
                keychain: keychainMock
            });
            done();
        });
    });

    afterEach(function() {});

    describe('initialization', function() {
        it('should work', function() {
            expect(scope.step).to.equal(1);
        });
    });

    describe('checkToken', function() {
        var testKeypair = {
            publicKey: {
                _id: 'id'
            }
        };

        it('should fail for empty recovery token', function() {
            scope.tokenForm.$invalid = true;

            scope.checkToken();

            expect(keychainMock.getUserKeyPair.calledOnce).to.be.false;
            expect(scope.errMsg).to.exist;
        });

        it('should fail in keychain.getUserKeyPair', function(done) {
            keychainMock.getUserKeyPair.returns(rejects(new Error('asdf')));

            scope.checkToken().then(function() {
                expect(scope.errMsg).to.exist;
                expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail in keychain.downloadPrivateKey', function(done) {
            keychainMock.getUserKeyPair.returns(resolves(testKeypair));
            keychainMock.downloadPrivateKey.returns(rejects(new Error('asdf')));
            scope.recoveryToken = 'token';

            scope.checkToken().then(function() {
                expect(scope.errMsg).to.exist;
                expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
                expect(keychainMock.downloadPrivateKey.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            keychainMock.getUserKeyPair.returns(resolves(testKeypair));
            keychainMock.downloadPrivateKey.returns(resolves('encryptedPrivateKey'));
            scope.recoveryToken = 'token';

            scope.checkToken().then(function() {
                expect(scope.encryptedPrivateKey).to.equal('encryptedPrivateKey');
                done();
            });
        });
    });

    describe('checkCode', function() {
        beforeEach(function() {
            scope.code = '012345';

            scope.encryptedPrivateKey = {
                encryptedPrivateKey: 'encryptedPrivateKey'
            };
            scope.cachedKeypair = {
                publicKey: {
                    _id: 'keyId'
                }
            };

            sinon.stub(scope, 'goTo');
        });
        afterEach(function() {
            scope.goTo.restore();
        });

        it('should fail on decryptAndStorePrivateKeyLocally', function(done) {
            keychainMock.decryptAndStorePrivateKeyLocally.returns(rejects(new Error('asdf')));

            scope.checkCode().then(function() {
                expect(scope.errMsg).to.exist;
                expect(keychainMock.decryptAndStorePrivateKeyLocally.calledOnce).to.be.true;
                done();
            });
        });

        it('should goto /login-existing on emailDao.unlock fail', function(done) {
            keychainMock.decryptAndStorePrivateKeyLocally.returns(resolves({
                encryptedKey: 'keyArmored'
            }));
            emailDaoMock.unlock.returns(rejects(new Error('asdf')));

            scope.checkCode().then(function() {
                expect(scope.goTo.withArgs('/login-existing').calledOnce).to.be.true;
                expect(keychainMock.decryptAndStorePrivateKeyLocally.calledOnce).to.be.true;
                expect(emailDaoMock.unlock.calledOnce).to.be.true;
                done();
            });
        });

        it('should goto /account on emailDao.unlock success', function(done) {
            keychainMock.decryptAndStorePrivateKeyLocally.returns(resolves({
                encryptedKey: 'keyArmored'
            }));
            emailDaoMock.unlock.returns(resolves());
            authMock.storeCredentials.returns(resolves());

            scope.checkCode().then(function() {
                expect(scope.goTo.withArgs('/account').calledOnce).to.be.true;
                expect(keychainMock.decryptAndStorePrivateKeyLocally.calledOnce).to.be.true;
                expect(emailDaoMock.unlock.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('goTo', function() {
        it('should work', function() {
            sinon.stub(location, 'path', function(path) {
                expect(path).to.equal('/account');
            });

            scope.goTo('/account');
        });
    });
});