'use strict';

var mocks = angular.mock,
    LoginCtrl = require('../../src/js/controller/login'),
    EmailDAO = require('../../src/js/dao/email-dao'),
    Auth = require('../../src/js/bo/auth'),
    appController = require('../../src/js/app-controller'),
    KeychainDAO = require('../../src/js/dao/keychain-dao');

describe('Login Controller unit test', function() {
    var scope, location, ctrl,
        origEmailDao, emailDaoMock,
        origKeychain, keychainMock,
        origAuth, authStub,
        emailAddress = 'fred@foo.com',
        startAppStub,
        checkForUpdateStub,
        initStub;

    describe('initialization', function() {
        var hasChrome, hasIdentity;

        beforeEach(function() {
            hasChrome = !!window.chrome;
            hasIdentity = !!window.chrome.identity;
            window.chrome = window.chrome || {};
            window.chrome.identity = window.chrome.identity || {};

            // remember original module to restore later, then replace it
            origEmailDao = appController._emailDao;
            origKeychain = appController._keychain;
            origAuth = appController._auth;
            appController._emailDao = emailDaoMock = sinon.createStubInstance(EmailDAO);
            appController._keychain = keychainMock = sinon.createStubInstance(KeychainDAO);
            appController._auth = authStub = sinon.createStubInstance(Auth);

            startAppStub = sinon.stub(appController, 'start');
            checkForUpdateStub = sinon.stub(appController, 'checkForUpdate');
            initStub = sinon.stub(appController, 'init');
        });

        afterEach(function() {
            // restore the browser
            if (!hasIdentity) {
                delete window.chrome.identity;
            }

            if (!hasChrome) {
                delete window.chrome;
            }

            // restore the app controller module
            appController._emailDao = origEmailDao;
            appController._keychain = origKeychain;
            appController._auth = origAuth;
            appController.start.restore && appController.start.restore();
            appController.checkForUpdate.restore && appController.checkForUpdate.restore();
            appController.init.restore && appController.init.restore();
            location.path.restore && location.path.restore();

            startAppStub.restore();
            checkForUpdateStub.restore();
            initStub.restore();
        });

        it('should forward directly to desktop for empty passphrase', function(done) {
            var testKeys = {
                privateKey: 'a',
                publicKey: 'b'
            };

            startAppStub.yields();
            authStub.getEmailAddress.yields(null, {
                emailAddress: emailAddress,
                realname: 'asd'
            });
            authStub.storeCredentials.yields();
            initStub.yields(null, testKeys);

            emailDaoMock.unlock.withArgs({
                keypair: testKeys,
                passphrase: undefined
            }).yields();

            angular.module('logintest', []);
            mocks.module('logintest');
            mocks.inject(function($controller, $rootScope, $location) {
                location = $location;
                sinon.stub(location, 'path', function(path) {
                    expect(path).to.equal('/desktop');
                    expect(startAppStub.calledOnce).to.be.true;
                    expect(checkForUpdateStub.calledOnce).to.be.true;
                    expect(authStub.getEmailAddress.calledOnce).to.be.true;
                    expect(authStub.storeCredentials.calledOnce).to.be.true;
                    done();
                });
                scope = $rootScope.$new();
                scope.state = {};
                ctrl = $controller(LoginCtrl, {
                    $location: location,
                    $scope: scope
                });
            });
        });

        it('should forward to existing user login', function(done) {
            var testKeys = {
                privateKey: 'a',
                publicKey: 'b'
            };

            startAppStub.yields();
            authStub.getEmailAddress.yields(null, {
                emailAddress: emailAddress,
                realname: 'asd'
            });
            initStub.yields(null, testKeys);

            emailDaoMock.unlock.withArgs({
                keypair: testKeys,
                passphrase: undefined
            }).yields({});

            angular.module('logintest', []);
            mocks.module('logintest');
            mocks.inject(function($controller, $rootScope, $location) {
                location = $location;
                sinon.stub(location, 'path', function(path) {
                    expect(path).to.equal('/login-existing');
                    expect(startAppStub.calledOnce).to.be.true;
                    expect(checkForUpdateStub.calledOnce).to.be.true;
                    expect(authStub.getEmailAddress.calledOnce).to.be.true;
                    done();
                });
                scope = $rootScope.$new();
                scope.state = {};
                ctrl = $controller(LoginCtrl, {
                    $location: location,
                    $scope: scope
                });
            });
        });

        it('should forward to privatekey download login', function(done) {
            startAppStub.yields();
            authStub.getEmailAddress.yields(null, {
                emailAddress: emailAddress,
                realname: 'asd'
            });
            initStub.yields(null, {
                publicKey: 'b'
            });
            keychainMock.requestPrivateKeyDownload.yields(null, {});

            angular.module('logintest', []);
            mocks.module('logintest');
            mocks.inject(function($controller, $rootScope, $location) {
                location = $location;
                sinon.stub(location, 'path', function(path) {
                    expect(path).to.equal('/login-privatekey-download');
                    expect(startAppStub.calledOnce).to.be.true;
                    expect(checkForUpdateStub.calledOnce).to.be.true;
                    expect(authStub.getEmailAddress.calledOnce).to.be.true;
                    expect(keychainMock.requestPrivateKeyDownload.calledOnce).to.be.true;
                    done();
                });
                scope = $rootScope.$new();
                scope.state = {};
                ctrl = $controller(LoginCtrl, {
                    $location: location,
                    $scope: scope
                });
            });
        });

        it('should forward to new device login', function(done) {
            startAppStub.yields();
            authStub.getEmailAddress.yields(null, {
                emailAddress: emailAddress,
                realname: 'asd'
            });
            initStub.yields(null, {
                publicKey: 'b'
            });
            keychainMock.requestPrivateKeyDownload.yields();

            angular.module('logintest', []);
            mocks.module('logintest');
            mocks.inject(function($controller, $rootScope, $location) {
                location = $location;
                sinon.stub(location, 'path', function(path) {
                    expect(path).to.equal('/login-new-device');
                    expect(startAppStub.calledOnce).to.be.true;
                    expect(checkForUpdateStub.calledOnce).to.be.true;
                    expect(authStub.getEmailAddress.calledOnce).to.be.true;
                    expect(keychainMock.requestPrivateKeyDownload.calledOnce).to.be.true;
                    done();
                });
                scope = $rootScope.$new();
                scope.state = {};
                ctrl = $controller(LoginCtrl, {
                    $location: location,
                    $scope: scope
                });
            });
        });

        it('should forward to initial login', function(done) {
            startAppStub.yields();
            authStub.getEmailAddress.yields(null, {
                emailAddress: emailAddress,
                realname: 'asd'
            });
            initStub.yields();

            angular.module('logintest', []);
            mocks.module('logintest');
            mocks.inject(function($controller, $rootScope, $location) {
                location = $location;
                sinon.stub(location, 'path', function(path) {
                    expect(path).to.equal('/login-initial');
                    expect(startAppStub.calledOnce).to.be.true;
                    expect(checkForUpdateStub.calledOnce).to.be.true;
                    expect(authStub.getEmailAddress.calledOnce).to.be.true;
                    done();
                });
                scope = $rootScope.$new();
                scope.state = {};
                ctrl = $controller(LoginCtrl, {
                    $location: location,
                    $scope: scope
                });
            });
        });
    });
});