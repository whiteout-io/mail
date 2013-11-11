define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        AccountCtrl = require('js/controller/account'),
        EmailDAO = require('js/dao/email-dao'),
        PGP = require('js/crypto/pgp'),
        dl = require('js/util/download'),
        appController = require('js/app-controller');

    describe('Account Controller unit test', function() {
        var scope, accountCtrl, origEmailDao, emailDaoMock,
            dummyFingerprint, expectedFingerprint,
            dummyKeyId, expectedKeyId,
            emailAddress,
            keySize,
            cryptoMock;

        beforeEach(function() {
            origEmailDao = appController._emailDao;
            cryptoMock = sinon.createStubInstance(PGP);
            emailDaoMock = sinon.createStubInstance(EmailDAO);
            emailDaoMock._crypto = cryptoMock;
            appController._emailDao = emailDaoMock;

            dummyFingerprint = '3A2D39B4E1404190B8B949DE7D7E99036E712926';
            expectedFingerprint = '3A2D 39B4 E140 4190 B8B9 49DE 7D7E 9903 6E71 2926';
            dummyKeyId = '9FEB47936E712926';
            expectedKeyId = '6E712926';
            cryptoMock.getFingerprint.returns(dummyFingerprint);
            cryptoMock.getKeyId.returns(dummyKeyId);
            emailAddress = 'fred@foo.com';
            keySize = 1234;
            emailDaoMock._account = {
                emailAddress: emailAddress,
                asymKeySize: keySize
            };

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

        afterEach(function() {
            // restore the module
            appController._emailDao = origEmailDao;
        });

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
                cryptoMock.exportKeys.yields(null, {
                    publicKeyArmored: 'a',
                    privateKeyArmored: 'b',
                    keyId: dummyKeyId
                });
                createDownloadMock.withArgs(sinon.match(function(arg) {
                    return arg.content === 'ab' && arg.filename === expectedKeyId + '.asc' && arg.contentType === 'text/plain';
                })).yields();

                scope.exportKeyFile();

                expect(cryptoMock.exportKeys.calledOnce).to.be.true;
                expect(dl.createDownload.calledOnce).to.be.true;
                dl.createDownload.restore();
            });

            it('should not work when key export failed', function(done) {
                cryptoMock.exportKeys.yields(new Error('asdasd'));
                scope.onError = function() {
                    expect(cryptoMock.exportKeys.calledOnce).to.be.true;
                    done();
                };

                scope.exportKeyFile();
            });

            it('should not work when create download failed', function(done) {
                var createDownloadMock = sinon.stub(dl, 'createDownload');
                cryptoMock.exportKeys.yields(null, {
                    publicKeyArmored: 'a',
                    privateKeyArmored: 'b',
                    keyId: dummyKeyId
                });
                createDownloadMock.withArgs(sinon.match(function(arg) {
                    return arg.content === 'ab' && arg.filename === expectedKeyId + '.asc' && arg.contentType === 'text/plain';
                })).yields(new Error('asdasd'));
                scope.onError = function() {
                    expect(cryptoMock.exportKeys.calledOnce).to.be.true;
                    expect(dl.createDownload.calledOnce).to.be.true;
                    dl.createDownload.restore();
                    done();
                };

                scope.exportKeyFile();
            });
        });
    });
});