'use strict';

var AccountCtrl = require('../../../../src/js/controller/app/account'),
    PGP = require('../../../../src/js/crypto/pgp'),
    Download = require('../../../../src/js/util/download'),
    Keychain = require('../../../../src/js/service/keychain'),
    Auth = require('../../../../src/js/service/auth'),
    Dialog = require('../../../../src/js/util/dialog');

describe('Account Controller unit test', function() {
    var scope, accountCtrl,
        dummyFingerprint, expectedFingerprint,
        dummyKeyId, expectedKeyId,
        emailAddress, keySize, pgpStub, keychainStub, authStub, dialogStub, downloadStub;

    beforeEach(function() {
        pgpStub = sinon.createStubInstance(PGP);
        authStub = sinon.createStubInstance(Auth);
        keychainStub = sinon.createStubInstance(Keychain);
        dialogStub = sinon.createStubInstance(Dialog);
        downloadStub = sinon.createStubInstance(Download);

        dummyFingerprint = '3A2D39B4E1404190B8B949DE7D7E99036E712926';
        expectedFingerprint = '3A2D 39B4 E140 4190 B8B9 49DE 7D7E 9903 6E71 2926';
        dummyKeyId = '9FEB47936E712926';
        expectedKeyId = '6E712926';
        pgpStub.getFingerprint.returns(dummyFingerprint);
        pgpStub.getKeyId.returns(dummyKeyId);
        emailAddress = 'fred@foo.com';
        keySize = 1234;
        authStub.emailAddress = emailAddress;
        pgpStub.getKeyParams.returns({
            _id: dummyKeyId,
            fingerprint: dummyFingerprint,
            userId: emailAddress,
            bitSize: keySize
        });

        angular.module('accounttest', ['woServices']);
        angular.mock.module('accounttest');
        angular.mock.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {};
            accountCtrl = $controller(AccountCtrl, {
                $scope: scope,
                $q: window.qMock,
                auth: authStub,
                keychain: keychainStub,
                pgp: pgpStub,
                download: downloadStub,
                dialog: dialogStub
            });
        });
    });

    afterEach(function() {});

    describe('scope variables', function() {
        it('should be set correctly', function() {
            expect(scope.eMail).to.equal(emailAddress);
            expect(scope.keyId).to.equal(expectedKeyId);
            expect(scope.fingerprint).to.equal(expectedFingerprint);
            expect(scope.keysize).to.equal(keySize);
        });
    });
    describe('export to key file', function() {
        it('should work', function(done) {
            keychainStub.getUserKeyPair.withArgs(emailAddress).returns(resolves({
                publicKey: {
                    _id: dummyKeyId,
                    publicKey: 'a'
                },
                privateKey: {
                    encryptedKey: 'b'
                }
            }));
            downloadStub.createDownload.withArgs(sinon.match(function(arg) {
                return arg.content === 'a\r\nb' && arg.filename === 'whiteout_mail_' + emailAddress + '_' + expectedKeyId + '.asc' && arg.contentType === 'text/plain';
            })).returns();

            scope.exportKeyFile().then(function() {
                expect(scope.state.lightbox).to.equal(undefined);
                expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;
                expect(downloadStub.createDownload.calledOnce).to.be.true;
                done();
            });
        });

        it('should not work when key export failed', function(done) {
            keychainStub.getUserKeyPair.returns(rejects(new Error()));

            scope.exportKeyFile().then(function() {
                expect(dialogStub.error.calledOnce).to.be.true;
                done();
            });
        });
    });
});