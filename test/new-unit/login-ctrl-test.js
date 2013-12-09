define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        LoginCtrl = require('js/controller/login'),
        EmailDAO = require('js/dao/email-dao'),
        appController = require('js/app-controller');

    describe('Login Controller unit test', function() {
        var scope, location, ctrl, origEmailDao, emailDaoMock,
            emailAddress = 'fred@foo.com',
            startAppStub,
            checkForUpdateStub,
            getEmailAddressStub,
            initStub;

        describe('initialization', function() {
            var hasChrome, hasIdentity;

            beforeEach(function() {
                hasChrome = !! window.chrome;
                hasIdentity = !! window.chrome.identity;
                window.chrome = window.chrome || {};
                window.chrome.identity = window.chrome.identity || {};

                // remember original module to restore later, then replace it
                origEmailDao = appController._emailDao;
                emailDaoMock = sinon.createStubInstance(EmailDAO);
                appController._emailDao = emailDaoMock;

                startAppStub = sinon.stub(appController, 'start');
                checkForUpdateStub = sinon.stub(appController, 'checkForUpdate');
                getEmailAddressStub = sinon.stub(appController, 'getEmailAddress');
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
                appController.start.restore && appController.start.restore();
                appController.checkForUpdate.restore && appController.checkForUpdate.restore();
                appController.fetchOAuthToken.restore && appController.fetchOAuthToken.restore();
                appController.init.restore && appController.init.restore();
                location.path.restore && location.path.restore();

                startAppStub.restore();
                checkForUpdateStub.restore();
                getEmailAddressStub.restore();
                initStub.restore();
            });

            it('should forward to existing user login', function(done) {
                startAppStub.yields();
                getEmailAddressStub.yields(null, emailAddress);
                initStub.yields(null, {
                    privateKey: 'a',
                    publicKey: 'b'
                });

                angular.module('logintest', []);
                mocks.module('logintest');
                mocks.inject(function($controller, $rootScope, $location) {
                    location = $location;
                    sinon.stub(location, 'path', function(path) {
                        expect(path).to.equal('/login-existing');
                        expect(startAppStub.calledOnce).to.be.true;
                        expect(checkForUpdateStub.calledOnce).to.be.true;
                        expect(getEmailAddressStub.calledOnce).to.be.true;
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
                getEmailAddressStub.yields(null, emailAddress);
                initStub.yields(null, {
                    publicKey: 'b'
                });

                angular.module('logintest', []);
                mocks.module('logintest');
                mocks.inject(function($controller, $rootScope, $location) {
                    location = $location;
                    sinon.stub(location, 'path', function(path) {
                        expect(path).to.equal('/login-new-device');
                        expect(startAppStub.calledOnce).to.be.true;
                        expect(checkForUpdateStub.calledOnce).to.be.true;
                        expect(getEmailAddressStub.calledOnce).to.be.true;
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
                getEmailAddressStub.yields(null, emailAddress);
                initStub.yields();

                angular.module('logintest', []);
                mocks.module('logintest');
                mocks.inject(function($controller, $rootScope, $location) {
                    location = $location;
                    sinon.stub(location, 'path', function(path) {
                        expect(path).to.equal('/login-initial');
                        expect(startAppStub.calledOnce).to.be.true;
                        expect(checkForUpdateStub.calledOnce).to.be.true;
                        expect(getEmailAddressStub.calledOnce).to.be.true;
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
});