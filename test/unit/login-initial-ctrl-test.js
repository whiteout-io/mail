define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        Auth = require('js/bo/auth'),
        mocks = require('angularMocks'),
        LoginInitialCtrl = require('js/controller/login-initial'),
        PGP = require('js/crypto/pgp'),
        EmailDAO = require('js/dao/email-dao'),
        appController = require('js/app-controller');

    describe('Login (initial user) Controller unit test', function() {
        var scope, ctrl, location, origEmailDao, emailDaoMock,
            origAuth, authMock,
            emailAddress = 'fred@foo.com',
            keyId, expectedKeyId,
            cryptoMock;

        beforeEach(function() {
            // remember original module to restore later
            origEmailDao = appController._emailDao;
            origAuth = appController._auth;

            appController._emailDao = emailDaoMock = sinon.createStubInstance(EmailDAO);
            appController._auth = authMock = sinon.createStubInstance(Auth);

            keyId = '9FEB47936E712926';
            expectedKeyId = '6E712926';
            cryptoMock = sinon.createStubInstance(PGP);
            emailDaoMock._crypto = cryptoMock;

            emailDaoMock._account = {
                emailAddress: emailAddress,
            };

            angular.module('logininitialtest', []);
            mocks.module('logininitialtest');
            mocks.inject(function($rootScope, $controller, $location) {
                scope = $rootScope.$new();
                location = $location;
                scope.state = {
                    ui: {}
                };
                ctrl = $controller(LoginInitialCtrl, {
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
                expect(scope.state.ui).to.equal(1);
            });
        });

        describe('signUpToNewsletter', function() {
            var xhrMock, requests;

            beforeEach(function() {
                xhrMock = sinon.useFakeXMLHttpRequest();
                requests = [];

                xhrMock.onCreate = function(xhr) {
                    requests.push(xhr);
                };
            });

            afterEach(function() {
                xhrMock.restore();
            });

            it('should not signup', function() {
                scope.state.newsletter = false;

                scope.signUpToNewsletter();
                expect(requests.length).to.equal(0);
            });

            it('should fail', function(done) {
                scope.state.newsletter = true;

                scope.signUpToNewsletter(function(err, xhr) {
                    expect(err).to.exist;
                    expect(xhr).to.not.exist;
                    done();
                });

                expect(requests.length).to.equal(1);
                requests[0].onerror('err');
            });

            it('should work without callback', function() {
                scope.state.newsletter = true;

                scope.signUpToNewsletter();

                expect(requests.length).to.equal(1);
                requests[0].respond(200, {
                    "Content-Type": "text/plain"
                }, 'foobar!');
            });
        });

        describe('go to import key', function() {
            var signUpToNewsletterStub;
            beforeEach(function() {
                signUpToNewsletterStub = sinon.stub(scope, 'signUpToNewsletter');
            });
            afterEach(function() {
                signUpToNewsletterStub.restore();
            });

            it('should not continue if terms are not accepted', function(done) {
                scope.state.agree = undefined;

                scope.onError = function(err) {
                    expect(err.message).to.contain('Terms');
                    expect(signUpToNewsletterStub.called).to.be.false;
                    done();
                };

                scope.importKey();
            });

            it('should work', function() {
                scope.state.agree = true;
                scope.importKey();
                expect(signUpToNewsletterStub.calledOnce).to.be.true;
                expect(location.$$path).to.equal('/login-new-device');
            });
        });

        describe('generate key', function() {
            var signUpToNewsletterStub;
            beforeEach(function() {
                signUpToNewsletterStub = sinon.stub(scope, 'signUpToNewsletter');
            });
            afterEach(function() {
                signUpToNewsletterStub.restore();
            });

            it('should not continue if terms are not accepted', function(done) {
                scope.state.agree = undefined;

                scope.onError = function(err) {
                    expect(err.message).to.contain('Terms');
                    expect(scope.state.ui).to.equal(1);
                    expect(signUpToNewsletterStub.called).to.be.false;
                    done();
                };

                scope.generateKey();
            });

            it('should fail due to error in emailDao.unlock', function(done) {
                scope.state.agree = true;

                emailDaoMock.unlock.withArgs({
                    passphrase: undefined
                }).yields(new Error());
                authMock.storeCredentials.yields();

                scope.onError = function(err) {
                    expect(err).to.exist;
                    expect(scope.state.ui).to.equal(1);
                    expect(signUpToNewsletterStub.called).to.be.true;
                    done();
                };

                scope.generateKey();
                expect(scope.state.ui).to.equal(2);
            });

            it('should unlock crypto', function(done) {
                scope.state.agree = true;

                emailDaoMock.unlock.withArgs({
                    passphrase: undefined
                }).yields();
                authMock.storeCredentials.yields();

                scope.$apply = function() {
                    expect(scope.state.ui).to.equal(2);
                    expect(location.$$path).to.equal('/desktop');
                    expect(emailDaoMock.unlock.calledOnce).to.be.true;
                    done();
                };

                scope.generateKey();
            });
        });

    });
});