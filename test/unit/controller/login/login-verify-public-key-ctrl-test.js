'use strict';

var Auth = require('../../../../src/js/service/auth'),
    Dialog = require('../../../../src/js/util/dialog'),
    PublicKeyVerifier = require('../../../../src/js/service/publickey-verifier'),
    PublicKey = require('../../../../src/js/service/publickey'),
    PublicKeyVerifierCtrl = require('../../../../src/js/controller/login/login-verify-public-key');

describe('Public Key Verification Controller unit test', function() {
    // Angular parameters
    var scope, location;

    // Stubs & Fixture
    var auth, verifier, dialogStub, publicKeyStub;
    var emailAddress = 'foo@foo.com';

    // SUT
    var verificationCtrl;

    beforeEach(function() {
        // remeber pre-test state to restore later
        auth = sinon.createStubInstance(Auth);
        verifier = sinon.createStubInstance(PublicKeyVerifier);
        dialogStub = sinon.createStubInstance(Dialog);
        publicKeyStub = sinon.createStubInstance(PublicKey);

        verifier.uploadPublicKey.returns(resolves());
        auth.emailAddress = emailAddress;

        // setup the controller
        angular.module('publickeyverificationtest', []);
        angular.mock.module('publickeyverificationtest');
        angular.mock.inject(function($rootScope, $controller, $location) {
            scope = $rootScope.$new();
            location = $location;

            verificationCtrl = $controller(PublicKeyVerifierCtrl, {
                $scope: scope,
                $q: window.qMock,
                auth: auth,
                publickeyVerifier: verifier,
                dialog: dialogStub,
                publicKey: publicKeyStub,
                appConfig: {
                    string: {
                        publickeyVerificationSkipTitle: 'foo',
                        publickeyVerificationSkipMessage: 'bar'
                    }
                }
            });
        });
    });

    afterEach(function() {});

    describe('#verify', function() {
        it('should verify', function(done) {
            var credentials = {};

            publicKeyStub.getByUserId.withArgs(emailAddress).returns(resolves());
            auth.getCredentials.returns(resolves(credentials));
            verifier.configure.withArgs(credentials).returns(resolves());
            verifier.verify.withArgs().returns(resolves());
            verifier.persistKeypair.returns(resolves());

            scope.verify().then(function() {
                expect(publicKeyStub.getByUserId.calledOnce).to.be.true;
                expect(auth.getCredentials.calledOnce).to.be.true;
                expect(verifier.configure.calledOnce).to.be.true;
                expect(verifier.verify.calledOnce).to.be.true;
                expect(verifier.persistKeypair.calledOnce).to.be.true;
                expect(location.$$path).to.equal('/account');

                done();
            });
        });

        it('should skip verification when key is already verified', function(done) {
            publicKeyStub.getByUserId.withArgs(emailAddress).returns(resolves({
                publicKey: {}
            }));

            scope.verify().then(function() {
                expect(publicKeyStub.getByUserId.calledOnce).to.be.true;
                expect(auth.getCredentials.called).to.be.false;
                expect(verifier.configure.called).to.be.false;
                expect(verifier.verify.called).to.be.false;
                expect(location.$$path).to.equal('/account');

                done();
            });
        });

        it('should not verify', function(done) {
            var credentials = {};

            auth.getCredentials.returns(resolves(credentials));
            verifier.configure.withArgs(credentials).returns(resolves());
            verifier.verify.withArgs().returns(rejects(new Error()));

            scope.verify().then(function() {
                expect(auth.getCredentials.calledOnce).to.be.true;
                expect(verifier.configure.calledOnce).to.be.true;
                expect(verifier.verify.calledOnce).to.be.true;
                expect(scope.errMsg).to.equal('');

                clearTimeout(scope.timeout);
                clearInterval(scope.countdownDecrement);

                done();
            });
        });

        it('should not verify with error message', function(done) {
            var credentials = {};

            auth.getCredentials.returns(resolves(credentials));
            verifier.configure.withArgs(credentials).returns(resolves());
            verifier.verify.withArgs().returns(rejects(new Error('foo')));

            scope.verify().then(function() {
                expect(auth.getCredentials.calledOnce).to.be.true;
                expect(verifier.configure.calledOnce).to.be.true;
                expect(verifier.verify.calledOnce).to.be.true;
                expect(scope.errMsg).to.equal('foo');

                clearTimeout(scope.timeout);
                clearInterval(scope.countdownDecrement);

                done();
            });
        });
    });
});