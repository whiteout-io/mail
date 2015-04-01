'use strict';

var PGP = require('../../../../src/js/crypto/pgp'),
    LoginNewDeviceCtrl = require('../../../../src/js/controller/login/login-new-device'),
    KeychainDAO = require('../../../../src/js/service/keychain'),
    PublicKeyVerifier = require('../../../../src/js/service/publickey-verifier'),
    EmailDAO = require('../../../../src/js/email/email'),
    Auth = require('../../../../src/js/service/auth');

describe('Login (new device) Controller unit test', function() {
    var scope, ctrl, emailMock, pgpMock, authMock,
        emailAddress = 'fred@foo.com',
        passphrase = 'asd',
        keyId,
        location,
        keychainMock,
        verifierMock;

    beforeEach(function() {
        emailMock = sinon.createStubInstance(EmailDAO);
        authMock = sinon.createStubInstance(Auth);
        verifierMock = sinon.createStubInstance(PublicKeyVerifier);

        keyId = '9FEB47936E712926';
        keychainMock = sinon.createStubInstance(KeychainDAO);
        pgpMock = sinon.createStubInstance(PGP);
        pgpMock.extractPublicKey.returns('publicKeyArmored');

        authMock.emailAddress = emailAddress;

        angular.module('loginnewdevicetest', ['woServices']);
        angular.mock.module('loginnewdevicetest');
        angular.mock.inject(function($rootScope, $location, $controller) {
            scope = $rootScope.$new();
            location = $location;

            scope.state = {
                ui: {}
            };
            scope.form = {};
            ctrl = $controller(LoginNewDeviceCtrl, {
                $scope: scope,
                $routeParams: {},
                $q: window.qMock,
                email: emailMock,
                auth: authMock,
                pgp: pgpMock,
                publickeyVerifier: verifierMock,
                keychain: keychainMock
            });
        });
    });

    afterEach(function() {});

    describe('initial state', function() {
        it('should be well defined', function() {
            expect(scope.incorrect).to.be.false;
            expect(scope.confirmPassphrase).to.exist;
        });
    });

    describe('pasteKey', function() {
        it('should work', function() {
            var keyStr = '-----BEGIN PGP PRIVATE KEY BLOCK----- asdf -----END PGP PRIVATE KEY BLOCK-----';
            scope.pasteKey(keyStr);

            expect(scope.key.privateKeyArmored).to.equal(keyStr);
        });
    });

    describe('confirm passphrase', function() {
        it('should unlock crypto with a public key on the server', function(done) {
            scope.passphrase = passphrase;
            scope.key = {
                privateKeyArmored: 'b'
            };

            pgpMock.getKeyParams.returns({
                _id: 'id',
                userIds: []
            });

            keychainMock.getUserKeyPair.withArgs(emailAddress).returns(resolves({
                _id: keyId,
                publicKey: 'a'
            }));
            emailMock.unlock.returns(resolves('asd'));
            keychainMock.putUserKeyPair.returns(resolves());

            scope.confirmPassphrase().then(function() {
                expect(emailMock.unlock.calledOnce).to.be.true;
                expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
                expect(location.$$path).to.equal('/account');
                done();
            });
        });

        it('should unlock crypto with no key on the server', function(done) {
            scope.passphrase = passphrase;
            scope.key = {
                privateKeyArmored: 'b',
                publicKeyArmored: 'a'
            };

            pgpMock.getKeyParams.returns({
                _id: 'id',
                userIds: []
            });

            keychainMock.getUserKeyPair.withArgs(emailAddress).returns(resolves());
            keychainMock.uploadPublicKey.returns(resolves());
            emailMock.unlock.returns(resolves('asd'));
            keychainMock.putUserKeyPair.returns(resolves());

            scope.confirmPassphrase().then(function() {
                expect(emailMock.unlock.calledOnce).to.be.true;
                expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
                expect(location.$$path).to.equal('/login-privatekey-upload');
                done();
            });
        });

        it('should not work when keypair upload fails', function(done) {
            scope.passphrase = passphrase;
            scope.key = {
                privateKeyArmored: 'b'
            };

            pgpMock.getKeyParams.returns({
                _id: 'id',
                userIds: []
            });

            keychainMock.getUserKeyPair.withArgs(emailAddress).returns(resolves({
                _id: keyId,
                publicKey: 'a'
            }));
            emailMock.unlock.returns(resolves());
            keychainMock.putUserKeyPair.returns(rejects({
                errMsg: 'yo mamma.'
            }));

            scope.confirmPassphrase().then(function() {
                expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
                expect(emailMock.unlock.calledOnce).to.be.true;
                expect(keychainMock.putUserKeyPair.calledOnce).to.be.true;
                expect(scope.errMsg).to.equal('yo mamma.');
                done();
            });
        });

        it('should not work when unlock fails', function(done) {
            scope.passphrase = passphrase;
            scope.key = {
                privateKeyArmored: 'b'
            };

            pgpMock.getKeyParams.returns({
                _id: 'id',
                userIds: []
            });

            keychainMock.getUserKeyPair.withArgs(emailAddress).returns(resolves({
                _id: keyId,
                publicKey: 'a'
            }));
            emailMock.unlock.returns(rejects({
                errMsg: 'yo mamma.'
            }));

            scope.confirmPassphrase().then(function() {
                expect(scope.incorrect).to.be.true;
                expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
                expect(emailMock.unlock.calledOnce).to.be.true;
                expect(scope.errMsg).to.equal('yo mamma.');
                done();
            });
        });

        it('should not work when keypair retrieval', function(done) {
            scope.passphrase = passphrase;
            scope.key = {
                privateKeyArmored: 'b'
            };

            keychainMock.getUserKeyPair.withArgs(emailAddress).returns(rejects({
                errMsg: 'yo mamma.'
            }));

            scope.confirmPassphrase().then(function() {
                expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
                expect(scope.errMsg).to.equal('yo mamma.');
                done();
            });
        });
    });
});