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
                $q: window.qMock,
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
        it('should fail due to error in keychain.listLocalPublicKeys', function(done) {
            keychainStub.listLocalPublicKeys.returns(rejects(42));

            scope.listKeys().then(function() {
                expect(dialogStub.error.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            keychainStub.listLocalPublicKeys.returns(resolves([{
                _id: '12345'
            }]));
            pgpStub.getKeyParams.returns({
                fingerprint: 'asdf',
                userIds: [{
                    name: 'Firstname Lastname',
                    emailAddress: 'first.last@example.com'
                }]
            });

            expect(scope.keys).to.not.exist;
            scope.listKeys().then(function() {
                expect(scope.keys.length).to.equal(1);
                expect(scope.keys[0]._id).to.equal('12345');
                expect(scope.keys[0].fingerprint).to.equal('asdf');
                expect(scope.keys[0].fullUserId).to.equal('Firstname Lastname <first.last@example.com>');
                done();
            });
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

    describe('removeKey', function() {
        it('should work', function(done) {
            var key = {
                _id: '12345'
            };

            keychainStub.removeLocalPublicKey.withArgs('12345').returns(resolves());

            scope.listKeys = function() {};

            scope.removeKey(key).then(function() {
                done();
            });
        });

        it('should fail due to error in keychain.removeLocalPublicKey', function(done) {
            var key = {
                _id: '12345'
            };

            keychainStub.removeLocalPublicKey.withArgs('12345').returns(rejects(42));

            scope.removeKey(key).then(function() {
                expect(dialogStub.error.calledOnce).to.be.true;
                done();
            });
        });
    });
});