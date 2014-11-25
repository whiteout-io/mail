'use strict';

var ContactsCtrl = require('../../../../src/js/controller/app/contacts'),
    Keychain = require('../../../../src/js/service/keychain'),
    PGP = require('../../../../src/js/crypto/pgp'),
    Dialog = require('../../../../src/js/util/dialog');

describe('Contacts Controller unit test', function() {
    var scope, contactsCtrl, keychainStub, pgpStub, dialogStub;

    beforeEach(function() {
        pgpStub = sinon.createStubInstance(PGP);
        keychainStub = sinon.createStubInstance(Keychain);
        dialogStub = sinon.createStubInstance(Dialog);

        angular.module('contactstest', ['woServices']);
        angular.mock.module('contactstest');
        angular.mock.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {};
            contactsCtrl = $controller(ContactsCtrl, {
                $scope: scope,
                keychain: keychainStub,
                pgp: pgpStub,
                dialog: dialogStub
            });
        });
    });

    afterEach(function() {});

    describe('scope variables', function() {
        it('should be set correctly', function() {
            expect(scope.state.contacts.toggle).to.exist;
        });
    });

    describe('listKeys', function() {
        it('should fail due to error in keychain.listLocalPublicKeys', function() {
            keychainStub.listLocalPublicKeys.yields(42);

            scope.listKeys();

            expect(dialogStub.error.calledOnce).to.be.true;
        });

        it('should work', function() {
            keychainStub.listLocalPublicKeys.yields(null, [{
                _id: '12345'
            }]);
            pgpStub.getKeyParams.returns({
                fingerprint: 'asdf'
            });

            expect(scope.keys).to.not.exist;
            scope.listKeys();

            expect(scope.keys.length).to.equal(1);
            expect(scope.keys[0]._id).to.equal('12345');
            expect(scope.keys[0].fingerprint).to.equal('asdf');
        });
    });

    describe('getFingerprint', function() {
        it('should work', function() {
            var key = {
                fingerprint: 'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY'
            };

            scope.getFingerprint(key);

            expect(scope.fingerprint).to.equal('YYYY YYYY YYYY YYYY YYYY ... YYYY YYYY YYYY YYYY YYYY');
        });
    });

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
            }).yields();

            scope.listKeys = function() {
                done();
            };

            scope.importKey(keyArmored);
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

        it('should fail due to error in keychain.saveLocalPublicKey', function() {
            var keyArmored = '-----BEGIN PGP PUBLIC KEY BLOCK-----';

            pgpStub.getKeyParams.returns({
                _id: '12345',
                userId: 'max@example.com'
            });

            keychainStub.saveLocalPublicKey.yields(42);

            scope.importKey(keyArmored);

            expect(dialogStub.error.calledOnce).to.be.true;
        });
    });

    describe('removeKey', function() {
        it('should work', function(done) {
            var key = {
                _id: '12345'
            };

            keychainStub.removeLocalPublicKey.withArgs('12345').yields();

            scope.listKeys = function() {
                done();
            };

            scope.removeKey(key);
        });

        it('should fail due to error in keychain.removeLocalPublicKey', function() {
            var key = {
                _id: '12345'
            };

            keychainStub.removeLocalPublicKey.withArgs('12345').yields(42);

            scope.removeKey(key);

            expect(dialogStub.error.calledOnce).to.be.true;
        });
    });
});