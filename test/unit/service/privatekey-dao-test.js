'use strict';

var Auth = require('../../../src/js/service/auth'),
    PrivateKey = require('../../../src/js/service/privatekey'),
    PGP = require('../../../src/js/crypto/pgp'),
    Crypto = require('../../../src/js/crypto/crypto'),
    axe = require('axe-logger'),
    appConfig = require('../../../src/js/app-config'),
    util = require('crypto-lib').util,
    Mailbuild = require('mailbuild'),
    mailreader = require('mailreader'),
    ImapClient = require('imap-client');

describe('Private Key DAO unit tests', function() {

    var privkeyDao, authStub, pgpStub, cryptoStub, imapClientStub,
        emailAddress = 'test@example.com',
        keyId = '12345',
        salt = util.random(appConfig.config.symKeySize),
        iv = util.random(appConfig.config.symIvSize),
        encryptedPrivateKey = util.random(1024 * 8);

    beforeEach(function() {
        authStub = sinon.createStubInstance(Auth);
        authStub.emailAddress = emailAddress;
        pgpStub = sinon.createStubInstance(PGP);
        cryptoStub = sinon.createStubInstance(Crypto);
        privkeyDao = new PrivateKey(authStub, Mailbuild, mailreader, appConfig, pgpStub, cryptoStub, axe);
        imapClientStub = sinon.createStubInstance(ImapClient);
        privkeyDao._imap = imapClientStub;
    });

    afterEach(function() {});

    describe('destroy', function() {
        it('should work', function(done) {
            privkeyDao.destroy().then(function() {
                expect(imapClientStub.logout.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('encrypt', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.encrypt().catch(function(err) {
                expect(err.message).to.match(/Incomplete/);
                done();
            });
        });

        it('should work', function(done) {
            cryptoStub.deriveKey.returns(resolves('derivedKey'));
            pgpStub.exportKeys.returns(resolves({
                keyId: keyId,
                privateKeyArmored: 'PGP BLOCK'
            }));
            cryptoStub.encrypt.returns(resolves(encryptedPrivateKey));

            privkeyDao.encrypt('asdf').then(function(encryptedKey) {
                expect(encryptedKey._id).to.equal(keyId);
                expect(encryptedKey.encryptedPrivateKey).to.equal(encryptedPrivateKey);
                expect(encryptedKey.salt).to.exist;
                expect(encryptedKey.iv).to.exist;
                done();
            });
        });
    });

    describe('upload', function() {
        beforeEach(function() {
            sinon.stub(privkeyDao, '_getFolder');
        });

        afterEach(function() {
            privkeyDao._getFolder.restore();
        });

        it('should fail due to invalid args', function(done) {
            privkeyDao.upload({}).catch(function(err) {
                expect(err.message).to.match(/Incomplete/);
                done();
            });
        });

        it('should work without existing folder', function(done) {
            var IMAP_KEYS_FOLDER = 'openpgp_keys';
            var fullPath = 'INBOX.' + IMAP_KEYS_FOLDER;

            privkeyDao._getFolder.returns(rejects(new Error()));
            imapClientStub.createFolder.withArgs({
                path: IMAP_KEYS_FOLDER
            }).returns(resolves(fullPath));
            imapClientStub.uploadMessage.withArgs(sinon.match(function(arg) {
                expect(arg.path).to.equal(fullPath);
                expect(arg.message).to.exist;
                return true;
            })).returns(resolves());

            privkeyDao.upload({
                _id: keyId,
                userId: emailAddress,
                encryptedPrivateKey: encryptedPrivateKey,
                salt: salt,
                iv: iv
            }).then(function() {
                expect(privkeyDao._getFolder.calledOnce).to.be.true;
                expect(imapClientStub.createFolder.calledOnce).to.be.true;
                expect(imapClientStub.uploadMessage.calledOnce).to.be.true;
                done();
            });
        });

        it('should work with existing folder', function(done) {
            var IMAP_KEYS_FOLDER = 'openpgp_keys';
            var fullPath = 'INBOX.' + IMAP_KEYS_FOLDER;

            privkeyDao._getFolder.returns(resolves(fullPath));
            imapClientStub.uploadMessage.withArgs(sinon.match(function(arg) {
                expect(arg.path).to.equal(fullPath);
                expect(arg.message).to.exist;
                return true;
            })).returns(resolves());

            privkeyDao.upload({
                _id: keyId,
                userId: emailAddress,
                encryptedPrivateKey: encryptedPrivateKey,
                salt: salt,
                iv: iv
            }).then(function() {
                expect(privkeyDao._getFolder.calledOnce).to.be.true;
                expect(imapClientStub.createFolder.called).to.be.false;
                expect(imapClientStub.uploadMessage.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('isSynced', function() {
        beforeEach(function() {
            sinon.stub(privkeyDao, '_getFolder');
            sinon.stub(privkeyDao, '_fetchMessage');
        });
        afterEach(function() {
            privkeyDao._getFolder.restore();
            privkeyDao._fetchMessage.restore();
        });

        it('should be synced', function(done) {

            privkeyDao._getFolder.returns(resolves('foo'));
            privkeyDao._fetchMessage.returns(resolves({}));

            privkeyDao.isSynced().then(function(synced) {
                expect(synced).to.be.true;
                expect(privkeyDao._getFolder.calledOnce).to.be.true;
                expect(privkeyDao._fetchMessage.calledOnce).to.be.true;

                done();
            });
        });

        it('should not be synced', function(done) {
            privkeyDao._getFolder.returns(resolves());
            privkeyDao._fetchMessage.returns(resolves());

            privkeyDao.isSynced().then(function(synced) {
                expect(synced).to.be.false;
                expect(privkeyDao._getFolder.calledOnce).to.be.true;
                expect(privkeyDao._fetchMessage.calledOnce).to.be.true;

                done();
            });
        });

        it('should not be synced in case of error', function(done) {
            privkeyDao._getFolder.returns(rejects(new Error()));

            privkeyDao.isSynced().then(function(synced) {
                expect(synced).to.be.false;
                expect(privkeyDao._getFolder.calledOnce).to.be.true;

                done();
            });
        });

        it('should not be synced in case of error', function(done) {
            privkeyDao._getFolder.returns(resolves('foo'));
            privkeyDao._fetchMessage.returns(rejects(new Error()));

            privkeyDao.isSynced().then(function(synced) {
                expect(synced).to.be.false;
                expect(privkeyDao._getFolder.calledOnce).to.be.true;
                expect(privkeyDao._fetchMessage.calledOnce).to.be.true;

                done();
            });
        });
    });

    describe('download', function() {
        var base64Content = 'AYzsvV+hGMMT4BIl/XFjbl60BaM5DpDYVNyKPnoZ4ZyW1qy1udkQR7VUeNKJw5v2gWOqc3y6KHkZIqybOVro6e8tzhK1Fvpz+rgmME0tbrrh/Dd6QMBXb9c6ZAzgbLdq0sxftqXO9GoxINAVcfGN/MkcOIhonEjIsLSaYY2WLuGOLp8ZNdgO0tPxfcdd/f1hVXH2JRYmkOwStH3y2uYDmUhEWWeLfP2vF57F4NgtK2Ln4Ypn4VDx1SWtI6E1IMpwchpwXssBwzY2uWKUPNbWEwEYDU6pleWCKphc2YBp0ohJg1HfE+Et9/8wsZtQAjTiigZuovRd5ABd6LkCCuPNenmzKvR5os8fbe9HDsAiDYl5OrA1iGTWVcAKec1OWxRWKn3Ktt/v+W39gxvmA6OOSuPkA3PF+1rY2lU05busVlNVmNmv6vY3LTJz4J/jVPP7Bn6+Wl/BwdGC7OagZCORmDUujk4AaIz5y+x/hgS6g9yY8oaY5EGdFCxRpS7aptqiBNIXIpuxGtKZpP3bmjI4pIcVb4xTA57SFTE7czfvlvTjvBSCQP7MGYCNC+SbDRgt1beyM8uUrKiuLTWK+YJ6rvcIvOIEqvUBDR7ak+9S6+fyxw033vNHfQSAagIUC1eq+c8yoUzvtSRISOMEbu7MnjI5i4AQrD5yfJDJdp5NTpZ0Dz3fW3RVmMhghTGN3ch+6vVwkzO2ik11EGTqwaLfOgZuwunEonXLT4v4fJjIFvsl+hMab0keksuW1G8AQCdkNcgDfxMTIz6S/k51yVIGE2DZo1e1LTc7pu8gOCNHtuNMuwzDTZuutWdd0P93ZL7W6j1eq33DShX2zeuxk5S28crn6DdlK5QBYMSpECU1JDKRu1QMBNtiEgGlJaVOi1AQ+cDdZKthMYfJ0MPHCeRyQFMpEYkYUBfhBMnGaiDTmDFMvEy0WGhabKChhtdBF/rlyug8Kx9M60lx1t9dYVbxSmWkqWgUZ36vRwQXPVEWWmRROHtG/V9+CSPCCa9heDDqqj8nKzL0vK9kBG8nh2XlPAVg7ICicTLw0u93pz4US3pRKwfMys1mQNV0z0k0uXB1zJZqDrIsCihcUMC2vFOXg+dNlanPXeP8AMp3ojuMPAClIt+bxTyrjZ7MV0mkDuaWUaeEq2xuaU5cKlG1Aam6vSb3jmURgEzOk1onlkGrCfVUTne18W8V6KL7iG+lX+331baiZVGoMUXT++0T05KYBdTRYL0OZ0P3OPRqilPpxaZCY0NG5rJxC5ij0vnu9ECAvN3xSdiRF7SobVSVFIdc32aY24nLKv8/gSnROgmQbAqeCMOz0bULRyVTe0lzSXBcCgu5gK+KEo8p38trTSJ/S95sKQnyNbrnz2QOIXvzxLrL6/nnC/4pwxXKZ6XqB/2zLVfiJRjUQ1NUC0xDXA==';
        var root = [{
            type: 'attachment',
            content: util.binStr2Uint8Arr(util.base642Str(base64Content))
        }];

        beforeEach(function() {
            sinon.stub(privkeyDao, '_getFolder');
            sinon.stub(privkeyDao, '_fetchMessage');
            sinon.stub(privkeyDao, '_parse');
        });
        afterEach(function() {
            privkeyDao._getFolder.restore();
            privkeyDao._fetchMessage.restore();
            privkeyDao._parse.restore();
        });

        it('should fail if key not synced', function(done) {
            privkeyDao._getFolder.returns(resolves('foo'));
            privkeyDao._fetchMessage.returns(resolves());

            privkeyDao.download({
                userId: emailAddress,
                keyId: keyId
            }).catch(function(err) {
                expect(err.message).to.match(/not synced/);
                done();
            });
        });

        it('should work', function(done) {
            privkeyDao._getFolder.returns(resolves('foo'));
            privkeyDao._fetchMessage.returns(resolves({}));
            imapClientStub.getBodyParts.returns(resolves());
            privkeyDao._parse.returns(resolves(root));

            privkeyDao.download({
                userId: emailAddress,
                keyId: keyId
            }).then(function(privkey) {
                expect(privkey._id).to.equal(keyId);
                expect(privkey.userId).to.equal(emailAddress);
                expect(privkey.encryptedPrivateKey).to.exist;
                done();
            });
        });
    });

    describe('decrypt', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao.decrypt({}).catch(function(err) {
                expect(err.message).to.match(/Incomplete/);
                done();
            });
        });

        it('should fail for invalid code', function(done) {
            cryptoStub.deriveKey.returns(resolves('derivedKey'));
            cryptoStub.decrypt.returns(rejects(new Error()));

            privkeyDao.decrypt({
                _id: keyId,
                userId: emailAddress,
                code: 'asdf',
                encryptedPrivateKey: encryptedPrivateKey,
                salt: salt,
                iv: iv
            }).catch(function(err) {
                expect(err.message).to.match(/Invalid/);
                done();
            });
        });

        it('should  fail for invalid key params', function(done) {
            cryptoStub.deriveKey.returns(resolves('derivedKey'));
            cryptoStub.decrypt.returns(resolves('PGP BLOCK'));
            pgpStub.getKeyParams.returns({
                _id: '7890',
                userId: emailAddress
            });

            privkeyDao.decrypt({
                _id: keyId,
                userId: emailAddress,
                code: 'asdf',
                encryptedPrivateKey: encryptedPrivateKey,
                salt: salt,
                iv: iv
            }).catch(function(err) {
                expect(err.message).to.match(/key parameters/);
                done();
            });
        });

        it('should work', function(done) {
            cryptoStub.deriveKey.returns(resolves('derivedKey'));
            cryptoStub.decrypt.returns(resolves('PGP BLOCK'));
            pgpStub.getKeyParams.returns({
                _id: keyId,
                userId: emailAddress
            });

            privkeyDao.decrypt({
                _id: keyId,
                userId: emailAddress,
                code: 'asdf',
                encryptedPrivateKey: encryptedPrivateKey,
                salt: salt,
                iv: iv
            }).then(function(privkey) {
                expect(privkey._id).to.equal(keyId);
                expect(privkey.userId).to.equal(emailAddress);
                expect(privkey.encryptedKey).to.equal('PGP BLOCK');
                done();
            });
        });
    });

    describe('_getFolder', function() {
        it('should fail if imap folder does not exist', function(done) {
            imapClientStub.listWellKnownFolders.returns(resolves({
                Inbox: [{
                    path: 'INBOX'
                }],
                Other: [{
                    path: 'foo'
                }]
            }));

            privkeyDao._getFolder().catch(function(err) {
                expect(err.message).to.match(/Imap folder/);
                expect(imapClientStub.listWellKnownFolders.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            imapClientStub.listWellKnownFolders.returns(resolves({
                Inbox: [{
                    path: 'INBOX'
                }],
                Other: [{
                    path: 'openpgp_keys'
                }]
            }));

            privkeyDao._getFolder().then(function(path) {
                expect(path).to.equal('openpgp_keys');
                expect(imapClientStub.listWellKnownFolders.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('_fetchMessage', function() {
        it('should fail due to invalid args', function(done) {
            privkeyDao._fetchMessage({}).catch(function(err) {
                expect(err.message).to.match(/Incomplete/);
                done();
            });
        });


        it('should work', function(done) {
            imapClientStub.listMessages.returns(resolves([{
                subject: keyId
            }]));

            privkeyDao._fetchMessage({
                userId: emailAddress,
                keyId: keyId
            }).then(function(msg) {
                expect(msg.subject).to.equal(keyId);
                expect(imapClientStub.listMessages.calledOnce).to.be.true;
                done();
            });
        });

        it('should work with path prefix', function(done) {
            imapClientStub.listMessages.returns(resolves([{
                subject: keyId
            }]));

            privkeyDao._fetchMessage({
                userId: emailAddress,
                keyId: keyId
            }).then(function(msg) {
                expect(msg.subject).to.equal(keyId);
                expect(imapClientStub.listMessages.calledOnce).to.be.true;
                done();
            });
        });

        it('should work for not matching message', function(done) {
            imapClientStub.listMessages.returns(resolves([{
                subject: '7890'
            }]));

            privkeyDao._fetchMessage({
                userId: emailAddress,
                keyId: keyId
            }).then(function(msg) {
                expect(msg).to.not.exist;
                done();
            });
        });

        it('should work for no messages', function(done) {
            imapClientStub.listMessages.returns(resolves([]));

            privkeyDao._fetchMessage({
                userId: emailAddress,
                keyId: keyId
            }).then(function(msg) {
                expect(msg).to.not.exist;
                done();
            });
        });
    });

    describe('_parse', function() {
        var root = {
            foo: 'bar'
        };

        beforeEach(function() {
            sinon.stub(mailreader, 'parse');
        });
        afterEach(function() {
            mailreader.parse.restore();
        });

        it('should fail', function(done) {
            mailreader.parse.yields(new Error('asdf'));

            privkeyDao._parse().catch(function(err) {
                expect(err.message).to.match(/asdf/);
                done();
            });
        });

        it('should work', function(done) {
            mailreader.parse.yields(null, root);

            privkeyDao._parse().then(function(res) {
                expect(res).to.equal(root);
                done();
            });
        });
    });

});