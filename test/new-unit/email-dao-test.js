define(function(require) {
    'use strict';

    var EmailDAO = require('js/dao/email-dao'),
        KeychainDAO = require('js/dao/keychain-dao'),
        ImapClient = require('imap-client'),
        PgpMailer = require('pgpmailer'),
        PgpBuilder = require('pgpbuilder'),
        PGP = require('js/crypto/pgp'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        mailreader = require('mailreader'),
        str = require('js/app-config').string,
        expect = chai.expect;

    chai.Assertion.includeStack = true;

    describe('Email DAO unit tests', function() {
        var dao, keychainStub, imapClientStub, pgpMailerStub, pgpBuilderStub, pgpStub, devicestorageStub;

        var emailAddress, passphrase, asymKeySize, mockkeyId, dummyEncryptedMail,
            dummyDecryptedMail, mockKeyPair, account, verificationMail, verificationUuid,
            corruptedVerificationMail, corruptedVerificationUuid,
            nonWhitelistedMail;

        beforeEach(function(done) {
            emailAddress = 'asdf@asdf.com';
            passphrase = 'asdf';
            asymKeySize = 2048;
            mockkeyId = 1234;
            dummyEncryptedMail = {
                uid: 1234,
                from: [{
                    address: 'asd@asd.de'
                }],
                to: [{
                    address: 'qwe@qwe.de'
                }],
                subject: 'qweasd',
                body: '-----BEGIN PGP MESSAGE-----\nasd\n-----END PGP MESSAGE-----',
                unread: false,
                answered: false
            };
            verificationUuid = '9A858952-17EE-4273-9E74-D309EAFDFAFB';
            verificationMail = {
                from: [{
                    name: 'Whiteout Test',
                    address: 'whiteout.test@t-online.de'
                }], // sender address
                to: [{
                    address: 'safewithme.testuser@gmail.com'
                }], // list of receivers
                subject: "[whiteout] New public key uploaded", // Subject line
                body: 'yadda yadda bla blabla foo bar https://keys.whiteout.io/verify/' + verificationUuid, // plaintext body
                unread: false,
                answered: false
            };
            corruptedVerificationUuid = 'OMFG_FUCKING_BASTARD_UUID_FROM_HELL!';
            corruptedVerificationMail = {
                from: [{
                    name: 'Whiteout Test',
                    address: 'whiteout.test@t-online.de'
                }], // sender address
                to: [{
                    address: 'safewithme.testuser@gmail.com'
                }], // list of receivers
                subject: "[whiteout] New public key uploaded", // Subject line
                body: 'yadda yadda bla blabla foo bar https://keys.whiteout.io/verify/' + corruptedVerificationUuid, // plaintext body
                unread: false,
                answered: false
            };
            dummyDecryptedMail = {
                uid: 1234,
                from: [{
                    address: 'asd@asd.de'
                }],
                to: [{
                    address: 'qwe@qwe.de'
                }],
                subject: 'qweasd',
                body: 'Content-Type: multipart/signed;\r\n  boundary="Apple-Mail=_1D8756C0-F347-4D7A-A8DB-7869CBF14FD2";\r\n    protocol="application/pgp-signature";\r\n   micalg=pgp-sha512\r\n\r\n\r\n--Apple-Mail=_1D8756C0-F347-4D7A-A8DB-7869CBF14FD2\r\nContent-Type: multipart/mixed;\r\n   boundary="Apple-Mail=_8ED7DC84-6AD9-4A08-8327-80B62D6BCBFA"\r\n\r\n\r\n--Apple-Mail=_8ED7DC84-6AD9-4A08-8327-80B62D6BCBFA\r\nContent-Transfer-Encoding: 7bit\r\nContent-Type: text/plain;\r\n   charset=us-ascii\r\n\r\nasdasd \r\n--Apple-Mail=_8ED7DC84-6AD9-4A08-8327-80B62D6BCBFA\r\nContent-Disposition: attachment;\r\n   filename=dummy.txt\r\nContent-Type: text/plain;\r\n name="dummy.txt"\r\nContent-Transfer-Encoding: 7bit\r\n\r\noaudbcoaurbvosuabvlasdjbfalwubjvawvb\r\n--Apple-Mail=_8ED7DC84-6AD9-4A08-8327-80B62D6BCBFA--\r\n\r\n--Apple-Mail=_1D8756C0-F347-4D7A-A8DB-7869CBF14FD2\r\nContent-Transfer-Encoding: 7bit\r\nContent-Disposition: attachment;\r\n    filename=signature.asc\r\nContent-Type: application/pgp-signature;\r\n  name=signature.asc\r\nContent-Description: Message signed with OpenPGP using GPGMail\r\n\r\n-----BEGIN PGP SIGNATURE-----\r\nComment: GPGTools - https://gpgtools.org\r\n\r\niQEcBAEBCgAGBQJS2kO1AAoJEDzmUwH7XO/cP+YH/2PSBxX1ZZd83Uf9qBGDY807\r\niHOdgPFXm64YjSnohO7XsPcnmihqP1ipS2aaCXFC3/Vgb9nc4isQFS+i1VdPwfuR\r\n1Pd2l3dC4/nD4xO9h/W6JW7Yd24NS5TJD5cA7LYwQ8LF+rOzByMatiTMmecAUCe8\r\nEEalEjuogojk4IacA8dg/bfLqQu9E+0GYUJBcI97dx/0jZ0qMOxbWOQLsJ3DnUnV\r\nOad7pAIbHEO6T0EBsH7TyTj4RRHkP6SKE0mm6ZYUC7KCk2Z3MtkASTxUrnqW5qZ5\r\noaXUO9GEc8KZcmbCdhZY2Y5h+dmucaO0jpbeSKkvtYyD4KZrSvt7NTb/0dSLh4Y=\r\n=G8km\r\n-----END PGP SIGNATURE-----\r\n\r\n--Apple-Mail=_1D8756C0-F347-4D7A-A8DB-7869CBF14FD2--\r\n',
                unread: false,
                answered: false,
            };
            nonWhitelistedMail = {
                uid: 1234,
                from: [{
                    address: 'asd@asd.de'
                }],
                to: [{
                    address: 'qwe@qwe.de'
                }],
                subject: 'qweasd',
                body: 'asd'
            };
            mockKeyPair = {
                publicKey: {
                    _id: mockkeyId,
                    userId: emailAddress,
                    publicKey: 'publicpublicpublicpublic'
                },
                privateKey: {
                    _id: mockkeyId,
                    userId: emailAddress,
                    encryptedKey: 'privateprivateprivateprivate'
                }
            };
            account = {
                emailAddress: emailAddress,
                asymKeySize: asymKeySize,
                busy: false
            };

            keychainStub = sinon.createStubInstance(KeychainDAO);
            imapClientStub = sinon.createStubInstance(ImapClient);
            pgpMailerStub = sinon.createStubInstance(PgpMailer);
            pgpBuilderStub = sinon.createStubInstance(PgpBuilder);
            pgpStub = sinon.createStubInstance(PGP);
            devicestorageStub = sinon.createStubInstance(DeviceStorageDAO);

            dao = new EmailDAO(keychainStub, pgpStub, devicestorageStub, pgpBuilderStub, mailreader);
            dao._account = account;

            expect(dao._keychain).to.equal(keychainStub);
            expect(dao._crypto).to.equal(pgpStub);
            expect(dao._devicestorage).to.equal(devicestorageStub);

            // connect
            expect(dao._imapClient).to.not.exist;
            expect(dao._smtpClient).to.not.exist;
            expect(dao._account.online).to.be.undefined;
            dao._account.folders = [];
            imapClientStub.login.yields();

            dao.onConnect({
                imapClient: imapClientStub,
                pgpMailer: pgpMailerStub
            }, function(err) {
                expect(err).to.not.exist;
                expect(dao._account.online).to.be.true;
                expect(dao._imapClient).to.equal(dao._imapClient);
                expect(dao._smtpClient).to.equal(dao._smtpClient);
                done();
            });
        });

        afterEach(function(done) {
            dao.onDisconnect(null, function(err) {
                expect(err).to.not.exist;
                expect(dao._account.online).to.be.false;
                expect(dao._imapClient).to.not.exist;
                expect(dao._smtpClient).to.not.exist;
                done();
            });
        });

        describe('push', function() {
            it('should work', function(done) {
                var o = {};

                dao.onIncomingMessage = function(obj) {
                    expect(obj).to.equal(o);
                    done();
                };

                dao._imapClient.onIncomingMessage(o);
            });
        });

        describe('init', function() {
            beforeEach(function() {
                delete dao._account;
            });

            it('should init', function(done) {
                var listFolderStub, folders;

                folders = [{}, {}];

                // initKeychain
                devicestorageStub.init.withArgs(emailAddress).yields();
                keychainStub.getUserKeyPair.yields(null, mockKeyPair);

                // initFolders
                listFolderStub = sinon.stub(dao, '_imapListFolders');
                listFolderStub.yields(null, folders);

                dao.init({
                    account: account
                }, function(err, keyPair) {
                    expect(err).to.not.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.online).to.be.false;
                    expect(keyPair).to.equal(mockKeyPair);

                    expect(dao._account).to.equal(account);
                    expect(dao._account.folders).to.equal(folders);
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;

                    expect(listFolderStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should not fail when offline', function(done) {
                var listFolderStub;

                // initKeychain
                devicestorageStub.init.withArgs(emailAddress).yields();
                keychainStub.getUserKeyPair.yields(null, mockKeyPair);

                // initFolders
                listFolderStub = sinon.stub(dao, '_imapListFolders');
                listFolderStub.yields({
                    code: 42
                });

                dao.init({
                    account: account
                }, function(err, keyPair) {
                    expect(err).to.not.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.online).to.be.false;
                    expect(keyPair).to.equal(mockKeyPair);

                    expect(dao._account).to.equal(account);
                    expect(dao._account.folders).to.equal(undefined);
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;
                    expect(listFolderStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail due to error while listing folders', function(done) {
                var listFolderStub;

                // initKeychain
                devicestorageStub.init.withArgs(emailAddress).yields();
                keychainStub.getUserKeyPair.yields(null, mockKeyPair);

                // initFolders
                listFolderStub = sinon.stub(dao, '_imapListFolders');
                listFolderStub.yields({});

                dao.init({
                    account: account
                }, function(err, keyPair) {
                    expect(err).to.exist;
                    expect(keyPair).to.not.exist;

                    expect(dao._account).to.equal(account);
                    expect(devicestorageStub.init.calledOnce).to.be.true;
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;
                    expect(listFolderStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail due to error in getUserKeyPair', function(done) {
                devicestorageStub.init.yields();
                keychainStub.getUserKeyPair.yields({});

                dao.init({
                    account: account
                }, function(err, keyPair) {
                    expect(err).to.exist;
                    expect(keyPair).to.not.exist;

                    expect(devicestorageStub.init.calledOnce).to.be.true;

                    done();
                });
            });
        });

        describe('onConnect', function() {
            var imapLoginStub, imapListFoldersStub;

            beforeEach(function(done) {
                // imap login
                imapLoginStub = sinon.stub(dao, '_imapLogin');
                imapListFoldersStub = sinon.stub(dao, '_imapListFolders');

                dao.onDisconnect(null, function(err) {
                    expect(err).to.not.exist;
                    expect(dao._imapClient).to.not.exist;
                    expect(dao._smtpClient).to.not.exist;
                    expect(dao._account.online).to.be.false;
                    done();
                });
            });

            afterEach(function() {
                imapLoginStub.restore();
                imapListFoldersStub.restore();
            });

            it('should fail due to error in imap login', function(done) {
                imapLoginStub.yields({});

                dao.onConnect({
                    imapClient: imapClientStub,
                    pgpMailer: pgpMailerStub
                }, function(err) {
                    expect(err).to.exist;
                    expect(imapLoginStub.calledOnce).to.be.true;
                    expect(dao._account.online).to.be.false;
                    done();
                });
            });

            it('should work when folder already initiated', function(done) {
                dao._account.folders = [];
                imapLoginStub.yields();

                dao.onConnect({
                    imapClient: imapClientStub,
                    pgpMailer: pgpMailerStub
                }, function(err) {
                    expect(err).to.not.exist;
                    expect(dao._account.online).to.be.true;
                    expect(dao._imapClient).to.equal(dao._imapClient);
                    expect(dao._smtpClient).to.equal(dao._smtpClient);
                    done();
                });
            });

            it('should work when folder not yet initiated', function(done) {
                var folders = [];
                imapLoginStub.yields();
                imapListFoldersStub.yields(null, folders);

                dao.onConnect({
                    imapClient: imapClientStub,
                    pgpMailer: pgpMailerStub
                }, function(err) {
                    expect(err).to.not.exist;
                    expect(dao._account.online).to.be.true;
                    expect(dao._imapClient).to.equal(dao._imapClient);
                    expect(dao._smtpClient).to.equal(dao._smtpClient);
                    expect(dao._account.folders).to.deep.equal(folders);
                    done();
                });
            });
        });

        describe('unlock', function() {
            it('should unlock', function(done) {
                dao._pgpMailer = {
                    _pgpbuilder: {}
                };

                pgpStub.getKeyParams.returns({
                    userId: emailAddress
                });

                pgpStub.importKeys.withArgs({
                    passphrase: passphrase,
                    privateKeyArmored: mockKeyPair.privateKey.encryptedKey,
                    publicKeyArmored: mockKeyPair.publicKey.publicKey
                }).yields();
                pgpStub._privateKey = {
                    foo: 'bar'
                };

                dao.unlock({
                    passphrase: passphrase,
                    keypair: mockKeyPair
                }, function(err) {
                    expect(err).to.not.exist;

                    expect(pgpStub.importKeys.calledOnce).to.be.true;
                    expect(dao._pgpbuilder._privateKey).to.equal(pgpStub._privateKey);

                    done();
                });
            });

            it('should generate a keypair and unlock', function(done) {
                var keypair;

                dao._pgpMailer = {
                    _pgpbuilder: {}
                };

                keypair = {
                    keyId: 123,
                    publicKeyArmored: mockKeyPair.publicKey.publicKey,
                    privateKeyArmored: mockKeyPair.privateKey.encryptedKey
                };

                pgpStub.generateKeys.withArgs({
                    emailAddress: emailAddress,
                    keySize: asymKeySize,
                    passphrase: passphrase
                }).yields(null, keypair);

                pgpStub.importKeys.withArgs({
                    passphrase: passphrase,
                    privateKeyArmored: mockKeyPair.privateKey.encryptedKey,
                    publicKeyArmored: mockKeyPair.publicKey.publicKey
                }).yields();
                keychainStub.putUserKeyPair.withArgs().yields();

                dao.unlock({
                    passphrase: passphrase
                }, function(err) {
                    expect(err).to.not.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledOnce).to.be.true;
                    expect(keychainStub.putUserKeyPair.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when persisting fails', function(done) {
                var keypair = {
                    keyId: 123,
                    publicKeyArmored: 'qwerty',
                    privateKeyArmored: 'asdfgh'
                };
                pgpStub.generateKeys.yields(null, keypair);
                pgpStub.importKeys.withArgs().yields();
                keychainStub.putUserKeyPair.yields({});

                dao.unlock({
                    passphrase: passphrase
                }, function(err) {
                    expect(err).to.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledOnce).to.be.true;
                    expect(keychainStub.putUserKeyPair.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when import fails', function(done) {
                var keypair = {
                    keyId: 123,
                    publicKeyArmored: 'qwerty',
                    privateKeyArmored: 'asdfgh'
                };

                pgpStub.generateKeys.withArgs().yields(null, keypair);
                pgpStub.importKeys.withArgs().yields({});

                dao.unlock({
                    passphrase: passphrase
                }, function(err) {
                    expect(err).to.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;
                    expect(pgpStub.importKeys.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when generation fails', function(done) {
                pgpStub.generateKeys.yields({});

                dao.unlock({
                    passphrase: passphrase
                }, function(err) {
                    expect(err).to.exist;

                    expect(pgpStub.generateKeys.calledOnce).to.be.true;

                    done();
                });
            });
        });

        describe('_imapParseMessageBlock', function() {
            it('should parse a message', function(done) {
                var parseRfc = sinon.stub(mailreader, 'parseRfc').withArgs({}).yields();

                dao._imapParseMessageBlock({}, function() {
                    expect(parseRfc.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('_imapLogin', function() {
            it('should fail when disconnected', function(done) {
                dao.onDisconnect(null, function(err) {
                    expect(err).to.not.exist;

                    dao._imapLogin(function(err) {
                        expect(err.code).to.equal(42);
                        done();
                    });
                });
            });

            it('should work', function(done) {
                imapClientStub.login.yields();

                dao._imapLogin(function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });

            it('should fail due to error in imap login', function(done) {
                imapClientStub.login.yields({});

                dao._imapLogin(function(err) {
                    expect(err).to.exist;
                    done();
                });
            });
        });

        describe('_imapLogout', function() {
            it('should fail when disconnected', function(done) {
                dao.onDisconnect(null, function(err) {
                    expect(err).to.not.exist;

                    dao._imapLogout(function(err) {
                        expect(err.code).to.equal(42);
                        done();
                    });
                });
            });

            it('should work', function(done) {
                imapClientStub.logout.yields();

                dao._imapLogout(function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });

            it('should fail due to error in imap login', function(done) {
                imapClientStub.logout.yields({});

                dao._imapLogout(function(err) {
                    expect(err).to.exist;
                    done();
                });
            });
        });

        describe('_imapListFolders', function() {
            var dummyFolders = [{
                type: 'Inbox',
                path: 'INBOX'
            }, {
                type: 'Outbox',
                path: 'OUTBOX'
            }];

            it('should list from storage', function(done) {
                devicestorageStub.listItems.withArgs('folders').yields(null, [dummyFolders]);

                dao._imapListFolders(function(err, folders) {
                    expect(err).to.not.exist;
                    expect(devicestorageStub.listItems.calledOnce).to.be.true;
                    expect(folders[0].type).to.equal('Inbox');
                    done();
                });
            });

            it('should not list from storage due to error', function(done) {
                devicestorageStub.listItems.yields({});

                dao._imapListFolders(function(err, folders) {
                    expect(err).to.exist;
                    expect(folders).to.not.exist;
                    expect(devicestorageStub.listItems.calledOnce).to.be.true;
                    expect(imapClientStub.listWellKnownFolders.called).to.be.false;
                    done();
                });
            });

            it('should fail when disconnected', function(done) {
                devicestorageStub.listItems.yields(null, []);

                dao.onDisconnect(null, function(err) {
                    expect(err).to.not.exist;

                    dao._imapListFolders(function(err) {
                        expect(err.code).to.equal(42);
                        done();
                    });
                });
            });

            it('should list from imap', function(done) {
                devicestorageStub.listItems.yields(null, []);
                imapClientStub.listWellKnownFolders.yields(null, {
                    inbox: dummyFolders[0]
                });
                devicestorageStub.storeList.yields();

                dao._imapListFolders(function(err, folders) {
                    expect(err).to.not.exist;
                    expect(devicestorageStub.listItems.calledOnce).to.be.true;
                    expect(imapClientStub.listWellKnownFolders.calledOnce).to.be.true;
                    expect(devicestorageStub.storeList.calledOnce).to.be.true;
                    expect(folders[0].type).to.equal('Inbox');
                    done();
                });
            });

            it('should not list from imap due to store error', function(done) {
                devicestorageStub.listItems.yields(null, []);
                imapClientStub.listWellKnownFolders.yields(null, {
                    inbox: dummyFolders[0]
                });
                devicestorageStub.storeList.yields({});

                dao._imapListFolders(function(err, folders) {
                    expect(err).to.exist;
                    expect(folders).to.not.exist;
                    expect(devicestorageStub.listItems.calledOnce).to.be.true;
                    expect(imapClientStub.listWellKnownFolders.calledOnce).to.be.true;
                    expect(devicestorageStub.storeList.calledOnce).to.be.true;
                    done();
                });
            });

            it('should not list from imap due to imap error', function(done) {
                devicestorageStub.listItems.yields(null, []);
                imapClientStub.listWellKnownFolders.yields({});

                dao._imapListFolders(function(err, folders) {
                    expect(err).to.exist;
                    expect(folders).to.not.exist;
                    expect(devicestorageStub.listItems.calledOnce).to.be.true;
                    expect(imapClientStub.listWellKnownFolders.calledOnce).to.be.true;
                    expect(devicestorageStub.storeList.called).to.be.false;
                    done();
                });
            });
        });

        describe('_imapSearch', function() {
            it('should fail when disconnected', function(done) {
                dao.onDisconnect(null, function(err) {
                    expect(err).to.not.exist;

                    dao._imapSearch({}, function(err) {
                        expect(err.code).to.equal(42);
                        done();
                    });
                });
            });

            it('should work', function(done) {
                var path = 'FOLDAAAA';

                imapClientStub.search.withArgs({
                    path: path
                }).yields();

                dao._imapSearch({
                    folder: path
                }, done);
            });
            it('should work', function(done) {
                var path = 'FOLDAAAA';

                imapClientStub.search.withArgs({
                    path: path,
                    answered: true
                }).yields();

                dao._imapSearch({
                    folder: path,
                    answered: true
                }, done);
            });
            it('should work', function(done) {
                var path = 'FOLDAAAA';

                imapClientStub.search.withArgs({
                    path: path,
                    unread: true
                }).yields();

                dao._imapSearch({
                    folder: path,
                    unread: true
                }, done);
            });
        });

        describe('_imapDeleteMessage', function() {
            it('should fail when disconnected', function(done) {
                dao.onDisconnect(null, function(err) {
                    expect(err).to.not.exist;

                    dao._imapDeleteMessage({}, function(err) {
                        expect(err.code).to.equal(42);
                        done();
                    });
                });
            });

            it('should work', function(done) {
                var path = 'FOLDAAAA',
                    uid = 1337;

                imapClientStub.deleteMessage.withArgs({
                    path: path,
                    uid: uid
                }).yields();

                dao._imapDeleteMessage({
                    folder: path,
                    uid: uid
                }, done);
            });
        });

        describe('_imapListMessages', function() {
            it('should work', function(done) {
                var path = 'FOLDAAAA',
                    firstUid = 1337,
                    lastUid = 1339;

                imapClientStub.listMessagesByUid.withArgs({
                    path: path,
                    firstUid: firstUid,
                    lastUid: lastUid
                }).yields(null, []);

                dao._imapListMessages({
                    folder: path,
                    firstUid: firstUid,
                    lastUid: lastUid
                }, function(err, msgs) {
                    expect(err).to.not.exist;
                    expect(msgs).to.exist;

                    expect(imapClientStub.listMessagesByUid.calledOnce).to.be.true;

                    done();
                });
            });

            it('should not work when listMessagesByUid fails', function(done) {
                var path = 'FOLDAAAA',
                    firstUid = 1337,
                    lastUid = 1339;

                imapClientStub.listMessagesByUid.yields({});

                dao._imapListMessages({
                    folder: path,
                    firstUid: firstUid,
                    lastUid: lastUid
                }, function(err, msgs) {
                    expect(err).to.exist;
                    expect(msgs).to.not.exist;

                    expect(imapClientStub.listMessagesByUid.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when disconnected', function(done) {
                dao.onDisconnect(null, function(err) {
                    expect(err).to.not.exist;

                    dao._imapListMessages({}, function(err) {
                        expect(err.code).to.equal(42);
                        done();
                    });
                });
            });
        });

        describe('_imapStreamText', function() {
            it('should work', function(done) {
                var path = 'FOLDAAAA';

                imapClientStub.getBody.withArgs({
                    path: path,
                    message: {}
                }).yields(null, {});

                dao._imapStreamText({
                    folder: path,
                    message: {}
                }, function(err, msg) {
                    expect(err).to.not.exist;
                    expect(msg).to.exist;

                    expect(imapClientStub.getBody.calledOnce).to.be.true;

                    done();
                });
            });

            it('should not work when getBody fails', function(done) {
                var path = 'FOLDAAAA';

                imapClientStub.getBody.yields({});

                dao._imapStreamText({
                    folder: path,
                    message: {}
                }, function(err, msg) {
                    expect(err).to.exist;
                    expect(msg).to.not.exist;

                    expect(imapClientStub.getBody.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when disconnected', function(done) {
                dao.onDisconnect(null, function(err) {
                    expect(err).to.not.exist;

                    dao._imapStreamText({}, function(err) {
                        expect(err.code).to.equal(42);
                        done();
                    });
                });
            });
        });

        describe('_localListMessages', function() {
            it('should work without uid', function(done) {
                var folder = 'FOLDAAAA';
                devicestorageStub.listItems.withArgs('email_' + folder, 0, null).yields();

                dao._localListMessages({
                    folder: folder
                }, done);
            });

            it('should work with uid', function(done) {
                var folder = 'FOLDAAAA',
                    uid = 123;
                devicestorageStub.listItems.withArgs('email_' + folder + '_' + uid, 0, null).yields();

                dao._localListMessages({
                    folder: folder,
                    uid: uid
                }, done);
            });
        });

        describe('_localStoreMessages', function() {
            it('should work', function(done) {
                var folder = 'FOLDAAAA',
                    emails = [{}];
                devicestorageStub.storeList.withArgs(emails, 'email_' + folder).yields();

                dao._localStoreMessages({
                    folder: folder,
                    emails: emails
                }, done);
            });
        });

        describe('_localDeleteMessage', function() {
            it('should work', function(done) {
                var folder = 'FOLDAAAA',
                    uid = 1337;
                devicestorageStub.removeList.withArgs('email_' + folder + '_' + uid).yields();

                dao._localDeleteMessage({
                    folder: folder,
                    uid: uid
                }, done);
            });

            it('should fail when uid is missing', function(done) {
                var folder = 'FOLDAAAA';

                dao._localDeleteMessage({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;
                    done();
                });
            });
        });

        describe('getBody', function() {
            it('should not do anything if the message already has content', function() {
                var message = {
                    body: 'bender is great!'
                };

                dao.getBody({
                    message: message
                });

                // should do nothing
            });

            it('should read an unencrypted body from the device', function(done) {
                var message, uid, folder, body, localListStub;

                folder = 'asdasdasdasdasd';
                body = 'bender is great! bender is great!';
                uid = 1234;
                message = {
                    uid: uid
                };

                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder,
                    uid: uid
                }).yieldsAsync(null, [{
                    body: body
                }]);


                dao.getBody({
                    message: message,
                    folder: folder
                }, function(err, msg) {
                    expect(err).to.not.exist;

                    expect(msg).to.equal(message);
                    expect(msg.body).to.not.be.empty;
                    expect(msg.encrypted).to.be.false;
                    expect(msg.loadingBody).to.be.false;

                    expect(localListStub.calledOnce).to.be.true;

                    done();
                });
                expect(message.loadingBody).to.be.true;
            });

            it('should read an encrypted body from the device', function(done) {
                var message, uid, folder, body, localListStub;

                folder = 'asdasdasdasdasd';
                body = '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----';
                uid = 1234;
                message = {
                    uid: uid
                };

                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder,
                    uid: uid
                }).yieldsAsync(null, [{
                    body: body
                }]);

                dao.getBody({
                    message: message,
                    folder: folder
                }, function(err, msg) {
                    expect(err).to.not.exist;

                    expect(msg).to.equal(message);
                    expect(msg.body).to.not.be.empty;
                    expect(msg.encrypted).to.be.true;
                    expect(msg.decrypted).to.be.false;
                    expect(message.loadingBody).to.be.false;

                    expect(localListStub.calledOnce).to.be.true;

                    done();
                });
                expect(message.loadingBody).to.be.true;
            });

            it('should stream an unencrypted body from imap', function(done) {
                var message, uid, folder, body, localListStub, localStoreStub, imapStreamStub;

                folder = 'asdasdasdasdasd';
                body = 'bender is great! bender is great!';
                uid = 1234;
                message = {
                    uid: uid
                };

                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder,
                    uid: uid
                }).yieldsAsync(null, [message]);

                localStoreStub = sinon.stub(dao, '_localStoreMessages').withArgs({
                    folder: folder,
                    emails: [message]
                }).yieldsAsync();

                imapStreamStub = sinon.stub(dao, '_imapStreamText', function(opts, cb) {
                    expect(opts).to.deep.equal({
                        folder: folder,
                        message: message
                    });

                    message.body = body;
                    cb();
                });


                dao.getBody({
                    message: message,
                    folder: folder
                }, function(err, msg) {
                    expect(err).to.not.exist;

                    expect(msg).to.equal(message);
                    expect(msg.body).to.not.be.empty;
                    expect(msg.encrypted).to.be.false;
                    expect(msg.loadingBody).to.be.false;

                    expect(localListStub.calledTwice).to.be.true;
                    expect(imapStreamStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;

                    done();
                });
                expect(message.loadingBody).to.be.true;
            });

            it('should stream an encrypted body from imap', function(done) {
                var message, uid, folder, body, localListStub, localStoreStub, imapStreamStub;

                folder = 'asdasdasdasdasd';
                body = '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----';
                uid = 1234;
                message = {
                    uid: uid
                };

                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder,
                    uid: uid
                }).yieldsAsync(null, [message]);

                localStoreStub = sinon.stub(dao, '_localStoreMessages').withArgs({
                    folder: folder,
                    emails: [message]
                }).yieldsAsync();

                imapStreamStub = sinon.stub(dao, '_imapStreamText', function(opts, cb) {
                    expect(opts).to.deep.equal({
                        folder: folder,
                        message: message
                    });

                    message.body = body;
                    cb();
                });


                dao.getBody({
                    message: message,
                    folder: folder
                }, function(err, msg) {
                    expect(err).to.not.exist;

                    expect(msg).to.equal(message);
                    expect(msg.body).to.not.be.empty;
                    expect(msg.encrypted).to.be.true;
                    expect(msg.decrypted).to.be.false;
                    expect(msg.loadingBody).to.be.false;

                    expect(localListStub.calledTwice).to.be.true;
                    expect(imapStreamStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;

                    done();
                });
                expect(message.loadingBody).to.be.true;
            });

            it('fail to stream from imap due to error when persisting', function(done) {
                var message, uid, folder, body, localListStub, localStoreStub, imapStreamStub;

                folder = 'asdasdasdasdasd';
                body = 'THIS IS THE BODY';
                uid = 1234;
                message = {
                    uid: uid
                };

                localListStub = sinon.stub(dao, '_localListMessages').yieldsAsync(null, [message]);
                localStoreStub = sinon.stub(dao, '_localStoreMessages').yieldsAsync({});

                imapStreamStub = sinon.stub(dao, '_imapStreamText', function(opts, cb) {
                    message.body = body;
                    cb();
                });

                dao.getBody({
                    message: message,
                    folder: folder
                }, function(err, msg) {
                    expect(err).to.exist;
                    expect(msg).to.not.exist;
                    expect(localListStub.calledTwice).to.be.true;
                    expect(imapStreamStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;

                    expect(message.loadingBody).to.be.false;

                    done();
                });
            });

            it('fail to stream from imap due to stream error', function(done) {
                var message, uid, folder, body, localListStub, localStoreStub, imapStreamStub;

                folder = 'asdasdasdasdasd';
                uid = 1234;
                message = {
                    uid: uid
                };

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [{}]);

                imapStreamStub = sinon.stub(dao, '_imapStreamText', function(opts, cb) {
                    message.body = body;
                    cb({});
                });

                localStoreStub = sinon.stub(dao, '_localStoreMessages');

                dao.getBody({
                    message: message,
                    folder: folder
                }, function(err, msg) {
                    expect(err).to.exist;
                    expect(msg).to.not.exist;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapStreamStub.calledOnce).to.be.true;
                    expect(localStoreStub.called).to.be.false;

                    expect(message.loadingBody).to.be.false;

                    done();
                });
            });
        });

        describe('decryptBody', function() {
            it('should not do anything when the message is not encrypted', function() {
                var message = {
                    encrypted: false
                };

                dao.decryptBody({
                    message: message
                });

                // should do nothing
            });

            it('should not do anything when the message is already decrypted', function() {
                var message = {
                    encrypted: true,
                    decrypted: true
                };

                dao.decryptBody({
                    message: message
                });

                // should do nothing
            });

            it('decrypt a pgp/mime message', function(done) {
                var message, parsedBody, mimeBody, parseStub;

                message = {
                    from: [{
                        address: 'asdasdasd'
                    }],
                    encrypted: true,
                    decrypted: false,
                    body: '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----'
                };

                mimeBody = 'Content-Type: asdasdasd';
                parsedBody = 'body? yes.';

                keychainStub.getReceiverPublicKey.withArgs(message.from[0].address).yieldsAsync(null, mockKeyPair.publicKey);
                pgpStub.decrypt.withArgs(message.body, mockKeyPair.publicKey.publicKey).yieldsAsync(null, mimeBody);
                parseStub = sinon.stub(dao, '_imapParseMessageBlock', function(o, cb) {
                    expect(o.message).to.equal(message);
                    expect(o.raw).to.equal(mimeBody);

                    o.message.body = parsedBody;
                    cb(null, o.message);
                });

                dao.decryptBody({
                    message: message
                }, function(error, msg) {
                    expect(error).to.not.exist;

                    expect(msg).to.equal(message);
                    expect(msg.decrypted).to.be.true;
                    expect(msg.body).to.equal(parsedBody);
                    expect(msg.decryptingBody).to.be.false;

                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.decrypt.calledOnce).to.be.true;
                    expect(parseStub.calledOnce).to.be.true;

                    done();
                });

                expect(message.decryptingBody).to.be.true;
            });

            it('decrypt a pgp/inline message', function(done) {
                var message, plaintextBody, parseStub;

                message = {
                    from: [{
                        address: 'asdasdasd'
                    }],
                    encrypted: true,
                    decrypted: false,
                    body: '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----'
                };

                plaintextBody = 'body? yes.';

                keychainStub.getReceiverPublicKey.withArgs(message.from[0].address).yieldsAsync(null, mockKeyPair.publicKey);
                pgpStub.decrypt.withArgs(message.body, mockKeyPair.publicKey.publicKey).yieldsAsync(null, plaintextBody);
                parseStub = sinon.stub(dao, '_imapParseMessageBlock');

                dao.decryptBody({
                    message: message
                }, function(error, msg) {
                    expect(error).to.not.exist;

                    expect(msg).to.equal(message);
                    expect(msg.decrypted).to.be.true;
                    expect(msg.body).to.equal(plaintextBody);
                    expect(msg.decryptingBody).to.be.false;

                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.decrypt.calledOnce).to.be.true;
                    expect(parseStub.called).to.be.false;

                    done();
                });
                expect(message.decryptingBody).to.be.true;
            });

            it('should fail during decryption message', function(done) {
                var message, plaintextBody, parseStub, errMsg;

                message = {
                    from: [{
                        address: 'asdasdasd'
                    }],
                    encrypted: true,
                    decrypted: false,
                    body: '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----'
                };

                plaintextBody = 'body? yes.';
                errMsg = 'yaddayadda';

                keychainStub.getReceiverPublicKey.withArgs(message.from[0].address).yields(null, mockKeyPair.publicKey);
                pgpStub.decrypt.yields({
                    errMsg: errMsg
                });
                parseStub = sinon.stub(dao, '_imapParseMessageBlock');

                dao.decryptBody({
                    message: message
                }, function(error, msg) {
                    expect(error).to.not.exist;

                    expect(msg).to.equal(message);
                    expect(msg.decrypted).to.be.true;
                    expect(msg.body).to.equal(errMsg);
                    expect(msg.decryptingBody).to.be.false;

                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.decrypt.calledOnce).to.be.true;
                    expect(parseStub.called).to.be.false;

                    done();
                });
            });

            it('should fail during key export', function(done) {
                var message, parseStub;

                message = {
                    from: [{
                        address: 'asdasdasd'
                    }],
                    encrypted: true,
                    decrypted: false,
                    body: '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----'
                };

                keychainStub.getReceiverPublicKey.yields({});
                parseStub = sinon.stub(dao, '_imapParseMessageBlock');

                dao.decryptBody({
                    message: message
                }, function(error, msg) {
                    expect(error).to.exist;

                    expect(msg).to.not.exist;

                    expect(message.decrypted).to.be.false;
                    expect(message.decryptingBody).to.be.false;

                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.decrypt.called).to.be.false;
                    expect(parseStub.called).to.be.false;

                    done();
                });
            });
        });


        describe('sync', function() {
            it('should initially fill from local', function(done) {
                var folder, localListStub, invocations, imapSearchStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder
                }];

                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);
                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages.length).to.equal(1);
                    expect(dao._account.folders[0].messages[0].uid).to.equal(dummyEncryptedMail.uid);
                    expect(dao._account.folders[0].messages[0].body).to.not.exist;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;

                    done();
                });
            });

            it('should not work when busy', function(done) {
                dao._account.busy = true;

                dao.sync({
                    folder: 'OOGA'
                }, function(err) {
                    expect(err).to.exist;
                    done();
                });
            });

            it('should not work without providing a folder', function(done) {
                dao.sync({}, function(err) {
                    expect(err).to.exist;
                    done();
                });
            });

            it('should not work when initial setup errors', function(done) {
                var folder, localListStub;

                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields({});

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(dao._account.busy).to.be.false;
                    expect(localListStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should be up to date', function(done) {
                var folder, localListStub, imapSearchStub, invocations;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);
                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail.uid - 10, dummyEncryptedMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);


                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    done();
                });
            });

            it('should error while searching on imap', function(done) {
                var folder, localListStub, imapSearchStub, invocations;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [dummyEncryptedMail]);
                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields({});

                dao.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should error while listing local messages', function(done) {
                var folder, localListStub;

                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields({});

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(dao._account.busy).to.be.false;
                    expect(localListStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should remove messages from the remote', function(done) {
                var invocations, folder, localListStub, imapSearchStub, localDeleteStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [dummyEncryptedMail]);
                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);

                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage').yields();
                localDeleteStub = sinon.stub(dao, '_localDeleteMessage').yields();

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(localDeleteStub.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should error while removing messages from local', function(done) {
                var invocations, folder, localListStub, imapSearchStub, localDeleteStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [dummyEncryptedMail]);
                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage').yields();
                localDeleteStub = sinon.stub(dao, '_localDeleteMessage').yields({});

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(localDeleteStub.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;
                    expect(imapSearchStub.called).to.be.false;
                    done();
                });
            });

            it('should error while removing messages from the remote', function(done) {
                var folder, localListStub, imapSearchStub, localDeleteStub, imapDeleteStub;

                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [dummyEncryptedMail]);
                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage').yields({});
                localDeleteStub = sinon.stub(dao, '_localDeleteMessage');

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;
                    expect(localDeleteStub.called).to.be.false;
                    expect(imapSearchStub.called).to.be.false;

                    done();
                });
            });

            it('should delete messages locally if not present on remote', function(done) {
                var invocations, folder, localListStub, imapSearchStub, localDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];


                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);
                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);
                localDeleteStub = sinon.stub(dao, '_localDeleteMessage').withArgs({
                    folder: folder,
                    uid: dummyEncryptedMail.uid
                }).yields();

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(localDeleteStub.calledOnce).to.be.true;
                    done();
                });

            });

            it('should error while deleting locally if not present on remote', function(done) {
                var invocations, folder, localListStub, imapSearchStub, localDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];


                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [dummyEncryptedMail]);
                localDeleteStub = sinon.stub(dao, '_localDeleteMessage').yields({});
                imapSearchStub = sinon.stub(dao, '_imapSearch').withArgs({
                    folder: folder
                }).yields(null, []);


                dao.sync({
                    folder: folder
                }, function(err) {
                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledOnce).to.be.true;
                    expect(localDeleteStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should fetch messages downstream from the remote', function(done) {
                var invocations, folder, localListStub, imapSearchStub, localStoreStub, imapListMessagesStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                delete dummyEncryptedMail.body;

                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, []);

                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);

                imapListMessagesStub = sinon.stub(dao, '_imapListMessages');
                imapListMessagesStub.withArgs({
                    folder: folder,
                    firstUid: dummyEncryptedMail.uid,
                    lastUid: dummyEncryptedMail.uid
                }).yields(null, [dummyEncryptedMail]);

                localStoreStub = sinon.stub(dao, '_localStoreMessages');
                localStoreStub.withArgs({
                    folder: folder,
                    emails: [dummyEncryptedMail]
                }).yields();

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages.length).to.equal(1);
                    expect(dao._account.folders[0].messages[0].uid).to.equal(dummyEncryptedMail.uid);
                    expect(dao._account.folders[0].messages[0].body).to.not.exist;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should error while storing messages from the remote locally', function(done) {
                var invocations, folder, localListStub, imapSearchStub, localStoreStub, imapListMessagesStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                delete dummyEncryptedMail.body;

                localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, []);

                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapSearchStub.yields(null, [dummyEncryptedMail.uid]);

                imapListMessagesStub = sinon.stub(dao, '_imapListMessages');
                imapListMessagesStub.yields(null, [dummyEncryptedMail]);

                localStoreStub = sinon.stub(dao, '_localStoreMessages');
                localStoreStub.yields({});

                dao.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages.length).to.equal(0);
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    done();
                });
            });

            it('should verify an authentication mail', function(done) {
                var invocations, folder, localListStub, imapSearchStub, imapGetStub, imapListMessagesStub, imapDeleteStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, []);

                imapSearchStub = sinon.stub(dao, '_imapSearch');

                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [verificationMail.uid]);

                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);

                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);

                imapListMessagesStub = sinon.stub(dao, '_imapListMessages').yields(null, [verificationMail]);

                imapGetStub = sinon.stub(dao, '_imapStreamText').yields(null);

                keychainStub.verifyPublicKey.withArgs(verificationUuid).yields();

                localStoreStub = sinon.stub(dao, '_localStoreMessages');

                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage').withArgs({
                    folder: folder,
                    uid: verificationMail.uid
                }).yields();

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(keychainStub.verifyPublicKey.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.false;

                    done();
                });
            });

            it('should not care abouta failed deletion of an authentication mail', function(done) {
                var invocations, folder, localListStub, localStoreStub, imapSearchStub, imapGetStub, imapListMessagesStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, []);

                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [verificationMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);
                imapListMessagesStub = sinon.stub(dao, '_imapListMessages').yields(null, [verificationMail]);
                imapGetStub = sinon.stub(dao, '_imapStreamText').yields(null);
                keychainStub.verifyPublicKey.withArgs(verificationUuid).yields();
                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage').yields({});

                localStoreStub = sinon.stub(dao, '_localStoreMessages');
                localStoreStub.withArgs({
                    folder: folder,
                    emails: [verificationMail]
                }).yields();

                dao.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.not.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(localStoreStub.called).to.be.false;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(keychainStub.verifyPublicKey.calledOnce).to.be.true;
                    expect(imapDeleteStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail during verifying authentication', function(done) {
                var invocations, folder, localListStub, imapSearchStub, localStoreStub, imapGetStub, imapListMessagesStub, imapDeleteStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, []);

                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [verificationMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);
                imapListMessagesStub = sinon.stub(dao, '_imapListMessages').yields(null, [verificationMail]);
                imapGetStub = sinon.stub(dao, '_imapStreamText').yields(null);
                keychainStub.verifyPublicKey.withArgs(verificationUuid).yields({
                    errMsg: 'fubar'
                });
                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage').yields({});

                localStoreStub = sinon.stub(dao, '_localStoreMessages');
                localStoreStub.withArgs({
                    folder: folder,
                    emails: [verificationMail]
                }).yields();

                dao.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    if (invocations === 1) {
                        expect(err).to.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.not.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(keychainStub.verifyPublicKey.calledOnce).to.be.true;
                    expect(imapDeleteStub.called).to.be.false;

                    done();
                });
            });

            it('should not bother about corrupted authentication mails', function(done) {
                var invocations, folder, localListStub, imapSearchStub, imapGetStub, imapListMessagesStub, imapDeleteStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: []
                }];

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, []);

                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [corruptedVerificationMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);

                localStoreStub = sinon.stub(dao, '_localStoreMessages').withArgs({
                    folder: folder,
                    emails: [corruptedVerificationMail]
                }).yields();


                imapListMessagesStub = sinon.stub(dao, '_imapListMessages').yields(null, [corruptedVerificationMail]);
                imapGetStub = sinon.stub(dao, '_imapStreamText').yields(null);
                keychainStub.verifyPublicKey.withArgs(corruptedVerificationUuid).yields({
                    errMsg: 'fubar'
                });
                imapDeleteStub = sinon.stub(dao, '_imapDeleteMessage').yields({});

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0].messages).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    expect(keychainStub.verifyPublicKey.called).to.be.false;
                    expect(imapDeleteStub.called).to.be.false;


                    done();
                });
            });

            it('should sync tags from memory to imap and storage', function(done) {
                var folder, localListStub, imapSearchStub, invocations,
                    markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                var inImap = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inImap.unread = true;

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [inImap.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, [inImap.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);
                markStub = sinon.stub(dao, '_imapMark').withArgs({
                    folder: folder,
                    uid: dummyDecryptedMail.uid,
                    unread: dummyDecryptedMail.unread,
                    answered: dummyDecryptedMail.answered
                }).yields();
                localStoreStub = sinon.stub(dao, '_localStoreMessages').withArgs({
                    folder: folder,
                    emails: [inStorage]
                }).yields();

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(markStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;

                    expect(inStorage.unread).to.equal(dummyDecryptedMail.unread);
                    expect(inStorage.answered).to.equal(dummyDecryptedMail.answered);

                    done();
                });
            });

            it('should error while syncing unread tags from memory to storage', function(done) {
                var folder, localListStub, imapSearchStub, invocations, markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                var inImap = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inImap.unread = true;

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(dao, '_imapSearch');
                markStub = sinon.stub(dao, '_imapMark').yields();
                localStoreStub = sinon.stub(dao, '_localStoreMessages').yields({});

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(markStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    expect(imapSearchStub.called).to.be.false;
                    done();
                });
            });

            it('should error while syncing answered tags from memory to storage', function(done) {
                var folder, localListStub, imapSearchStub, invocations, markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                var inImap = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inImap.unread = true;

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(dao, '_imapSearch');
                markStub = sinon.stub(dao, '_imapMark').yields();
                localStoreStub = sinon.stub(dao, '_localStoreMessages').yields({});

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(markStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;
                    expect(imapSearchStub.called).to.be.false;
                    done();
                });
            });

            it('should error while syncing tags from memory to imap', function(done) {
                var folder, localListStub, imapSearchStub, invocations,
                    markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                var inImap = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inImap.unread = true;

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(dao, '_imapSearch');
                markStub = sinon.stub(dao, '_imapMark').yields({});
                localStoreStub = sinon.stub(dao, '_localStoreMessages');

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.exist;

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(markStub.calledOnce).to.be.true;
                    expect(localStoreStub.called).to.be.false;
                    expect(imapSearchStub.called).to.be.false;
                    done();
                });
            });

            it('should sync tags from imap to memory and storage', function(done) {
                var folder, localListStub, imapSearchStub, invocations,
                    markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inStorage.unread = true;

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);
                markStub = sinon.stub(dao, '_imapMark');
                localStoreStub = sinon.stub(dao, '_localStoreMessages').yields();

                dao.sync({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;

                    if (invocations === 0) {
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledTwice).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(markStub.called).to.be.false;
                    expect(localStoreStub.calledOnce).to.be.true;

                    expect(dummyDecryptedMail.unread).to.equal(false);
                    expect(inStorage.unread).to.equal(false);

                    done();
                });
            });

            it('should error while searching for unread tags on imap', function(done) {
                var folder, localListStub, imapSearchStub, invocations, markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inStorage.unread = true;

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields({});
                markStub = sinon.stub(dao, '_imapMark');
                localStoreStub = sinon.stub(dao, '_localStoreMessages');

                dao.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(markStub.called).to.be.false;
                    expect(imapSearchStub.calledTwice).to.be.true;
                    expect(localStoreStub.called).to.be.false;

                    expect(inStorage.unread).to.equal(true);
                    expect(dummyDecryptedMail.unread).to.equal(true); // the live object has not been touched!

                    done();
                });
            });

            it('should error while searching for answered tags on imap', function(done) {
                var folder, localListStub, imapSearchStub, invocations, markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inStorage.unread = true;

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields({});
                markStub = sinon.stub(dao, '_imapMark');
                localStoreStub = sinon.stub(dao, '_localStoreMessages');

                dao.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(markStub.called).to.be.false;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(localStoreStub.called).to.be.false;

                    expect(inStorage.unread).to.equal(true);
                    expect(dummyDecryptedMail.unread).to.equal(true); // the live object has not been touched!

                    done();
                });
            });

            it('should error while syncing tags from imap to storage', function(done) {
                var folder, localListStub, imapSearchStub, invocations,
                    markStub, localStoreStub;

                invocations = 0;
                folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder,
                    messages: [dummyDecryptedMail]
                }];

                var inStorage = JSON.parse(JSON.stringify(dummyEncryptedMail));
                dummyDecryptedMail.unread = inStorage.unread = true;

                localListStub = sinon.stub(dao, '_localListMessages').yields(null, [inStorage]);
                imapSearchStub = sinon.stub(dao, '_imapSearch');
                imapSearchStub.withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail.uid]);
                imapSearchStub.withArgs({
                    folder: folder,
                    unread: true
                }).yields(null, []);
                imapSearchStub.withArgs({
                    folder: folder,
                    answered: true
                }).yields(null, []);
                markStub = sinon.stub(dao, '_imapMark');
                localStoreStub = sinon.stub(dao, '_localStoreMessages').yields({});

                dao.sync({
                    folder: folder
                }, function(err) {

                    if (invocations === 0) {
                        expect(err).to.not.exist;
                        expect(dao._account.busy).to.be.true;
                        invocations++;
                        return;
                    }

                    expect(err).to.exist;
                    expect(dao._account.busy).to.be.false;
                    expect(dao._account.folders[0]).to.not.be.empty;
                    expect(localListStub.calledTwice).to.be.true;
                    expect(imapSearchStub.calledThrice).to.be.true;
                    expect(markStub.called).to.be.false;
                    expect(localStoreStub.calledOnce).to.be.true;

                    done();
                });
            });
        });

        describe('mark', function() {
            it('should work', function(done) {
                imapClientStub.updateFlags.withArgs({
                    path: 'asdf',
                    uid: 1,
                    unread: false,
                    answered: false
                }).yields();

                dao._imapMark({
                    folder: 'asdf',
                    uid: 1,
                    unread: false,
                    answered: false
                }, function(err) {
                    expect(imapClientStub.updateFlags.calledOnce).to.be.true;
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        describe('sendPlaintext', function() {
            it('should work', function(done) {
                pgpMailerStub.send.withArgs({
                    mail: dummyEncryptedMail
                }).yields();

                dao.sendPlaintext({
                    email: dummyEncryptedMail
                }, function(err) {
                    expect(err).to.not.exist;
                    expect(pgpMailerStub.send.calledOnce).to.be.true;
                    done();
                });
            });

            it('should not work when pgpmailer fails', function(done) {
                pgpMailerStub.send.yields({});

                dao.sendPlaintext({
                    email: dummyEncryptedMail
                }, function(err) {
                    expect(err).to.exist;
                    expect(pgpMailerStub.send.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('sendEncrypted', function() {
            it('should work', function(done) {
                var publicKeys = ["PUBLIC KEY"];
                dummyDecryptedMail.publicKeysArmored = publicKeys;

                pgpMailerStub.send.withArgs({
                    encrypt: true,
                    cleartextMessage: str.message + str.signature,
                    mail: dummyDecryptedMail,
                    publicKeysArmored: publicKeys
                }).yields();

                dao.sendEncrypted({
                    email: dummyDecryptedMail
                }, function(err) {
                    expect(err).to.not.exist;

                    expect(pgpMailerStub.send.calledOnce).to.be.true;

                    done();
                });
            });
            it('should not work when pgpmailer fails', function(done) {
                var publicKeys = ["PUBLIC KEY"];
                dummyDecryptedMail.publicKeysArmored = publicKeys;
                pgpMailerStub.send.yields({});

                dao.sendEncrypted({
                    email: dummyDecryptedMail
                }, function(err) {
                    expect(err).to.exist;

                    expect(pgpMailerStub.send.calledOnce).to.be.true;

                    done();
                });
            });
        });

        describe('encrypt', function() {
            it('should encrypt', function(done) {
                pgpBuilderStub.encrypt.yields();

                dao.encrypt({}, function() {
                    expect(pgpBuilderStub.encrypt.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('syncOutbox', function() {
            it('should sync the outbox', function(done) {
                var folder = 'FOLDAAAA';
                dao._account.folders = [{
                    type: 'Folder',
                    path: folder
                }];

                var localListStub = sinon.stub(dao, '_localListMessages').withArgs({
                    folder: folder
                }).yields(null, [dummyEncryptedMail]);

                dao.syncOutbox({
                    folder: folder
                }, function(err) {
                    expect(err).to.not.exist;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(dao._account.folders[0].messages.length).to.equal(1);

                    done();
                });
            });
        });
    });
});