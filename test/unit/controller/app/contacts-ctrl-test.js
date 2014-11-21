'use strict';

var mocks = angular.mock,
    ContactsCtrl = require('../../src/js/controller/contacts'),
    appController = require('../../src/js/app-controller'),
    KeychainDAO = require('../../src/js/dao/keychain-dao'),
    PGP = require('../../src/js/crypto/pgp');

describe('Contacts Controller unit test', function() {
    var scope, contactsCtrl,
        origKeychain, keychainMock,
        origPgp, pgpMock;

    beforeEach(function() {
        origPgp = appController._pgp;
        appController._pgp = pgpMock = sinon.createStubInstance(PGP);
        origKeychain = appController._keychain;
        appController._keychain = keychainMock = sinon.createStubInstance(KeychainDAO);

        angular.module('contactstest', []);
        mocks.module('contactstest');
        mocks.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {};
            contactsCtrl = $controller(ContactsCtrl, {
                $scope: scope
            });
        });
    });

    afterEach(function() {
        // restore the module
        appController._pgp = origPgp;
        appController._keychain = origKeychain;
    });

    describe('scope variables', function() {
        it('should be set correctly', function() {
            expect(scope.state.contacts.toggle).to.exist;
        });
    });

    describe('listKeys', function() {
        it('should fail due to error in keychain.listLocalPublicKeys', function(done) {
            keychainMock.listLocalPublicKeys.yields(42);

            scope.onError = function(err) {
                expect(err).to.equal(42);
                done();
            };

            scope.listKeys();
        });

        it('should work', function(done) {
            keychainMock.listLocalPublicKeys.yields(null, [{
                _id: '12345'
            }]);
            pgpMock.getKeyParams.returns({
                fingerprint: 'asdf'
            });

            scope.$apply = function() {
                expect(scope.keys.length).to.equal(1);
                expect(scope.keys[0]._id).to.equal('12345');
                expect(scope.keys[0].fingerprint).to.equal('asdf');
                done();
            };

            expect(scope.keys).to.not.exist;
            scope.listKeys();
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

            pgpMock.getKeyParams.returns({
                _id: '12345',
                userId: 'max@example.com',
                userIds: []
            });

            keychainMock.saveLocalPublicKey.withArgs({
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

        it('should fail due to invalid armored key', function(done) {
            var keyArmored = '-----BEGIN PGP PRIVATE KEY BLOCK-----';

            scope.onError = function(err) {
                expect(err).to.exist;
                done();
            };

            scope.importKey(keyArmored);
        });

        it('should fail due to error in pgp.getKeyParams', function(done) {
            var keyArmored = '-----BEGIN PGP PUBLIC KEY BLOCK-----';

            pgpMock.getKeyParams.throws(new Error('WAT'));

            scope.onError = function(err) {
                expect(err).to.exist;
                done();
            };

            scope.importKey(keyArmored);
        });

        it('should fail due to error in keychain.saveLocalPublicKey', function(done) {
            var keyArmored = '-----BEGIN PGP PUBLIC KEY BLOCK-----';

            pgpMock.getKeyParams.returns({
                _id: '12345',
                userId: 'max@example.com'
            });

            keychainMock.saveLocalPublicKey.yields(42);

            scope.onError = function(err) {
                expect(err).to.equal(42);
                done();
            };

            scope.importKey(keyArmored);
        });
    });

    describe('removeKey', function() {
        it('should work', function(done) {
            var key = {
                _id: '12345'
            };

            keychainMock.removeLocalPublicKey.withArgs('12345').yields();

            scope.listKeys = function() {
                done();
            };

            scope.removeKey(key);
        });

        it('should fail due to error in keychain.removeLocalPublicKey', function(done) {
            var key = {
                _id: '12345'
            };

            keychainMock.removeLocalPublicKey.withArgs('12345').yields(42);

            scope.onError = function(err) {
                expect(err).to.equal(42);
                done();
            };

            scope.removeKey(key);
        });
    });
});