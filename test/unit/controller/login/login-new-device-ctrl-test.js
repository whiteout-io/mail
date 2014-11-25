'use strict';

var PGP = require('../../../../src/js/crypto/pgp'),
    LoginNewDeviceCtrl = require('../../../../src/js/controller/login/login-new-device'),
    KeychainDAO = require('../../../../src/js/service/keychain'),
    EmailDAO = require('../../../../src/js/email/email'),
    Auth = require('../../../../src/js/service/auth');

describe('Login (new device) Controller unit test', function() {
    var scope, ctrl, emailMock, pgpMock, authMock,
        emailAddress = 'fred@foo.com',
        passphrase = 'asd',
        keyId,
        keychainMock;

    beforeEach(function() {
        emailMock = sinon.createStubInstance(EmailDAO);
        authMock = sinon.createStubInstance(Auth);

        keyId = '9FEB47936E712926';
        keychainMock = sinon.createStubInstance(KeychainDAO);
        pgpMock = sinon.createStubInstance(PGP);
        pgpMock.extractPublicKey.returns('publicKeyArmored');

        authMock.emailAddress = emailAddress;

        angular.module('loginnewdevicetest', ['woServices']);
        angular.mock.module('loginnewdevicetest');
        angular.mock.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {
                ui: {}
            };
            scope.form = {};
            ctrl = $controller(LoginNewDeviceCtrl, {
                $scope: scope,
                $routeParams: {},
                email: emailMock,
                auth: authMock,
                pgp: pgpMock,
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

    describe('confirm passphrase', function() {
        it('should unlock crypto with a public key on the server', function() {
            scope.passphrase = passphrase;
            scope.key = {
                privateKeyArmored: 'b'
            };

            pgpMock.getKeyParams.returns({
                _id: 'id',
                userIds: []
            });

            keychainMock.getUserKeyPair.withArgs(emailAddress).yields(null, {
                _id: keyId,
                publicKey: 'a'
            });
            emailMock.unlock.withArgs(sinon.match.any, passphrase).yields();
            keychainMock.putUserKeyPair.yields();

            scope.confirmPassphrase();

            expect(emailMock.unlock.calledOnce).to.be.true;
            expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
        });

        it('should unlock crypto with no key on the server', function() {
            scope.passphrase = passphrase;
            scope.key = {
                privateKeyArmored: 'b',
                publicKeyArmored: 'a'
            };

            pgpMock.getKeyParams.returns({
                _id: 'id',
                userIds: []
            });

            keychainMock.getUserKeyPair.withArgs(emailAddress).yields();
            emailMock.unlock.withArgs(sinon.match.any, passphrase).yields();
            keychainMock.putUserKeyPair.yields();

            scope.confirmPassphrase();

            expect(emailMock.unlock.calledOnce).to.be.true;
            expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
        });

        it('should not work when keypair upload fails', function() {
            scope.passphrase = passphrase;
            scope.key = {
                privateKeyArmored: 'b'
            };

            pgpMock.getKeyParams.returns({
                _id: 'id',
                userIds: []
            });

            keychainMock.getUserKeyPair.withArgs(emailAddress).yields(null, {
                _id: keyId,
                publicKey: 'a'
            });
            emailMock.unlock.yields();
            keychainMock.putUserKeyPair.yields({
                errMsg: 'yo mamma.'
            });

            scope.confirmPassphrase();

            expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
            expect(emailMock.unlock.calledOnce).to.be.true;
            expect(keychainMock.putUserKeyPair.calledOnce).to.be.true;
            expect(scope.errMsg).to.equal('yo mamma.');
        });

        it('should not work when unlock fails', function() {
            scope.passphrase = passphrase;
            scope.key = {
                privateKeyArmored: 'b'
            };

            pgpMock.getKeyParams.returns({
                _id: 'id',
                userIds: []
            });

            keychainMock.getUserKeyPair.withArgs(emailAddress).yields(null, {
                _id: keyId,
                publicKey: 'a'
            });
            emailMock.unlock.yields({
                errMsg: 'yo mamma.'
            });

            scope.confirmPassphrase();

            expect(scope.incorrect).to.be.true;
            expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
            expect(emailMock.unlock.calledOnce).to.be.true;
            expect(scope.errMsg).to.equal('yo mamma.');
        });

        it('should not work when keypair retrieval', function() {
            scope.passphrase = passphrase;
            scope.key = {
                privateKeyArmored: 'b'
            };

            keychainMock.getUserKeyPair.withArgs(emailAddress).yields({
                errMsg: 'yo mamma.'
            });

            scope.confirmPassphrase();

            expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
            expect(scope.errMsg).to.equal('yo mamma.');
        });
    });
});