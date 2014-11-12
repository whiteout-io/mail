'use strict';

var Auth = require('../../src/js/bo/auth'),
    mocks = angular.mock,
    LoginExistingCtrl = require('../../src/js/controller/login-existing'),
    EmailDAO = require('../../src/js/dao/email-dao'),
    KeychainDAO = require('../../src/js/dao/keychain-dao'),
    appController = require('../../src/js/app-controller');

describe('Login (existing user) Controller unit test', function() {
    var scope, location, ctrl, origEmailDao, emailDaoMock,
        origAuth, authMock,
        emailAddress = 'fred@foo.com',
        passphrase = 'asd',
        keychainMock;

    beforeEach(function() {
        // remember original module to restore later
        origEmailDao = appController._emailDao;
        origAuth = appController._auth;

        appController._emailDao = emailDaoMock = sinon.createStubInstance(EmailDAO);
        appController._auth = authMock = sinon.createStubInstance(Auth);

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
            scope.form = {};
            ctrl = $controller(LoginExistingCtrl, {
                $scope: scope,
                $routeParams: {}
            });
        });
    });

    afterEach(function() {
        // restore the module
        appController._emailDao = origEmailDao;
        appController._auth = origAuth;
    });

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