'use strict';

var mocks = angular.mock,
    AccountCtrl = require('../../src/js/controller/account'),
    PGP = require('../../src/js/crypto/pgp'),
    dl = require('../../src/js/util/download'),
    appController = require('../../src/js/app-controller'),
    KeychainDAO = require('../../src/js/dao/keychain-dao');

describe('Account Controller unit test', function() {
    var scope, accountCtrl,
        dummyFingerprint, expectedFingerprint,
        dummyKeyId, expectedKeyId,
        emailAddress, keySize, pgpMock, keychainMock;

    beforeEach(function() {
        appController._pgp = pgpMock = sinon.createStubInstance(PGP);
        appController._keychain = keychainMock = sinon.createStubInstance(KeychainDAO);

        dummyFingerprint = '3A2D39B4E1404190B8B949DE7D7E99036E712926';
        expectedFingerprint = '3A2D 39B4 E140 4190 B8B9 49DE 7D7E 9903 6E71 2926';
        dummyKeyId = '9FEB47936E712926';
        expectedKeyId = '6E712926';
        pgpMock.getFingerprint.returns(dummyFingerprint);
        pgpMock.getKeyId.returns(dummyKeyId);
        emailAddress = 'fred@foo.com';
        keySize = 1234;
        appController._emailDao = {
            _account: {
                emailAddress: emailAddress,
                asymKeySize: keySize
            }
        };
        pgpMock.getKeyParams.returns({
            _id: dummyKeyId,
            fingerprint: dummyFingerprint,
            userId: emailAddress,
            bitSize: keySize
        });

        angular.module('accounttest', []);
        mocks.module('accounttest');
        mocks.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {};
            accountCtrl = $controller(AccountCtrl, {
                $scope: scope
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
        it('should work', function() {
            var createDownloadMock = sinon.stub(dl, 'createDownload');
            keychainMock.getUserKeyPair.withArgs(emailAddress).yields(null, {
                publicKey: {
                    _id: dummyKeyId,
                    publicKey: 'a'
                },
                privateKey: {
                    encryptedKey: 'b'
                }
            });
            createDownloadMock.withArgs(sinon.match(function(arg) {
                return arg.content === 'a\r\nb' && arg.filename === 'whiteout_mail_' + emailAddress + '_' + expectedKeyId + '.asc' && arg.contentType === 'text/plain';
            })).returns();

            scope.exportKeyFile();

            expect(scope.state.lightbox).to.equal(undefined);
            expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
            expect(dl.createDownload.calledOnce).to.be.true;
            dl.createDownload.restore();
        });

        it('should not work when key export failed', function(done) {
            keychainMock.getUserKeyPair.yields(new Error('Boom!'));
            scope.onError = function(err) {
                expect(err.message).to.equal('Boom!');
                expect(keychainMock.getUserKeyPair.calledOnce).to.be.true;
                done();
            };

            scope.exportKeyFile();
        });
    });
});