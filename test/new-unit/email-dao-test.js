define(function(require) {
    'use strict';

    var EmailDAO = require('js/dao/email-dao'),
        EmailSync = require('js/dao/email-sync'),
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
        var emailSync, dao, keychainStub, imapClientStub, pgpMailerStub, pgpBuilderStub, pgpStub, devicestorageStub;

        var emailAddress, passphrase, asymKeySize, mockkeyId, dummyEncryptedMail,
            dummyDecryptedMail, mockKeyPair, account, verificationMail, verificationUuid,
            corruptedVerificationMail, corruptedVerificationUuid,
            localListStub, localStoreStub, imapGetStub,
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

            emailSync = new EmailSync(keychainStub, devicestorageStub);
            dao = new EmailDAO(keychainStub, pgpStub, devicestorageStub, pgpBuilderStub, mailreader, emailSync);
            dao._account = account;

            localListStub = sinon.stub(emailSync, '_localListMessages');
            localStoreStub = sinon.stub(emailSync, '_localStoreMessages');
            imapGetStub = sinon.stub(emailSync, '_getBodyParts');

            expect(dao._keychain).to.equal(keychainStub);
            expect(dao._crypto).to.equal(pgpStub);
            expect(dao._devicestorage).to.equal(devicestorageStub);

            // connect
            expect(dao._imapClient).to.not.exist;
            expect(dao._smtpClient).to.not.exist;
            expect(dao._account.online).to.be.undefined;
            dao._account.folders = [];
            imapClientStub.login.yields();

            var listFolderStub = sinon.stub(dao, '_imapListFolders').yields(null, []);

            dao.onConnect({
                imapClient: imapClientStub,
                pgpMailer: pgpMailerStub
            }, function(err) {
                expect(err).to.not.exist;
                expect(dao._account.online).to.be.true;
                expect(dao._account.folders).to.deep.equal([]);
                expect(dao._imapClient).to.equal(dao._imapClient);
                expect(dao._smtpClient).to.equal(dao._smtpClient);
                listFolderStub.restore();
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

        describe('init', function() {
            beforeEach(function() {
                delete dao._account;
            });

            it('should init', function(done) {
                var listFolderStub, folders;

                folders = [{}, {}];

                // initKeychain
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
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;

                    expect(listFolderStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should not fail when offline', function(done) {
                var listFolderStub;

                // initKeychain
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
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;
                    expect(listFolderStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail due to error while listing folders', function(done) {
                var listFolderStub;

                // initKeychain
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
                    expect(keychainStub.getUserKeyPair.calledOnce).to.be.true;
                    expect(listFolderStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail due to error in getUserKeyPair', function(done) {
                keychainStub.getUserKeyPair.yields({});

                dao.init({
                    account: account
                }, function(err, keyPair) {
                    expect(err).to.exist;
                    expect(keyPair).to.not.exist;

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

            it('should work', function(done) {
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


        describe('getBody', function() {
            var folder = 'asdasdasdasdasd',
                uid = 1234;

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
                var message, body;

                body = 'bender is great! bender is great!';
                message = {
                    uid: uid
                };

                localListStub.withArgs({
                    folder: folder,
                    uid: uid
                }).yieldsAsync(null, [{
                    bodyParts: [{
                        type: 'text',
                        content: body
                    }]
                }]);

                dao.getBody({
                    message: message,
                    folder: folder
                }, function(err, msg) {
                    expect(err).to.not.exist;

                    expect(msg).to.equal(message);
                    expect(msg.body).to.equal(body);
                    expect(msg.loadingBody).to.be.false;

                    expect(localListStub.calledOnce).to.be.true;

                    done();
                });
                expect(message.loadingBody).to.be.true;
            });

            it('should read a pgp/mime from the device', function(done) {
                var message, ct, pt;

                pt = 'bender is great!';
                ct = '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----';
                message = {
                    uid: uid,
                    encrypted: true
                };

                localListStub.withArgs({
                    folder: folder,
                    uid: uid
                }).yieldsAsync(null, [{
                    bodyParts: [{
                        type: 'text',
                        content: pt
                    }, {
                        type: 'encrypted',
                        content: ct
                    }]
                }]);

                dao.getBody({
                    message: message,
                    folder: folder
                }, function(err, msg) {
                    expect(err).to.not.exist;

                    expect(msg).to.equal(message);
                    expect(msg.body).to.equal(ct);
                    expect(msg.encrypted).to.be.true;
                    expect(message.loadingBody).to.be.false;

                    expect(localListStub.calledOnce).to.be.true;

                    done();
                });
                expect(message.loadingBody).to.be.true;
            });

            it('should read a pgp/inline from the device', function(done) {
                var message, ct, pt;

                ct = '-----BEGIN PGP MESSAGE-----\nasdasdasd\n-----END PGP MESSAGE-----';
                pt = 'bla bla yadda yadda';
                message = {
                    uid: uid
                };

                localListStub.yieldsAsync(null, [{
                    bodyParts: [{
                        type: 'text',
                        content: pt
                    }, {
                        type: 'text',
                        content: ct
                    }, {
                        type: 'text',
                        content: pt
                    }]
                }]);

                dao.getBody({
                    message: message,
                    folder: folder
                }, function(err, msg) {
                    expect(err).to.not.exist;

                    expect(msg).to.equal(message);
                    expect(msg.body).to.equal(ct);
                    expect(msg.bodyParts[0].type).to.equal('encrypted');
                    expect(msg.bodyParts[0].content).to.equal(ct);
                    expect(msg.encrypted).to.be.true;
                    expect(message.loadingBody).to.be.false;

                    expect(localListStub.calledOnce).to.be.true;

                    done();
                });
                expect(message.loadingBody).to.be.true;
            });

            it('should stream from imap and set plain text body', function(done) {
                var message, body;

                folder = 'asdasdasdasdasd';
                body = 'bender is great! bender is great!';
                uid = 1234;
                message = {
                    uid: uid,
                    bodyParts: [{
                        type: 'text'
                    }]
                };

                localListStub.withArgs({
                    folder: folder,
                    uid: uid
                }).yieldsAsync(null, [message]);

                localStoreStub.withArgs({
                    folder: folder,
                    emails: [message]
                }).yieldsAsync();

                imapGetStub.withArgs({
                    folder: folder,
                    uid: message.uid,
                    bodyParts: message.bodyParts
                }).yieldsAsync(null, [{
                    type: 'text',
                    content: body
                }]);

                dao.getBody({
                    message: message,
                    folder: folder
                }, function(err, msg) {
                    expect(err).to.not.exist;

                    expect(msg).to.equal(message);
                    expect(msg.body).to.equal(body);
                    expect(msg.loadingBody).to.be.false;

                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;

                    done();
                });
                expect(message.loadingBody).to.be.true;
            });

            it('should stream from imap and set encrypted body', function(done) {
                var message, ct, pt;

                pt = 'bender is great';
                ct = '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----';
                message = {
                    uid: uid,
                    encrypted: true,
                    bodyParts: [{
                        type: 'text'
                    }, {
                        type: 'encrypted'
                    }]
                };

                localListStub.withArgs({
                    folder: folder,
                    uid: uid
                }).yieldsAsync(null, [message]);

                localStoreStub.withArgs({
                    folder: folder,
                    emails: [message]
                }).yieldsAsync();

                imapGetStub.withArgs({
                    folder: folder,
                    uid: message.uid,
                    bodyParts: message.bodyParts
                }).yieldsAsync(null, [{
                    type: 'text',
                    content: pt
                }, {
                    type: 'encrypted',
                    content: ct
                }]);


                dao.getBody({
                    message: message,
                    folder: folder
                }, function(err, msg) {
                    expect(err).to.not.exist;

                    expect(msg).to.equal(message);
                    expect(msg.body).to.equal(ct);
                    expect(msg.encrypted).to.be.true;
                    expect(msg.loadingBody).to.be.false;

                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;

                    done();
                });
                expect(message.loadingBody).to.be.true;
            });

            it('fail to stream from imap due to error when persisting', function(done) {
                var message = {
                    uid: uid,
                    bodyParts: [{
                        type: 'text'
                    }]
                };

                localListStub.yieldsAsync(null, [message]);
                localStoreStub.yieldsAsync({});
                imapGetStub.yieldsAsync(null, [{
                    type: 'text',
                    content: 'bender is great! bender is great!'
                }]);

                dao.getBody({
                    message: message,
                    folder: folder
                }, function(err, msg) {
                    expect(err).to.exist;
                    expect(msg).to.not.exist;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(localStoreStub.calledOnce).to.be.true;

                    expect(message.loadingBody).to.be.false;

                    done();
                });
            });

            it('fail to stream from imap due to stream error', function(done) {
                var message = {
                    uid: uid,
                    bodyParts: [{
                        type: 'text'
                    }]
                };

                localListStub.yields(null, [message]);
                imapGetStub.yieldsAsync({});

                dao.getBody({
                    message: message,
                    folder: folder
                }, function(err, msg) {
                    expect(err).to.exist;
                    expect(msg).to.not.exist;
                    expect(localListStub.calledOnce).to.be.true;
                    expect(imapGetStub.calledOnce).to.be.true;
                    expect(localStoreStub.called).to.be.false;

                    expect(message.loadingBody).to.be.false;

                    done();
                });
            });
        });

        describe('getAttachment', function() {
            var folder = 'asdasdasdasdasd',
                uid = 1234;

            it('should fetch an attachment from imap', function(done) {
                var attmt = {};

                imapGetStub.withArgs({
                    folder: folder,
                    uid: uid,
                    bodyParts: [attmt]
                }).yieldsAsync(null, [{
                    content: 'CONTENT!!!'
                }]);

                dao.getAttachment({
                    folder: folder,
                    uid: uid,
                    attachment: attmt
                }, function(err, fetchedAttmt) {
                    expect(err).to.not.exist;
                    expect(fetchedAttmt).to.equal(attmt);
                    expect(attmt.content).to.not.be.empty;
                    expect(imapGetStub.calledOnce).to.be.true;

                    done();
                });
            });

            it('should error during fetch', function(done) {
                var attmt = {};

                imapGetStub.yieldsAsync({});

                dao.getAttachment({
                    folder: folder,
                    uid: uid,
                    attachment: attmt
                }, function(err, fetchedAttmt) {
                    expect(err).to.exist;
                    expect(fetchedAttmt).to.not.exist;
                    expect(imapGetStub.calledOnce).to.be.true;

                    done();
                });
            });
        });

        describe('decryptBody', function() {
            var parseStub;

            beforeEach(function() {
                parseStub = sinon.stub(mailreader, 'parse');
            });

            afterEach(function() {
                mailreader.parse.restore();
            });

            it('should do nothing when the message is not encrypted', function() {
                var message = {
                    encrypted: false,
                    decrypted: true,
                    body: 'asd'
                };

                dao.decryptBody({
                    message: message
                });
            });

            it('should do nothing when the message is already decrypted', function() {
                var message = {
                    encrypted: true,
                    decrypted: true,
                    body: 'asd'
                };

                dao.decryptBody({
                    message: message
                });
            });

            it('should do nothing when the message has no body', function() {
                var message = {
                    encrypted: true,
                    decrypted: false,
                    body: ''
                };

                dao.decryptBody({
                    message: message
                });
            });

            it('should do nothing when the message is decrypting', function() {
                var message = {
                    encrypted: true,
                    decrypted: false,
                    body: 'asd',
                    decryptingBody: true
                };

                dao.decryptBody({
                    message: message
                });
            });

            it('decrypt a pgp/mime message', function(done) {
                var message, ct, pt, parsed;

                pt = 'bender is great';
                ct = '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----';
                parsed = 'bender! bender! bender!';
                message = {
                    from: [{
                        address: 'asdasdasd'
                    }],
                    body: ct,
                    encrypted: true,
                    bodyParts: [{
                        type: 'encrypted',
                        content: ct
                    }]
                };

                keychainStub.getReceiverPublicKey.withArgs(message.from[0].address).yieldsAsync(null, mockKeyPair.publicKey);
                pgpStub.decrypt.withArgs(ct, mockKeyPair.publicKey.publicKey).yieldsAsync(null, pt);
                parseStub.withArgs({
                    bodyParts: [{
                        type: 'encrypted',
                        content: ct,
                        raw: pt
                    }]
                }).yieldsAsync(null, [{
                    type: 'encrypted',
                    content: [{
                        type: 'text',
                        content: parsed
                    }]
                }]);

                dao.decryptBody({
                    message: message
                }, function(error, msg) {
                    expect(error).to.not.exist;
                    expect(msg).to.equal(message);
                    expect(message.decrypted).to.be.true;
                    expect(message.body).to.equal(parsed);
                    expect(message.decryptingBody).to.be.false;
                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.decrypt.calledOnce).to.be.true;
                    expect(parseStub.calledOnce).to.be.true;

                    done();
                });

                expect(message.decryptingBody).to.be.true;
            });

            it('decrypt a pgp/inline message', function(done) {
                var message, ct, pt;

                pt = 'bender is great';
                ct = '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----';
                message = {
                    from: [{
                        address: 'asdasdasd'
                    }],
                    body: ct,
                    encrypted: true,
                    bodyParts: [{
                        type: 'encrypted',
                        content: ct,
                        _isPgpInline: true
                    }]
                };

                keychainStub.getReceiverPublicKey.withArgs(message.from[0].address).yieldsAsync(null, mockKeyPair.publicKey);
                pgpStub.decrypt.withArgs(ct, mockKeyPair.publicKey.publicKey).yieldsAsync(null, pt);

                dao.decryptBody({
                    message: message
                }, function(error, msg) {
                    expect(error).to.not.exist;

                    expect(msg).to.equal(message);
                    expect(message.decrypted).to.be.true;
                    expect(message.body).to.equal(pt);
                    expect(message.decryptingBody).to.be.false;
                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.decrypt.calledOnce).to.be.true;
                    expect(parseStub.called).to.be.false;

                    done();
                });

                expect(message.decryptingBody).to.be.true;
            });

            it('should fail during decryption message', function(done) {
                var message = {
                    from: [{
                        address: 'asdasdasd'
                    }],
                    body: 'asdjafuad',
                    encrypted: true,
                    bodyParts: [{
                        type: 'encrypted',
                        content: '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----'
                    }]
                };

                keychainStub.getReceiverPublicKey.yields(null, mockKeyPair.publicKey);
                pgpStub.decrypt.yields({
                    errMsg: 'asd'
                });

                dao.decryptBody({
                    message: message
                }, function(error, msg) {
                    expect(error).to.not.exist;
                    expect(msg.body).to.equal('asd');
                    expect(msg).to.exist;
                    expect(message.decryptingBody).to.be.false;
                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.decrypt.calledOnce).to.be.true;
                    expect(parseStub.called).to.be.false;

                    done();
                });
            });

            it('should fail during key export', function(done) {
                var message = {
                    from: [{
                        address: 'asdasdasd'
                    }],
                    encrypted: true,
                    body: 'asdjafuad',
                    bodyParts: [{
                        type: 'encrypted',
                        content: '-----BEGIN PGP MESSAGE-----asdasdasd-----END PGP MESSAGE-----'
                    }]
                };

                keychainStub.getReceiverPublicKey.yields({});

                dao.decryptBody({
                    message: message
                }, function(error, msg) {
                    expect(error).to.exist;
                    expect(msg).to.not.exist;
                    expect(message.decryptingBody).to.be.false;
                    expect(keychainStub.getReceiverPublicKey.calledOnce).to.be.true;
                    expect(pgpStub.decrypt.called).to.be.false;
                    expect(parseStub.called).to.be.false;

                    done();
                });
            });
        });


        describe('sync', function() {
            it('should call emailSync api', function(done) {
                sinon.stub(emailSync, 'sync').withArgs({
                    folder: 'OOGA'
                }).yields();

                dao.sync({
                    folder: 'OOGA'
                }, function(err) {
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
            it('should call emailSync api', function(done) {
                sinon.stub(emailSync, 'syncOutbox').withArgs({
                    folder: 'OOGA'
                }).yields();

                dao.syncOutbox({
                    folder: 'OOGA'
                }, function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

    });
});