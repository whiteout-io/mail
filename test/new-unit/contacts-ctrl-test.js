define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        ContactsCtrl = require('js/controller/contacts'),
        appController = require('js/app-controller'),
        KeychainDAO = require('js/dao/keychain-dao'),
        PGP = require('js/crypto/pgp');

    describe('Contacts Controller unit test', function() {
        var scope, contactsCtrl,
            origKeychain, keychainMock,
            origCrypto, cryptoMock;

        beforeEach(function() {
            origCrypto = appController._crypto;
            appController._crypto = cryptoMock = sinon.createStubInstance(PGP);
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
            appController._crypto = origCrypto;
            appController._keychain = origKeychain;
        });

        describe('scope variables', function() {
            it('should be set correctly', function() {
                expect(scope.fingerprint).to.equal('XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX');
                expect(scope.state.contacts.open).to.be.false;
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
                cryptoMock.getKeyParams.returns({
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
                var keyArmored = 'ARMORED PUBLICKEY';

                cryptoMock.getKeyParams.returns({
                    _id: '12345',
                    userId: 'max@example.com'
                });

                keychainMock.saveLocalPublicKey.withArgs({
                    _id: '12345',
                    userId: 'max@example.com',
                    publicKey: 'ARMORED PUBLICKEY'
                }).yields();

                scope.listKeys = function() {
                    done();
                };

                scope.importKey(keyArmored);
            });

            it('should fail due to error in keychain.saveLocalPublicKey', function(done) {
                var keyArmored = 'ARMORED PUBLICKEY';

                cryptoMock.getKeyParams.returns({
                    _id: '12345',
                    userId: 'max@example.com'
                });

                keychainMock.saveLocalPublicKey.withArgs({
                    _id: '12345',
                    userId: 'max@example.com',
                    publicKey: 'ARMORED PUBLICKEY'
                }).yields(42);

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
});