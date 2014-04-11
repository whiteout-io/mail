define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        SetPassphraseCtrl = require('js/controller/set-passphrase'),
        PGP = require('js/crypto/pgp'),
        appController = require('js/app-controller'),
        KeychainDAO = require('js/dao/keychain-dao');

    describe('Set Passphrase Controller unit test', function() {
        var scope, setPassphraseCtrl,
            dummyFingerprint, expectedFingerprint,
            dummyKeyId, expectedKeyId,
            emailAddress, keySize, cryptoMock, keychainMock;

        beforeEach(function() {
            appController._crypto = cryptoMock = sinon.createStubInstance(PGP);
            appController._keychain = keychainMock = sinon.createStubInstance(KeychainDAO);

            dummyFingerprint = '3A2D39B4E1404190B8B949DE7D7E99036E712926';
            expectedFingerprint = '3A2D 39B4 E140 4190 B8B9 49DE 7D7E 9903 6E71 2926';
            dummyKeyId = '9FEB47936E712926';
            expectedKeyId = '6E712926';
            cryptoMock.getFingerprint.returns(dummyFingerprint);
            cryptoMock.getKeyId.returns(dummyKeyId);
            emailAddress = 'fred@foo.com';
            keySize = 1234;

            cryptoMock.getKeyParams.returns({
                _id: dummyKeyId,
                fingerprint: dummyFingerprint,
                userId: emailAddress,
                bitSize: keySize
            });

            angular.module('setpassphrasetest', []);
            mocks.module('setpassphrasetest');
            mocks.inject(function($rootScope, $controller) {
                scope = $rootScope.$new();
                scope.state = {};
                setPassphraseCtrl = $controller(SetPassphraseCtrl, {
                    $scope: scope
                });
            });
        });

        afterEach(function() {});

        describe('setPassphrase', function() {
            it('should work', function(done) {
                scope.oldPassphrase = 'old';
                scope.newPassphrase = 'new';

                keychainMock.lookupPrivateKey.withArgs(dummyKeyId).yields(null, {
                    encryptedKey: 'encrypted'
                });

                cryptoMock.changePassphrase.withArgs({
                    privateKeyArmored: 'encrypted',
                    oldPassphrase: 'old',
                    newPassphrase: 'new'
                }).yields(null, 'newArmoredKey');

                keychainMock.saveLocalPrivateKey.withArgs({
                    _id: dummyKeyId,
                    userId: emailAddress,
                    encryptedKey: 'newArmoredKey'
                }).yields();

                scope.onError = function(err) {
                    expect(err.title).to.equal('Success');
                    done();
                };

                scope.setPassphrase();
            });
        });
    });
});