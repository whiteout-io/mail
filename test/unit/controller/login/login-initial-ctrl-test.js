'use strict';

var Auth = require('../../../../src/js/service/auth'),
    PublicKeyVerifier = require('../../../../src/js/service/publickey-verifier'),
    LoginInitialCtrl = require('../../../../src/js/controller/login/login-initial'),
    Email = require('../../../../src/js/email/email');

describe('Login (initial user) Controller unit test', function() {
    var scope, ctrl, location, emailMock, authMock, newsletterStub, verifierMock,
        emailAddress = 'fred@foo.com',
        keyId, expectedKeyId;

    beforeEach(function() {
        emailMock = sinon.createStubInstance(Email);
        authMock = sinon.createStubInstance(Auth);
        verifierMock = sinon.createStubInstance(PublicKeyVerifier);

        keyId = '9FEB47936E712926';
        expectedKeyId = '6E712926';

        authMock.emailAddress = emailAddress;

        angular.module('logininitialtest', ['woServices']);
        angular.mock.module('logininitialtest');
        angular.mock.inject(function($rootScope, $controller, $location, newsletter) {
            scope = $rootScope.$new();
            location = $location;
            newsletterStub = sinon.stub(newsletter, 'signup');
            scope.state = {
                ui: {}
            };
            ctrl = $controller(LoginInitialCtrl, {
                $scope: scope,
                $routeParams: {},
                $q: window.qMock,
                newsletter: newsletter,
                publickeyVerifier: verifierMock,
                email: emailMock,
                auth: authMock
            });
        });
    });

    afterEach(function() {});

    describe('initial state', function() {
        it('should be well defined', function() {
            expect(scope.state.ui).to.equal(1);
        });
    });

    describe('go to import key', function() {
        it('should not continue if terms are not accepted', function() {
            scope.agree = undefined;

            scope.importKey();

            expect(scope.errMsg).to.contain('Terms');
            expect(newsletterStub.called).to.be.false;
        });

        it('should work', function() {
            scope.agree = true;
            scope.importKey();
            expect(newsletterStub.calledOnce).to.be.true;
            expect(location.$$path).to.equal('/login-new-device');
        });
    });

    describe('generate key', function() {
        beforeEach(function() {
            authMock.realname = 'Hans Dampf';
        });

        it('should not continue if terms are not accepted', function() {
            scope.agree = undefined;

            scope.generateKey();

            expect(scope.errMsg).to.contain('Terms');
            expect(scope.state.ui).to.equal(1);
            expect(newsletterStub.called).to.be.false;
        });

        it('should fail due to error in emailDao.unlock', function(done) {
            scope.agree = true;

            emailMock.unlock.withArgs({
                passphrase: undefined,
                realname: authMock.realname
            }).returns(rejects(new Error('asdf')));
            authMock.storeCredentials.returns(resolves());

            scope.generateKey().then(function() {
                expect(scope.errMsg).to.exist;
                expect(scope.state.ui).to.equal(1);
                expect(newsletterStub.called).to.be.true;
                done();
            });
        });

        it('should unlock crypto', function(done) {
            scope.agree = true;

            emailMock.unlock.withArgs({
                passphrase: undefined,
                realname: authMock.realname
            }).returns(resolves('foofoo'));
            authMock.storeCredentials.returns(resolves());

            scope.generateKey().then(function() {
                expect(scope.errMsg).to.not.exist;
                expect(scope.state.ui).to.equal(2);
                expect(newsletterStub.called).to.be.true;
                expect(location.$$path).to.equal('/login-privatekey-upload');
                expect(emailMock.unlock.calledOnce).to.be.true;
                done();
            });
        });
    });
});