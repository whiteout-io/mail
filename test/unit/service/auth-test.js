'use strict';

var Auth = require('../../../src/js/service/auth'),
    OAuth = require('../../../src/js/service/oauth'),
    PGP = require('../../../src/js/crypto/pgp'),
    DeviceStorageDAO = require('../../../src/js/service/devicestorage');

describe('Auth unit tests', function() {
    // Constancts
    var EMAIL_ADDR_DB_KEY = 'emailaddress';
    var USERNAME_DB_KEY = 'username';
    var REALNAME_DB_KEY = 'realname';
    var PASSWD_DB_KEY = 'password';
    var IMAP_DB_KEY = 'imap';
    var SMTP_DB_KEY = 'smtp';
    var APP_CONFIG_DB_NAME = 'app-config';

    // SUT
    var auth;

    // Dependencies
    var storageStub, oauthStub, pgpStub;

    // test data
    var emailAddress = 'bla@blubb.com';
    var password = 'passwordpasswordpassword';
    var encryptedPassword = 'pgppasswordpgppassword';
    var oauthToken = 'tokentokentokentoken';
    var realname = 'Bla Blubb';
    var username = 'bla';
    var imap = {
        host: 'mail.blablubb.com',
        port: 123,
        secure: true,
        ca: 'PEMPEMPEMPEMPEMPEMPEMPEMPEMPEM'
    };
    var smtp = {
        host: 'mail.blablubb.com',
        port: 456,
        secure: true,
        ca: 'PEMPEMPEMPEMPEMPEMPEMPEMPEMPEM'
    };

    beforeEach(function() {
        storageStub = sinon.createStubInstance(DeviceStorageDAO);
        oauthStub = sinon.createStubInstance(OAuth);
        pgpStub = sinon.createStubInstance(PGP);
        auth = new Auth(storageStub, oauthStub, pgpStub);
    });

    describe('#init', function() {
        it('should initialize a user db', function(done) {
            storageStub.init.withArgs(APP_CONFIG_DB_NAME).returns(resolves());
            auth.init().then(function() {
                expect(auth._initialized).to.be.true;
                done();
            });
        });
        it('should initialize a user db', function(done) {
            storageStub.init.withArgs(APP_CONFIG_DB_NAME).returns(rejects(new Error()));
            auth.init().catch(function(err) {
                expect(err).to.exist;
                expect(auth._initialized).to.be.false;
                done();
            });
        });
    });

    describe('#getCredentials', function() {
        it('should load credentials and retrieve credentials from cfg', function(done) {
            storageStub.listItems.withArgs(EMAIL_ADDR_DB_KEY).returns(resolves([emailAddress]));
            storageStub.listItems.withArgs(PASSWD_DB_KEY).returns(resolves([encryptedPassword]));
            storageStub.listItems.withArgs(USERNAME_DB_KEY).returns(resolves([username]));
            storageStub.listItems.withArgs(REALNAME_DB_KEY).returns(resolves([realname]));
            storageStub.listItems.withArgs(IMAP_DB_KEY).returns(resolves([imap]));
            storageStub.listItems.withArgs(SMTP_DB_KEY).returns(resolves([smtp]));
            pgpStub.decrypt.withArgs(encryptedPassword, undefined).returns(resolves({
                decrypted: password,
                signaturesValid: true
            }));

            auth.getCredentials().then(function(cred) {
                expect(auth.emailAddress).to.equal(emailAddress);
                expect(auth.password).to.equal(password);

                expect(cred.imap.host).to.equal(imap.host);
                expect(cred.imap.port).to.equal(imap.port);
                expect(cred.imap.secure).to.equal(imap.secure);
                expect(cred.imap.ca).to.equal(imap.ca);
                expect(cred.imap.auth.user).to.equal(username);
                expect(cred.imap.auth.pass).to.equal(password);

                expect(cred.smtp.host).to.equal(smtp.host);
                expect(cred.smtp.port).to.equal(smtp.port);
                expect(cred.smtp.secure).to.equal(smtp.secure);
                expect(cred.smtp.ca).to.equal(smtp.ca);
                expect(cred.smtp.auth.user).to.equal(username);
                expect(cred.smtp.auth.pass).to.equal(password);

                expect(storageStub.listItems.callCount).to.equal(6);
                expect(pgpStub.decrypt.calledOnce).to.be.true;

                done();
            });
        });
    });

    describe('#setCredentials', function() {
        it('should set the credentials', function() {
            auth.setCredentials({
                emailAddress: emailAddress,
                username: username,
                realname: realname,
                password: password,
                imap: imap,
                smtp: smtp
            });

            expect(auth.emailAddress).to.equal(emailAddress);
            expect(auth.username).to.equal(username);
            expect(auth.realname).to.equal(realname);
            expect(auth.password).to.equal(password);
            expect(auth.smtp).to.equal(smtp);
            expect(auth.imap).to.equal(imap);
            expect(auth.credentialsDirty).to.be.true;
        });
    });

    describe('#storeCredentials', function() {
        it('should persist ALL the things!', function(done) {
            auth.credentialsDirty = true;
            auth.emailAddress = emailAddress;
            auth.username = username;
            auth.realname = realname;
            auth.password = password;
            auth.smtp = smtp;
            auth.imap = imap;

            storageStub.storeList.withArgs([encryptedPassword], PASSWD_DB_KEY).returns(resolves());
            storageStub.storeList.withArgs([emailAddress], EMAIL_ADDR_DB_KEY).returns(resolves());
            storageStub.storeList.withArgs([username], USERNAME_DB_KEY).returns(resolves());
            storageStub.storeList.withArgs([realname], REALNAME_DB_KEY).returns(resolves());
            storageStub.storeList.withArgs([imap], IMAP_DB_KEY).returns(resolves());
            storageStub.storeList.withArgs([smtp], SMTP_DB_KEY).returns(resolves());
            pgpStub.encrypt.withArgs(password).returns(resolves(encryptedPassword));

            auth.storeCredentials().then(function() {
                expect(storageStub.storeList.callCount).to.equal(6);
                expect(pgpStub.encrypt.calledOnce).to.be.true;

                done();
            });
        });
    });

    describe('#useOAuth', function() {
        it('should not recommend oauth for unsupported platorm', function() {
            oauthStub.isSupported.returns(false);

            var res = auth.useOAuth('imap.gmail.com');
            expect(res).to.be.false;
        });

        it('should recommend oauth for whitelisted host', function() {
            oauthStub.isSupported.returns(true);

            var res = auth.useOAuth('imap.gmail.com');
            expect(res).to.be.true;
        });

        it('should not recommend oauth for other hosts', function() {
            oauthStub.isSupported.returns(true);

            var res = auth.useOAuth('imap.ggmail.com');
            expect(res).to.be.false;
        });
    });

    describe('#getOAuthToken', function() {
        it('should fetch token with known email address', function(done) {
            auth.emailAddress = emailAddress;
            oauthStub.getOAuthToken.withArgs(emailAddress).returns(resolves(oauthToken));

            auth.getOAuthToken().then(function() {
                expect(auth.emailAddress).to.equal(emailAddress);
                expect(auth.oauthToken).to.equal(oauthToken);
                expect(oauthStub.getOAuthToken.calledOnce).to.be.true;

                done();
            });
        });

        it('should fetch token with unknown email address', function(done) {
            oauthStub.getOAuthToken.withArgs(undefined).returns(resolves(oauthToken));
            oauthStub.queryEmailAddress.withArgs(oauthToken).returns(resolves(emailAddress));

            auth.getOAuthToken().then(function() {
                expect(auth.emailAddress).to.equal(emailAddress);
                expect(auth.oauthToken).to.equal(oauthToken);
                expect(oauthStub.getOAuthToken.calledOnce).to.be.true;
                expect(oauthStub.queryEmailAddress.calledOnce).to.be.true;

                done();
            });
        });

        it('should fail when email address fetch fails', function(done) {
            oauthStub.getOAuthToken.returns(resolves(oauthToken));
            oauthStub.queryEmailAddress.returns(rejects(new Error()));

            auth.getOAuthToken().catch(function(err) {
                expect(err).to.exist;
                expect(auth.emailAddress).to.not.exist;
                expect(auth.oauthToken).to.not.exist;
                expect(oauthStub.getOAuthToken.calledOnce).to.be.true;
                expect(oauthStub.queryEmailAddress.calledOnce).to.be.true;

                done();
            });
        });

        it('should fail when oauth fetch fails', function(done) {
            oauthStub.getOAuthToken.returns(rejects(new Error()));

            auth.getOAuthToken().catch(function(err) {
                expect(err).to.exist;
                expect(auth.emailAddress).to.not.exist;
                expect(auth.oauthToken).to.not.exist;
                expect(oauthStub.getOAuthToken.calledOnce).to.be.true;
                expect(oauthStub.queryEmailAddress.called).to.be.false;

                done();
            });
        });
    });

    describe('#_loadCredentials', function() {
        it('should work', function(done) {
            storageStub.listItems.withArgs(EMAIL_ADDR_DB_KEY).returns(resolves([emailAddress]));
            storageStub.listItems.withArgs(PASSWD_DB_KEY).returns(resolves([encryptedPassword]));
            storageStub.listItems.withArgs(USERNAME_DB_KEY).returns(resolves([username]));
            storageStub.listItems.withArgs(REALNAME_DB_KEY).returns(resolves([realname]));
            storageStub.listItems.withArgs(IMAP_DB_KEY).returns(resolves([imap]));
            storageStub.listItems.withArgs(SMTP_DB_KEY).returns(resolves([smtp]));

            auth._loadCredentials().then(function() {
                expect(auth.emailAddress).to.equal(emailAddress);
                expect(auth.password).to.equal(encryptedPassword);
                expect(auth.imap).to.equal(imap);
                expect(auth.smtp).to.equal(smtp);
                expect(auth.username).to.equal(username);
                expect(auth.realname).to.equal(realname);

                expect(auth.passwordNeedsDecryption).to.be.true;

                expect(storageStub.listItems.callCount).to.equal(6);

                done();
            });
        });

        it('should fail', function(done) {
            storageStub.listItems.returns(rejects(new Error()));

            auth._loadCredentials().catch(function(err) {
                expect(err).to.exist;
                expect(auth.emailAddress).to.not.exist;
                expect(auth.password).to.not.exist;
                expect(auth.imap).to.not.exist;
                expect(auth.smtp).to.not.exist;
                expect(auth.username).to.not.exist;
                expect(auth.realname).to.not.exist;

                expect(storageStub.listItems.calledOnce).to.be.true;

                done();
            });
        });
    });

    describe('#handleCertificateUpdate', function() {
        var storeCredentialsStub;
        var dummyCert = 'cert';

        function onConnectDummy() {}

        beforeEach(function() {
            storeCredentialsStub = sinon.stub(auth, 'storeCredentials');
        });

        it('should work for Trust on first use', function(done) {
            auth.imap = {};
            storeCredentialsStub.returns(resolves());

            function callback() {
                expect(storeCredentialsStub.callCount).to.equal(1);
                done();
            }

            auth.handleCertificateUpdate('imap', onConnectDummy, callback, dummyCert);
        });

        it('should work for stored cert', function() {
            auth.imap = {
                ca: dummyCert
            };
            storeCredentialsStub.returns(resolves());

            function callback() {}

            auth.handleCertificateUpdate('imap', onConnectDummy, callback, dummyCert);

            expect(storeCredentialsStub.callCount).to.equal(0);
        });

        it('should work for pinned cert', function(done) {
            auth.imap = {
                ca: 'other',
                pinned: true
            };
            storeCredentialsStub.returns(resolves());

            function callback(err) {
                expect(err).to.exist;
                expect(err.message).to.exist;
                expect(storeCredentialsStub.callCount).to.equal(0);
                done();
            }

            auth.handleCertificateUpdate('imap', onConnectDummy, callback, dummyCert);
        });

        it('should work for updated cert', function(done) {
            auth.imap = {
                ca: 'other'
            };
            storeCredentialsStub.returns(resolves());

            function callback(err) {
                if (err && err.callback) {
                    expect(err).to.exist;
                    expect(err.message).to.exist;
                    expect(storeCredentialsStub.callCount).to.equal(0);
                    err.callback(true);
                } else {
                    expect(storeCredentialsStub.callCount).to.equal(1);
                    done();
                }
            }

            function onConnect(cb) {
                cb();
            }

            auth.handleCertificateUpdate('imap', onConnect, callback, dummyCert);
        });
    });

    describe('#logout', function() {
        it('should fail to to error in calling db clear', function(done) {
            storageStub.clear.returns(rejects(new Error()));

            auth.logout().catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            storageStub.clear.returns(resolves());

            auth.logout().then(function() {
                expect(auth.password).to.be.undefined;
                expect(auth.initialized).to.be.undefined;
                expect(auth.credentialsDirty).to.be.undefined;
                expect(auth.passwordNeedsDecryption).to.be.undefined;
                done();
            });
        });
    });
});