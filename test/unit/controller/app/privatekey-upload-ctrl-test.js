'use strict';

var PrivateKeyUploadCtrl = require('../../../../src/js/controller/app/privatekey-upload'),
    KeychainDAO = require('../../../../src/js/service/keychain'),
    PGP = require('../../../../src/js/crypto/pgp'),
    Dialog = require('../../../../src/js/util/dialog');

describe('Private Key Upload Controller unit test', function() {
    var scope, location, ctrl,
        keychainMock, pgpStub, dialogStub,
        emailAddress = 'fred@foo.com';

    beforeEach(function() {
        keychainMock = sinon.createStubInstance(KeychainDAO);
        pgpStub = sinon.createStubInstance(PGP);
        dialogStub = sinon.createStubInstance(Dialog);

        angular.module('login-privatekey-download-test', ['woServices']);
        angular.mock.module('login-privatekey-download-test');
        angular.mock.inject(function($controller, $rootScope) {
            scope = $rootScope.$new();
            scope.state = {};
            ctrl = $controller(PrivateKeyUploadCtrl, {
                $location: location,
                $scope: scope,
                $q: window.qMock,
                keychain: keychainMock,
                pgp: pgpStub,
                dialog: dialogStub,
                auth: {
                    emailAddress: emailAddress
                }
            });
        });
    });

    afterEach(function() {});

    describe('checkServerForKey', function() {
        var keyParams = {
            userId: emailAddress,
            _id: 'keyId',
        };

        it('should fail', function(done) {
            pgpStub.getKeyParams.returns(keyParams);
            keychainMock.hasPrivateKey.returns(rejects(42));

            scope.checkServerForKey().then(function() {
                expect(dialogStub.error.calledOnce).to.be.true;
                expect(keychainMock.hasPrivateKey.calledOnce).to.be.true;
                done();
            });
        });

        it('should return true', function(done) {
            pgpStub.getKeyParams.returns(keyParams);
            keychainMock.hasPrivateKey.withArgs({
                userId: keyParams.userId,
                keyId: keyParams._id
            }).returns(resolves(true));

            scope.checkServerForKey().then(function(privateKeySynced) {
                expect(privateKeySynced).to.be.true;
                done();
            });
        });

        it('should return undefined', function(done) {
            pgpStub.getKeyParams.returns(keyParams);
            keychainMock.hasPrivateKey.withArgs({
                userId: keyParams.userId,
                keyId: keyParams._id
            }).returns(resolves(false));

            scope.checkServerForKey().then(function(privateKeySynced) {
                expect(privateKeySynced).to.be.undefined;
                done();
            });
        });
    });

    describe('displayUploadUi', function() {
        it('should work', function() {
            // add some artifacts from a previous key input
            scope.inputCode = 'asdasd';

            scope.displayUploadUi();
            expect(scope.step).to.equal(1);
            expect(scope.code.length).to.equal(24);

            // artifacts should be cleared
            expect(scope.inputCode).to.be.empty;
        });
    });

    describe('verifyCode', function() {
        it('should fail for wrong code', function() {
            scope.inputCode = 'bbbbbb';
            scope.code = 'AAAAAA';

            expect(scope.verifyCode()).to.be.false;
        });

        it('should work', function() {
            scope.inputCode = 'aaAaaa';
            scope.code = 'AAAAAA';

            expect(scope.verifyCode()).to.be.true;
        });
    });

    describe('setDeviceName', function() {
        it('should work', function(done) {
            keychainMock.setDeviceName.returns(resolves());
            scope.setDeviceName().then(done);
        });
    });

    describe('encryptAndUploadKey', function() {
        it('should fail due to keychain.registerDevice', function(done) {
            keychainMock.registerDevice.returns(rejects(42));

            scope.encryptAndUploadKey().then(function() {
                expect(dialogStub.error.calledOnce).to.be.true;
                expect(keychainMock.registerDevice.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            keychainMock.registerDevice.returns(resolves());
            keychainMock.uploadPrivateKey.returns(resolves());

            scope.encryptAndUploadKey().then(function() {
                expect(keychainMock.registerDevice.calledOnce).to.be.true;
                expect(keychainMock.uploadPrivateKey.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('goBack', function() {
        it('should work', function() {
            scope.step = 2;
            scope.goBack();
            expect(scope.step).to.equal(1);
        });

        it('should not work for < 2', function() {
            scope.step = 1;
            scope.goBack();
            expect(scope.step).to.equal(1);
        });
    });

    describe('goForward', function() {
        var verifyCodeStub, setDeviceNameStub, encryptAndUploadKeyStub;
        beforeEach(function() {
            verifyCodeStub = sinon.stub(scope, 'verifyCode');
            setDeviceNameStub = sinon.stub(scope, 'setDeviceName');
            encryptAndUploadKeyStub = sinon.stub(scope, 'encryptAndUploadKey');
        });
        afterEach(function() {
            verifyCodeStub.restore();
            setDeviceNameStub.restore();
            encryptAndUploadKeyStub.restore();
        });

        it('should work for < 2', function() {
            scope.step = 1;
            scope.goForward();
            expect(scope.step).to.equal(2);
        });

        it('should work for 2', function() {
            verifyCodeStub.returns(true);
            scope.step = 2;
            scope.goForward();
            expect(scope.step).to.equal(3);
        });

        it('should not work for 2 when code invalid', function() {
            verifyCodeStub.returns(false);
            scope.step = 2;
            scope.goForward();
            expect(scope.step).to.equal(2);
        });

        it('should fail for 3 due to error in setDeviceName', function(done) {
            scope.step = 3;
            setDeviceNameStub.returns(rejects(42));

            scope.goForward().then(function() {
                expect(dialogStub.error.calledOnce).to.be.true;
                expect(scope.step).to.equal(3);
                done();
            });
        });

        it('should fail for 3 due to error in encryptAndUploadKey', function(done) {
            scope.step = 3;
            setDeviceNameStub.returns(resolves());
            encryptAndUploadKeyStub.returns(rejects(42));

            scope.goForward().then(function() {
                expect(dialogStub.error.calledOnce).to.be.true;
                expect(scope.step).to.equal(4);
                done();
            });
        });

        it('should work for 3', function(done) {
            scope.step = 3;
            setDeviceNameStub.returns(resolves());
            encryptAndUploadKeyStub.returns(resolves());

            scope.goForward().then(function() {
                expect(dialogStub.info.calledOnce).to.be.true;
                expect(scope.step).to.equal(4);
                done();
            });
        });
    });
});