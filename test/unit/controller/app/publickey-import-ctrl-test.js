'use strict';

var PublicKeyImportCtrl = require('../../../../src/js/controller/app/publickey-import'),
    Keychain = require('../../../../src/js/service/keychain'),
    PGP = require('../../../../src/js/crypto/pgp'),
    Dialog = require('../../../../src/js/util/dialog');

describe('Public Key Import Controller unit test', function() {
    var scope, ctrl, keychainStub, pgpStub, dialogStub;

    beforeEach(function() {
        pgpStub = sinon.createStubInstance(PGP);
        keychainStub = sinon.createStubInstance(Keychain);
        dialogStub = sinon.createStubInstance(Dialog);

        angular.module('publickey-import', ['woServices']);
        angular.mock.module('publickey-import');
        angular.mock.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {};
            ctrl = $controller(PublicKeyImportCtrl, {
                $scope: scope,
                $q: window.qMock,
                keychain: keychainStub,
                pgp: pgpStub,
                dialog: dialogStub
            });
        });
    });

    afterEach(function() {});

    describe('importKey', function() {
        it('should work', function(done) {
            var keyArmored = '-----BEGIN PGP PUBLIC KEY BLOCK-----';

            pgpStub.getKeyParams.returns({
                _id: '12345',
                userId: 'max@example.com',
                userIds: []
            });

            keychainStub.saveLocalPublicKey.withArgs({
                _id: '12345',
                userId: 'max@example.com',
                userIds: [],
                publicKey: '-----BEGIN PGP PUBLIC KEY BLOCK-----',
                imported: true
            }).returns(resolves());

            scope.listKeys = function() {};

            scope.importKey(keyArmored).then(function() {
                done();
            });
        });

        it('should fail due to invalid armored key', function() {
            var keyArmored = '-----BEGIN PGP PRIVATE KEY BLOCK-----';

            scope.importKey(keyArmored);

            expect(dialogStub.error.calledOnce).to.be.true;
        });

        it('should fail due to error in pgp.getKeyParams', function() {
            var keyArmored = '-----BEGIN PGP PUBLIC KEY BLOCK-----';
            pgpStub.getKeyParams.throws(new Error('WAT'));

            scope.importKey(keyArmored);

            expect(dialogStub.error.calledOnce).to.be.true;
        });

        it('should fail due to error in keychain.saveLocalPublicKey', function(done) {
            var keyArmored = '-----BEGIN PGP PUBLIC KEY BLOCK-----';

            pgpStub.getKeyParams.returns({
                _id: '12345',
                userId: 'max@example.com'
            });

            keychainStub.saveLocalPublicKey.returns(rejects(42));

            scope.importKey(keyArmored).then(function() {
                expect(dialogStub.error.calledOnce).to.be.true;
                done();
            });
        });
    });
});