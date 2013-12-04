define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        LoginNewDeviceCtrl = require('js/controller/login-new-device'),
        KeychainDAO = require('js/dao/keychain-dao'),
        EmailDAO = require('js/dao/email-dao'),
        appController = require('js/app-controller');

    describe('Login (new device) Controller unit test', function() {
        var scope, ctrl, origEmailDao, emailDaoMock,
            emailAddress = 'fred@foo.com',
            passphrase = 'asd',
            keyId,
            keychainMock;

        beforeEach(function() {
            // remember original module to restore later
            origEmailDao = appController._emailDao;

            emailDaoMock = sinon.createStubInstance(EmailDAO);
            appController._emailDao = emailDaoMock;

            keyId = '9FEB47936E712926';
            keychainMock = sinon.createStubInstance(KeychainDAO);
            emailDaoMock._keychain = keychainMock;

            emailDaoMock._account = {
                emailAddress: emailAddress,
            };

            angular.module('loginnewdevicetest', []);
            mocks.module('loginnewdevicetest');
            mocks.inject(function($rootScope, $controller) {
                scope = $rootScope.$new();
                scope.state = {
                    ui: {}
                };
                ctrl = $controller(LoginNewDeviceCtrl, {
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
                expect(scope.incorrect).to.be.false;
                expect(scope.confirmPassphrase).to.exist;
            });
        });

        describe('confirm passphrase', function() {
            it('should unlock crypto', function() {
                scope.passphrase = passphrase;
                scope.key = {
                    privateKeyArmored: 'b'
                };
                keychainMock.getUserKeyPair.withArgs(emailAddress).yields(null, {
                    _id: keyId,
                    publicKey: 'a'
                });
                emailDaoMock.unlock.withArgs(sinon.match.any, passphrase).yields();
                keychainMock.putUserKeyPair.yields();

                scope.confirmPassphrase();

                expect(emailDaoMock.unlock.calledOnce).to.be.true;
                expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
            });

            it('should not do anything without passphrase', function() {
                scope.state.passphrase = '';

                scope.confirmPassphrase();

                expect(scope.incorrect).to.be.true;
            });

            it('should not work when keypair upload fails', function() {
                scope.passphrase = passphrase;
                scope.key = {
                    privateKeyArmored: 'b'
                };

                keychainMock.getUserKeyPair.withArgs(emailAddress).yields(null, {
                    _id: keyId,
                    publicKey: 'a'
                });
                emailDaoMock.unlock.yields();
                keychainMock.putUserKeyPair.yields({
                    errMsg: 'yo mamma.'
                });

                scope.confirmPassphrase();

                expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
                expect(emailDaoMock.unlock.calledOnce).to.be.true;
                expect(keychainMock.putUserKeyPair.calledOnce).to.be.true;
            });

            it('should not work when unlock fails', function() {
                scope.passphrase = passphrase;
                scope.key = {
                    privateKeyArmored: 'b'
                };

                keychainMock.getUserKeyPair.withArgs(emailAddress).yields(null, {
                    _id: keyId,
                    publicKey: 'a'
                });
                emailDaoMock.unlock.yields({
                    errMsg: 'yo mamma.'
                });

                scope.confirmPassphrase();

                expect(scope.incorrect).to.be.true;
                expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
                expect(emailDaoMock.unlock.calledOnce).to.be.true;
            });

            it('should not work when keypair retrieval', function() {
                scope.passphrase = passphrase;

                keychainMock.getUserKeyPair.withArgs(emailAddress).yields({
                    errMsg: 'yo mamma.'
                });

                scope.confirmPassphrase();

                expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
            });
        });
    });
});