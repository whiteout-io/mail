'use strict';

var Auth = require('../../../../src/js/service/auth'),
    LoginPrivateKeyDownloadCtrl = require('../../../../src/js/controller/login/login-privatekey-download'),
    Email = require('../../../../src/js/email/email'),
    Keychain = require('../../../../src/js/service/keychain'),
    PrivateKey = require('../../../../src/js/service/privatekey');

describe('Login Private Key Download Controller unit test', function() {
    var scope, location, ctrl,
        emailDaoMock, authMock, keychainMock, privateKeyStub,
        emailAddress = 'fred@foo.com';

    beforeEach(function(done) {
        emailDaoMock = sinon.createStubInstance(Email);
        keychainMock = sinon.createStubInstance(Keychain);
        privateKeyStub = sinon.createStubInstance(PrivateKey);
        authMock = sinon.createStubInstance(Auth);

        authMock.emailAddress = emailAddress;

        angular.module('login-privatekey-download-test', ['woServices']);
        angular.mock.module('login-privatekey-download-test');
        angular.mock.inject(function($controller, $rootScope, $location) {
            scope = $rootScope.$new();
            scope.state = {};
            scope.form = {};
            location = $location;
            ctrl = $controller(LoginPrivateKeyDownloadCtrl, {
                $location: location,
                $scope: scope,
                $routeParams: {},
                $q: window.qMock,
                auth: authMock,
                email: emailDaoMock,
                keychain: keychainMock,
                privateKey: privateKeyStub
            });
            done();
        });
    });

    afterEach(function() {});

    describe('checkCode', function() {
        var encryptedPrivateKey = {
            encryptedPrivateKey: 'encryptedPrivateKey'
        };
        var cachedKeypair = {
            publicKey: {
                _id: 'keyId'
            }
        };
        var privkey = {
            _id: cachedKeypair.publicKey._id,
            userId: emailAddress,
            encryptedKey: 'PRIVATE PGP BLOCK'
        };

        beforeEach(function() {
            scope.code = '012345';

            sinon.stub(scope, 'goTo');
        });
        afterEach(function() {
            scope.goTo.restore();
        });

        it('should fail on privateKey.init', function(done) {
            privateKeyStub.init.returns(rejects(new Error('asdf')));

            scope.checkCode().then(function() {
                expect(scope.errMsg).to.match(/asdf/);
                expect(privateKeyStub.init.calledOnce).to.be.true;
                done();
            });
        });

        it('should work with empty passphrase', function(done) {
            privateKeyStub.init.returns(resolves());
            keychainMock.getUserKeyPair.withArgs(emailAddress).returns(resolves(cachedKeypair));
            privateKeyStub.download.withArgs({
                userId: emailAddress,
                keyId: cachedKeypair.publicKey._id
            }).returns(resolves(encryptedPrivateKey));
            privateKeyStub.decrypt.returns(resolves(privkey));
            emailDaoMock.unlock.returns(resolves());
            authMock.storeCredentials.returns(resolves());
            privateKeyStub.destroy.returns(resolves());

            scope.checkCode().then(function() {
                expect(scope.errMsg).to.not.exist;
                expect(scope.goTo.withArgs('/account').calledOnce).to.be.true;
                done();
            });
        });

        it('should work with passphrase', function(done) {
            privateKeyStub.init.returns(resolves());
            keychainMock.getUserKeyPair.withArgs(emailAddress).returns(resolves(cachedKeypair));
            privateKeyStub.download.withArgs({
                userId: emailAddress,
                keyId: cachedKeypair.publicKey._id
            }).returns(resolves(encryptedPrivateKey));
            privateKeyStub.decrypt.returns(resolves(privkey));
            emailDaoMock.unlock.returns(rejects(new Error()));
            authMock.storeCredentials.returns(resolves());
            privateKeyStub.destroy.returns(resolves());

            scope.checkCode().then(function() {
                expect(scope.goTo.withArgs('/login-existing').calledOnce).to.be.true;
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