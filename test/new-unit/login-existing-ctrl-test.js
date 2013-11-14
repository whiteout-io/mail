define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        LoginExistingCtrl = require('js/controller/login-existing'),
        EmailDAO = require('js/dao/email-dao'),
        KeychainDAO = require('js/dao/keychain-dao'),
        appController = require('js/app-controller');

    describe('Login (existing user) Controller unit test', function() {
        var scope, location, ctrl, origEmailDao, emailDaoMock,
            emailAddress = 'fred@foo.com',
            passphrase = 'asd',
            keychainMock;

        beforeEach(function() {
            // remember original module to restore later
            origEmailDao = appController._emailDao;

            emailDaoMock = sinon.createStubInstance(EmailDAO);
            appController._emailDao = emailDaoMock;

            keychainMock = sinon.createStubInstance(KeychainDAO);
            emailDaoMock._keychain = keychainMock;

            emailDaoMock._account = {
                emailAddress: emailAddress,
            };

            angular.module('loginexistingtest', []);
            mocks.module('loginexistingtest');
            mocks.inject(function($rootScope, $controller, $location) {
                location = $location;
                scope = $rootScope.$new();
                scope.state = {};
                ctrl = $controller(LoginExistingCtrl, {
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
                expect(scope.buttonEnabled).to.be.true;
                expect(scope.incorrect).to.be.false;
                expect(scope.change).to.exist;
                expect(scope.confirmPassphrase).to.exist;
            });
        });

        describe('functionality', function() {
            describe('change', function() {
                it('should set incorrect to false', function() {
                    scope.incorrect = true;

                    scope.change();
                    expect(scope.incorrect).to.be.false;
                });
            });

            describe('confirm passphrase', function() {
                it('should unlock crypto and start', function() {
                    var keypair = {},
                        pathSpy = sinon.spy(location, 'path');
                    scope.passphrase = passphrase;
                    keychainMock.getUserKeyPair.withArgs(emailAddress).yields(null, keypair);
                    emailDaoMock.unlock.withArgs(keypair, passphrase).yields(null);


                    scope.confirmPassphrase();

                    expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
                    expect(emailDaoMock.unlock.calledOnce).to.be.true;
                    expect(pathSpy.calledOnce).to.be.true;
                    expect(pathSpy.calledWith('/desktop')).to.be.true;
                });

                it('should not do anything without passphrase', function() {
                    var pathSpy = sinon.spy(location, 'path');
                    scope.passphrase = '';

                    scope.confirmPassphrase();
                    expect(pathSpy.callCount).to.equal(0);
                });

                it('should not work when keypair unavailable', function(done) {
                    scope.passphrase = passphrase;
                    keychainMock.getUserKeyPair.withArgs(emailAddress).yields(new Error('asd'));

                    scope.confirmPassphrase();

                    expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
                    done();
                });
            });
        });
    });
});