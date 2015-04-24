'use strict';

var SetPassphraseCtrl = require('../../../../src/js/controller/app/set-passphrase'),
    PGP = require('../../../../src/js/crypto/pgp'),
    Keychain = require('../../../../src/js/service/keychain'),
    Dialog = require('../../../../src/js/util/dialog');

describe('Set Passphrase Controller unit test', function() {
    var scope, setPassphraseCtrl,
        dummyFingerprint, expectedFingerprint,
        dummyKeyId, expectedKeyId,
        emailAddress, keySize, pgpStub, keychainStub, dialogStub;

    beforeEach(function() {
        pgpStub = sinon.createStubInstance(PGP);
        keychainStub = sinon.createStubInstance(Keychain);
        dialogStub = sinon.createStubInstance(Dialog);

        dummyFingerprint = '3A2D39B4E1404190B8B949DE7D7E99036E712926';
        expectedFingerprint = '3A2D 39B4 E140 4190 B8B9 49DE 7D7E 9903 6E71 2926';
        dummyKeyId = '9FEB47936E712926';
        expectedKeyId = '6E712926';
        pgpStub.getFingerprint.returns(dummyFingerprint);
        pgpStub.getKeyId.returns(dummyKeyId);
        emailAddress = 'fred@foo.com';
        keySize = 1234;

        pgpStub.getKeyParams.returns({
            _id: dummyKeyId,
            fingerprint: dummyFingerprint,
            userId: emailAddress,
            userIds: [],
            bitSize: keySize
        });

        angular.module('setpassphrasetest', ['woServices', 'woUtil']);
        angular.mock.module('setpassphrasetest');
        angular.mock.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {};
            setPassphraseCtrl = $controller(SetPassphraseCtrl, {
                $scope: scope,
                $q: window.qMock,
                pgp: pgpStub,
                keychain: keychainStub,
                dialog: dialogStub
            });
        });
    });

    afterEach(function() {});

    describe('setPassphrase', function(done) {
        it('should work', function() {
            scope.oldPassphrase = 'old';
            scope.newPassphrase = 'new';

            keychainStub.lookupPrivateKey.withArgs(dummyKeyId).returns(resolves({
                encryptedKey: 'encrypted'
            }));

            pgpStub.changePassphrase.withArgs({
                privateKeyArmored: 'encrypted',
                oldPassphrase: 'old',
                newPassphrase: 'new'
            }).returns(resolves('newArmoredKey'));

            keychainStub.saveLocalPrivateKey.withArgs({
                _id: dummyKeyId,
                userId: emailAddress,
                userIds: [],
                encryptedKey: 'newArmoredKey'
            }).returns(resolves());

            scope.setPassphrase().then(function() {
                expect(dialogStub.info.calledOnce).to.be.true;
                done();
            });
        });
    });

});