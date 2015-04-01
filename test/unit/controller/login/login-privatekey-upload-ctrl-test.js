'use strict';

var Auth = require('../../../../src/js/service/auth'),
    LoginPrivateKeyUploadCtrl = require('../../../../src/js/controller/login/login-privatekey-upload'),
    PrivateKey = require('../../../../src/js/service/privatekey');

describe('Login Private Key Upload Controller unit test', function() {
    var scope, location, ctrl,
        authMock, privateKeyStub,
        emailAddress = 'fred@foo.com';

    beforeEach(function(done) {
        privateKeyStub = sinon.createStubInstance(PrivateKey);
        authMock = sinon.createStubInstance(Auth);

        authMock.emailAddress = emailAddress;

        angular.module('login-privatekey-download-test', ['woServices']);
        angular.mock.module('login-privatekey-download-test');
        angular.mock.inject(function($controller, $rootScope, $location) {
            scope = $rootScope.$new();
            scope.state = {};
            scope.form = {};
            location = $location;
            ctrl = $controller(LoginPrivateKeyUploadCtrl, {
                $location: location,
                $scope: scope,
                $routeParams: {},
                $q: window.qMock,
                auth: authMock,
                privateKey: privateKeyStub
            });
            done();
        });
    });

    afterEach(function() {});

    describe('init', function() {
        it('should work', function() {
            expect(scope.step).to.equal(1);
            expect(scope.code).to.exist;
            expect(scope.displayedCode).to.exist;
            expect(scope.inputCode).to.equal('');
        });
    });

    describe('encryptAndUploadKey', function() {
        var encryptedPrivateKey = {
            encryptedPrivateKey: 'encryptedPrivateKey'
        };

        beforeEach(function() {
            scope.inputCode = scope.code;
            sinon.spy(location, 'path');
        });

        it('should fail for invalid code', function() {
            scope.inputCode = 'asdf';
            scope.encryptAndUploadKey().then(function() {
                expect(scope.errMsg).to.match(/go back and check/);
            });
        });

        it('should work', function(done) {
            privateKeyStub.init.returns(resolves());
            privateKeyStub.encrypt.withArgs(scope.code).returns(resolves(encryptedPrivateKey));
            privateKeyStub.upload.returns(resolves());
            privateKeyStub.destroy.returns(resolves());

            scope.encryptAndUploadKey().then(function() {
                expect(scope.errMsg).to.not.exist;
                location.path.calledWith('/login-verify-public-key');
                done();
            });
        });
    });
});