'use strict';

var Auth = require('../../../../src/js/service/auth'),
    LoginInitialCtrl = require('../../../../src/js/controller/login/login-initial'),
    Email = require('../../../../src/js/email/email');

describe('Login (initial user) Controller unit test', function() {
    var scope, ctrl, location, emailMock, authMock, newsletterStub,
        emailAddress = 'fred@foo.com',
        keyId, expectedKeyId;

    beforeEach(function() {
        emailMock = sinon.createStubInstance(Email);
        authMock = sinon.createStubInstance(Auth);

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
                newsletter: newsletter,
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
        it('should not continue if terms are not accepted', function() {
            scope.agree = undefined;

            scope.generateKey();

            expect(scope.errMsg).to.contain('Terms');
            expect(scope.state.ui).to.equal(1);
            expect(newsletterStub.called).to.be.false;
        });

        it('should fail due to error in emailDao.unlock', function() {
            scope.agree = true;

            emailMock.unlock.withArgs({
                passphrase: undefined
            }).yields(new Error('asdf'));
            authMock.storeCredentials.yields();

            scope.generateKey();

            expect(scope.errMsg).to.exist;
            expect(scope.state.ui).to.equal(1);
            expect(newsletterStub.called).to.be.true;
        });

        it('should unlock crypto', function() {
            scope.agree = true;

            emailMock.unlock.withArgs({
                passphrase: undefined
            }).yields();
            authMock.storeCredentials.yields();

            scope.generateKey();

            expect(scope.errMsg).to.not.exist;
            expect(scope.state.ui).to.equal(2);
            expect(newsletterStub.called).to.be.true;
            expect(location.$$path).to.equal('/desktop');
            expect(emailMock.unlock.calledOnce).to.be.true;
        });
    });
});