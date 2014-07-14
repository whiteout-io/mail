define(function(require) {
    'use strict';

    var Auth = require('js/bo/auth'),
        OAuth = require('js/util/oauth'),
        RestDAO = require('js/dao/rest-dao'),
        PGP = require('js/crypto/pgp'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        config = require('js/app-config').config,
        expect = chai.expect;

    describe('Auth unit tests', function() {
        // Constancts
        var EMAIL_ADDR_DB_KEY = 'emailaddress';
        var PASSWD_DB_KEY = 'password';
        var PROVIDER_DB_KEY = 'provider';

        // SUT
        var auth;

        // Dependencies
        var storageStub, oauthStub, caStub, pgpStub;

        // test data
        var emailAddress = 'bla@blubb.com';
        var password = 'passwordpasswordpassword';
        var encryptedPassword = 'pgppasswordpgppassword';
        var oauthToken = 'tokentokentokentoken';
        var provider = 'gmail';
        var imapCert = 'imapimapimapimapimap';
        var smtpCert = 'smtpsmtpsmtpsmtpsmtp';

        beforeEach(function() {
            storageStub = sinon.createStubInstance(DeviceStorageDAO);
            oauthStub = sinon.createStubInstance(OAuth);
            caStub = sinon.createStubInstance(RestDAO);
            pgpStub = sinon.createStubInstance(PGP);
            auth = new Auth(storageStub, oauthStub, caStub, pgpStub);
        });

        describe('#getCredentials', function() {
            beforeEach(function() {
                caStub.get.withArgs({
                    uri: '/' + config[provider].imap.sslCert,
                    type: 'text'
                }).yieldsAsync(null, imapCert);
                caStub.get.withArgs({
                    uri: '/' + config[provider].smtp.sslCert,
                    type: 'text'
                }).yieldsAsync(null, smtpCert);
            });

            it('should load credentials and retrieve credentials from cfg', function(done) {
                storageStub.listItems.withArgs(EMAIL_ADDR_DB_KEY, 0, null).yieldsAsync(null, [emailAddress]);
                storageStub.listItems.withArgs(PASSWD_DB_KEY, 0, null).yieldsAsync(null, [encryptedPassword]);
                storageStub.listItems.withArgs(PROVIDER_DB_KEY, 0, null).yieldsAsync(null, [provider]);
                pgpStub.decrypt.withArgs(encryptedPassword, undefined).yields(null, password);

                auth.getCredentials(function(err, credentials) {
                    expect(err).to.not.exist;

                    expect(auth.provider).to.equal(provider);
                    expect(auth.emailAddress).to.equal(emailAddress);
                    expect(auth.password).to.equal(password);

                    expect(credentials.emailAddress).to.equal(emailAddress);
                    expect(credentials.password).to.equal(password);
                    expect(credentials.imap).to.equal(config[provider].imap);
                    expect(credentials.smtp).to.equal(config[provider].smtp);
                    expect(credentials.imap.ca).to.deep.equal([imapCert]);
                    expect(credentials.smtp.ca).to.deep.equal([smtpCert]);

                    expect(storageStub.listItems.calledThrice).to.be.true;
                    expect(pgpStub.decrypt.calledOnce).to.be.true;

                    done();
                });
            });

            it('should use user/pass and retrieve credentials from cfg', function(done) {
                auth.provider = provider;
                auth.emailAddress = emailAddress;
                oauthStub.getOAuthToken.withArgs(emailAddress).yieldsAsync(null, oauthToken);

                auth.getCredentials(function(err, credentials) {
                    expect(err).to.not.exist;
                    expect(auth.provider).to.equal(provider);
                    expect(auth.emailAddress).to.equal(emailAddress);
                    expect(auth.oauthToken).to.equal(oauthToken);

                    expect(credentials.emailAddress).to.equal(emailAddress);
                    expect(credentials.oauthToken).to.equal(oauthToken);
                    expect(credentials.imap).to.equal(config[provider].imap);
                    expect(credentials.smtp).to.equal(config[provider].smtp);
                    expect(credentials.imap.ca).to.exist;
                    expect(credentials.smtp.ca).to.exist;

                    expect(oauthStub.getOAuthToken.calledOnce).to.be.true;

                    done();
                });
            });

            it('should use user/pass and retrieve credentials from cfg', function(done) {
                auth.provider = provider;
                auth.emailAddress = emailAddress;
                auth.password = password;

                auth.getCredentials(function(err, credentials) {
                    expect(err).to.not.exist;
                    expect(auth.provider).to.equal(provider);
                    expect(credentials.emailAddress).to.equal(emailAddress);
                    expect(credentials.oauthToken).to.not.exist;
                    expect(credentials.password).to.equal(password);
                    expect(credentials.imap).to.equal(config[provider].imap);
                    expect(credentials.smtp).to.equal(config[provider].smtp);
                    expect(credentials.imap.ca).to.exist;
                    expect(credentials.smtp.ca).to.exist;

                    done();
                });
            });
        });

        describe('#setCredentials', function() {
            it('should fetch email address from identity api and store the credentials', function(done) {
                oauthStub.getOAuthToken.withArgs(undefined).yieldsAsync(null, oauthToken);
                oauthStub.queryEmailAddress.withArgs(oauthToken).yieldsAsync(null, emailAddress);
                storageStub.storeList.withArgs([emailAddress], EMAIL_ADDR_DB_KEY).yieldsAsync();
                storageStub.storeList.withArgs([provider], PROVIDER_DB_KEY).yieldsAsync();

                auth.setCredentials({
                    provider: provider
                }, function(err) {
                    expect(err).to.not.exist;

                    expect(auth.credentialsDirty).to.be.false;
                    expect(auth.emailAddress).to.equal(emailAddress);
                    expect(auth.provider).to.equal(provider);
                    expect(storageStub.storeList.calledTwice).to.be.true;

                    done();
                });
            });

            it('should set the credentials', function(done) {
                var otherProvider = 'providaaaa';

                auth.setCredentials({
                    provider: otherProvider,
                    emailAddress: emailAddress,
                    password: password
                }, function(err) {
                    expect(err).to.not.exist;

                    expect(auth.credentialsDirty).to.be.true;
                    expect(auth.emailAddress).to.equal(emailAddress);
                    expect(auth.password).to.equal(password);
                    expect(auth.provider).to.equal(otherProvider);
                    expect(storageStub.storeList.called).to.be.false;

                    done();
                });
            });

        });

        describe('#storeCredentials', function() {
            it('should persist provider, username, password', function(done) {
                auth.credentialsDirty = true;
                auth.emailAddress = emailAddress;
                auth.password = password;
                auth.provider = provider;

                storageStub.storeList.withArgs([emailAddress], EMAIL_ADDR_DB_KEY).yieldsAsync();
                storageStub.storeList.withArgs([encryptedPassword], PASSWD_DB_KEY).yieldsAsync();
                storageStub.storeList.withArgs([provider], PROVIDER_DB_KEY).yieldsAsync();
                pgpStub.encrypt.withArgs(password).yields(null, encryptedPassword);

                auth.storeCredentials(function(err) {
                    expect(err).to.not.exist;

                    expect(storageStub.storeList.calledThrice).to.be.true;
                    expect(pgpStub.encrypt.calledOnce).to.be.true;

                    done();
                });
            });
        });

        describe('#_getOAuthToken', function() {
            it('should fetch token with known email address', function(done) {
                auth.emailAddress = emailAddress;
                oauthStub.getOAuthToken.withArgs(emailAddress).yieldsAsync(null, oauthToken);

                auth._getOAuthToken(function(err) {
                    expect(err).to.not.exist;
                    expect(auth.emailAddress).to.equal(emailAddress);
                    expect(auth.oauthToken).to.equal(oauthToken);

                    expect(oauthStub.getOAuthToken.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fetch token with unknown email address', function(done) {
                oauthStub.getOAuthToken.withArgs(undefined).yieldsAsync(null, oauthToken);
                oauthStub.queryEmailAddress.withArgs(oauthToken).yieldsAsync(null, emailAddress);

                auth._getOAuthToken(function(err) {
                    expect(err).to.not.exist;
                    expect(auth.emailAddress).to.equal(emailAddress);
                    expect(auth.oauthToken).to.equal(oauthToken);

                    expect(oauthStub.getOAuthToken.calledOnce).to.be.true;
                    expect(oauthStub.queryEmailAddress.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when email address fetch fails', function(done) {
                oauthStub.getOAuthToken.yieldsAsync(null, oauthToken);
                oauthStub.queryEmailAddress.yieldsAsync(new Error());

                auth._getOAuthToken(function(err) {
                    expect(err).to.exist;
                    expect(auth.emailAddress).to.not.exist;
                    expect(auth.oauthToken).to.not.exist;

                    expect(oauthStub.getOAuthToken.calledOnce).to.be.true;
                    expect(oauthStub.queryEmailAddress.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail when oauth fetch fails', function(done) {
                oauthStub.getOAuthToken.yieldsAsync(new Error());

                auth._getOAuthToken(function(err) {
                    expect(err).to.exist;
                    expect(auth.emailAddress).to.not.exist;
                    expect(auth.oauthToken).to.not.exist;

                    expect(oauthStub.getOAuthToken.calledOnce).to.be.true;
                    expect(oauthStub.queryEmailAddress.called).to.be.false;

                    done();
                });
            });
        });

        describe('#_getCertificate', function() {
            it('should work', function(done) {
                var filename = 'CERTIFICATE';
                caStub.get.withArgs({
                    uri: '/' + filename,
                    type: 'text'
                }).yieldsAsync(null, 'cert');

                auth._getCertificate(filename, function(err, cert) {
                    expect(err).to.not.exist;
                    expect(cert).to.equal('cert');
                    expect(caStub.get.calledOnce).to.be.true;

                    done();
                });
            });

            it('should fail', function(done) {
                var filename = 'CERTIFICATE';
                caStub.get.yieldsAsync();

                auth._getCertificate(filename, function(err, cert) {
                    expect(err).to.exist;
                    expect(cert).to.not.exist;
                    expect(caStub.get.calledOnce).to.be.true;

                    done();
                });
            });
        });

        describe('#_loadCredentials', function() {
            it('should work', function(done) {
                storageStub.listItems.withArgs(EMAIL_ADDR_DB_KEY, 0, null).yieldsAsync(null, [emailAddress]);
                storageStub.listItems.withArgs(PASSWD_DB_KEY, 0, null).yieldsAsync(null, [encryptedPassword]);
                storageStub.listItems.withArgs(PROVIDER_DB_KEY, 0, null).yieldsAsync(null, [provider]);

                auth._loadCredentials(function(err) {
                    expect(err).to.not.exist;
                    expect(auth.emailAddress).to.equal(emailAddress);
                    expect(auth.password).to.equal(encryptedPassword);
                    expect(auth.provider).to.equal(provider);
                    expect(auth.passwordNeedsDecryption).to.be.true;

                    expect(storageStub.listItems.calledThrice).to.be.true;

                    done();
                });
            });

            it('should fail', function(done) {
                storageStub.listItems.yieldsAsync(new Error());

                auth._loadCredentials(function(err) {
                    expect(err).to.exist;
                    expect(auth.emailAddress).to.not.exist;
                    expect(auth.password).to.not.exist;
                    expect(auth.provider).to.not.exist;

                    expect(storageStub.listItems.calledOnce).to.be.true;

                    done();
                });
            });
        });
    });
});