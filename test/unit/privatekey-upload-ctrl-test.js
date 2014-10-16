'use strict';

var mocks = angular.mock,
    PrivateKeyUploadCtrl = require('../../src/js/controller/privatekey-upload'),
    appController = require('../../src/js/app-controller'),
    KeychainDAO = require('../../src/js/dao/keychain-dao'),
    PGP = require('../../src/js/crypto/pgp');

describe('Private Key Upload Controller unit test', function() {
    var scope, location, ctrl,
        origEmailDao, emailDaoMock,
        origKeychain, keychainMock,
        pgpStub,
        emailAddress = 'fred@foo.com';

    beforeEach(function(done) {
        // remember original module to restore later, then replace it
        origEmailDao = appController._emailDao;
        appController._emailDao = emailDaoMock = {
            _account: {
                emailAddress: emailAddress
            }
        };
        origKeychain = appController._keychain;
        appController._keychain = keychainMock = sinon.createStubInstance(KeychainDAO);
        keychainMock._pgp = pgpStub = sinon.createStubInstance(PGP);

        angular.module('login-privatekey-download-test', []);
        mocks.module('login-privatekey-download-test');
        mocks.inject(function($controller, $rootScope) {
            scope = $rootScope.$new();
            scope.state = {};
            ctrl = $controller(PrivateKeyUploadCtrl, {
                $location: location,
                $scope: scope
            });
            done();
        });
    });

    afterEach(function() {
        // restore the app controller module
        appController._keychain = origKeychain;
        appController._emailDao = origEmailDao;
    });

    describe('checkServerForKey', function() {
        var keyParams = {
            userId: emailAddress,
            _id: 'keyId',
        };

        it('should fail', function(done) {
            pgpStub.getKeyParams.returns(keyParams);
            keychainMock.hasPrivateKey.yields(42);

            scope.onError = function(err) {
                expect(err).to.exist;
                expect(keychainMock.hasPrivateKey.calledOnce).to.be.true;
                done();
            };

            scope.checkServerForKey();
        });

        it('should return true', function(done) {
            pgpStub.getKeyParams.returns(keyParams);
            keychainMock.hasPrivateKey.withArgs({
                userId: keyParams.userId,
                keyId: keyParams._id
            }).yields(null, true);

            scope.checkServerForKey(function(privateKeySynced) {
                expect(privateKeySynced).to.be.true;
                done();
            });
        });

        it('should return undefined', function(done) {
            pgpStub.getKeyParams.returns(keyParams);
            keychainMock.hasPrivateKey.withArgs({
                userId: keyParams.userId,
                keyId: keyParams._id
            }).yields(null, false);

            scope.checkServerForKey(function(privateKeySynced) {
                expect(privateKeySynced).to.be.undefined;
                done();
            });
        });
    });

    describe('handlePaste', function() {
        it('should work', function() {
            scope.handlePaste({
                clipboardData: {
                    getData: function(val) {
                        expect(val).to.equal('text/plain');
                        return '1qaz-2wsx-3edc-4rfv-5tgb-6yhn';
                    }
                }
            });

            expect(scope.code0).to.equal('1qaz');
            expect(scope.code1).to.equal('2wsx');
            expect(scope.code2).to.equal('3edc');
            expect(scope.code3).to.equal('4rfv');
            expect(scope.code4).to.equal('5tgb');
            expect(scope.code5).to.equal('6yhn');
        });
    });

    describe('displayUploadUi', function() {
        it('should work', function() {
            // add some artifacts from a previous key input
            scope.code0 = scope.code1 = scope.code2 = scope.code3 = scope.code4 = scope.code5 = 'asdasd';

            scope.displayUploadUi();
            expect(scope.step).to.equal(1);
            expect(scope.code.length).to.equal(24);

            // artifacts should be cleared
            expect(scope.code0).to.be.empty;
            expect(scope.code1).to.be.empty;
            expect(scope.code2).to.be.empty;
            expect(scope.code3).to.be.empty;
            expect(scope.code4).to.be.empty;
            expect(scope.code5).to.be.empty;
        });
    });

    describe('verifyCode', function() {
        it('should fail for wrong code', function() {
            scope.code0 = 'b';
            scope.code1 = 'b';
            scope.code2 = 'b';
            scope.code3 = 'b';
            scope.code4 = 'b';
            scope.code5 = 'b';
            scope.code = 'aaaaaa';

            scope.onError = function() {};
            expect(scope.verifyCode()).to.be.false;
        });

        it('should work', function() {
            scope.code0 = 'a';
            scope.code1 = 'a';
            scope.code2 = 'a';
            scope.code3 = 'a';
            scope.code4 = 'a';
            scope.code5 = 'a';
            scope.code = 'aaaaaa';

            scope.onError = function() {};
            expect(scope.verifyCode()).to.be.false;
        });
    });

    describe('setDeviceName', function() {
        it('should work', function(done) {
            keychainMock.setDeviceName.yields();
            scope.setDeviceName(done);
        });
    });

    describe('encryptAndUploadKey', function() {
        it('should fail due to keychain.registerDevice', function(done) {
            keychainMock.registerDevice.yields(42);

            scope.onError = function(err) {
                expect(err).to.exist;
                expect(keychainMock.registerDevice.calledOnce).to.be.true;
                done();
            };

            scope.encryptAndUploadKey();
        });

        it('should work', function(done) {
            keychainMock.registerDevice.yields();
            keychainMock.uploadPrivateKey.yields();

            scope.encryptAndUploadKey(function(err) {
                expect(err).to.not.exist;
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
            setDeviceNameStub.yields(42);

            scope.onError = function(err) {
                expect(err).to.exist;
                expect(scope.step).to.equal(3);
                done();
            };

            scope.goForward();
        });

        it('should fail for 3 due to error in encryptAndUploadKey', function(done) {
            scope.step = 3;
            setDeviceNameStub.yields();
            encryptAndUploadKeyStub.yields(42);

            scope.onError = function(err) {
                expect(err).to.exist;
                expect(scope.step).to.equal(4);
                done();
            };

            scope.goForward();
        });

        it('should work for 3', function(done) {
            scope.step = 3;
            setDeviceNameStub.yields();
            encryptAndUploadKeyStub.yields();

            scope.onError = function(err) {
                expect(err.title).to.equal('Success');
                expect(scope.step).to.equal(4);
                done();
            };

            scope.goForward();
        });
    });
});