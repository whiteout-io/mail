'use strict';

var Auth = require('../../../../src/js/service/auth'),
    LoginExistingCtrl = require('../../../../src/js/controller/login/login-existing'),
    EmailDAO = require('../../../../src/js/email/email'),
    KeychainDAO = require('../../../../src/js/service/keychain');

describe('Login (existing user) Controller unit test', function() {
    var scope, location, ctrl, emailDaoMock, authMock,
        emailAddress = 'fred@foo.com',
        passphrase = 'asd',
        keychainMock;

    beforeEach(function() {
        emailDaoMock = sinon.createStubInstance(EmailDAO);
        authMock = sinon.createStubInstance(Auth);
        keychainMock = sinon.createStubInstance(KeychainDAO);

        authMock.emailAddress = emailAddress;

        angular.module('loginexistingtest', ['woServices']);
        angular.mock.module('loginexistingtest');
        angular.mock.inject(function($rootScope, $controller, $location) {
            location = $location;
            scope = $rootScope.$new();
            scope.state = {};
            scope.form = {};
            ctrl = $controller(LoginExistingCtrl, {
                $scope: scope,
                $routeParams: {},
                email: emailDaoMock,
                auth: authMock,
                keychain: keychainMock
            });
        });
    });

    afterEach(function() {});

    describe('initial state', function() {
        it('should be well defined', function() {
            expect(scope.incorrect).to.be.undefined;
        });
    });

    describe('confirm passphrase', function() {
        it('should unlock crypto and start', function() {
            var keypair = {},
                pathSpy = sinon.spy(location, 'path');
            scope.passphrase = passphrase;
            keychainMock.getUserKeyPair.withArgs(emailAddress).yields(null, keypair);
            emailDaoMock.unlock.withArgs({
                keypair: keypair,
                passphrase: passphrase
            }).yields();
            authMock.storeCredentials.yields();

            scope.confirmPassphrase();

            expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
            expect(emailDaoMock.unlock.calledOnce).to.be.true;
            expect(pathSpy.calledOnce).to.be.true;
            expect(pathSpy.calledWith('/desktop')).to.be.true;
        });

        it('should not work when keypair unavailable', function() {
            scope.passphrase = passphrase;
            keychainMock.getUserKeyPair.withArgs(emailAddress).yields(new Error('asd'));

            scope.confirmPassphrase();
            expect(scope.errMsg).to.exist;
            expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
        });
    });
});