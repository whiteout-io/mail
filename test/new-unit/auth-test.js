define(function(require) {
    'use strict';

    var Auth = require('js/bo/auth'),
        OAuth = require('js/util/oauth'),
        RestDAO = require('js/dao/rest-dao'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        expect = chai.expect;

    describe('Auth unit tests', function() {
        var auth, appConfigStoreStub, oauthStub, caStub;

        beforeEach(function() {
            appConfigStoreStub = sinon.createStubInstance(DeviceStorageDAO);
            oauthStub = sinon.createStubInstance(OAuth);
            caStub = sinon.createStubInstance(RestDAO);
            auth = new Auth(appConfigStoreStub, oauthStub, caStub);
        });

        afterEach(function() {});

        describe('getCredentials', function() {
            var getCertificateStub, queryEmailAddressStub;

            beforeEach(function() {
                getCertificateStub = sinon.stub(auth, 'getCertificate');
                queryEmailAddressStub = sinon.stub(auth, 'queryEmailAddress');
            });

            it('should work', function(done) {
                getCertificateStub.yields(null, 'cert');
                queryEmailAddressStub.withArgs('token').yields(null, 'asdf@example.com');
                oauthStub.getOAuthToken.yields(null, 'token');

                auth.getCredentials({}, function(err, credentials) {
                    expect(err).to.not.exist;
                    expect(credentials.emailAddress).to.equal('asdf@example.com');
                    expect(credentials.oauthToken).to.equal('token');
                    expect(credentials.sslCert).to.equal('cert');
                    done();
                });
            });

            it('should fail due to error in getCertificate', function(done) {
                getCertificateStub.yields(new Error());

                auth.getCredentials({}, function(err, credentials) {
                    expect(err).to.exist;
                    expect(credentials).to.not.exist;
                    done();
                });
            });

            it('should fail due to error in getOAuthToken', function(done) {
                getCertificateStub.yields(null, 'cert');
                oauthStub.getOAuthToken.yields(new Error());

                auth.getCredentials({}, function(err, credentials) {
                    expect(err).to.exist;
                    expect(credentials).to.not.exist;
                    done();
                });
            });

            it('should fail due to error in queryEmailAddress', function(done) {
                getCertificateStub.yields(null, 'cert');
                queryEmailAddressStub.withArgs('token').yields(new Error());
                oauthStub.getOAuthToken.yields(null, 'token');

                auth.getCredentials({}, function(err, credentials) {
                    expect(err).to.exist;
                    expect(credentials).to.not.exist;
                    done();
                });
            });
        });

        describe('getCertificate', function() {
            it('should work', function(done) {
                caStub.get.yields(null, 'cert');

                auth.getCertificate(function(err, cert) {
                    expect(err).to.not.exist;
                    expect(cert).to.equal('cert');
                    done();
                });
            });

            it('should fail', function(done) {
                caStub.get.yields(null, '');

                auth.getCertificate(function(err, cert) {
                    expect(err).to.exist;
                    expect(cert).to.not.exist;
                    done();
                });
            });
        });

        describe('getEmailAddress', function() {
            var getEmailAddressFromConfigStub;

            beforeEach(function() {
                getEmailAddressFromConfigStub = sinon.stub(auth, 'getEmailAddressFromConfig');
            });

            it('should work', function(done) {
                getEmailAddressFromConfigStub.yields(null, 'asdf@example.com');

                auth.getEmailAddress(function(err, emailAddress) {
                    expect(err).to.not.exist;
                    expect(emailAddress).to.equal('asdf@example.com');
                    done();
                });
            });

            it('should fail', function(done) {
                getEmailAddressFromConfigStub.yields(new Error());

                auth.getEmailAddress(function(err, emailAddress) {
                    expect(err).to.exist;
                    expect(emailAddress).to.not.exist;
                    done();
                });
            });
        });

        describe('getEmailAddressFromConfig', function() {
            it('should work', function(done) {
                appConfigStoreStub.listItems.withArgs('emailaddress', 0, null).yields(null, ['asdf@example.com']);

                auth.getEmailAddressFromConfig(function(err, emailAddress) {
                    expect(err).to.not.exist;
                    expect(emailAddress).to.equal('asdf@example.com');
                    done();
                });
            });

            it('should return empty result', function(done) {
                appConfigStoreStub.listItems.withArgs('emailaddress', 0, null).yields(null, []);

                auth.getEmailAddressFromConfig(function(err, emailAddress) {
                    expect(err).to.not.exist;
                    expect(emailAddress).to.not.exist;
                    done();
                });
            });

            it('should fail', function(done) {
                appConfigStoreStub.listItems.withArgs('emailaddress', 0, null).yields(new Error());

                auth.getEmailAddressFromConfig(function(err, emailAddress) {
                    expect(err).to.exist;
                    expect(emailAddress).to.not.exist;
                    done();
                });
            });
        });

        describe('queryEmailAddress', function() {
            var getEmailAddressFromConfigStub;

            beforeEach(function() {
                getEmailAddressFromConfigStub = sinon.stub(auth, 'getEmailAddressFromConfig');
            });

            it('should if already cached', function(done) {
                getEmailAddressFromConfigStub.yields(null, 'asdf@example.com');

                auth.queryEmailAddress('token', function(err, emailAddress) {
                    expect(err).to.not.exist;
                    expect(emailAddress).to.equal('asdf@example.com');
                    done();
                });
            });

            it('should when querying oauth api', function(done) {
                getEmailAddressFromConfigStub.yields();
                oauthStub.queryEmailAddress.withArgs('token').yields(null, 'asdf@example.com');
                appConfigStoreStub.storeList.withArgs(['asdf@example.com'], 'emailaddress').yields();

                auth.queryEmailAddress('token', function(err, emailAddress) {
                    expect(err).to.not.exist;
                    expect(emailAddress).to.equal('asdf@example.com');
                    done();
                });
            });

            it('should fail due to error in cache lookup', function(done) {
                getEmailAddressFromConfigStub.yields(new Error());

                auth.queryEmailAddress('token', function(err, emailAddress) {
                    expect(err).to.exist;
                    expect(emailAddress).to.not.exist;
                    done();
                });
            });

            it('should fail due to error in oauth api', function(done) {
                getEmailAddressFromConfigStub.yields();
                oauthStub.queryEmailAddress.withArgs('token').yields(new Error());

                auth.queryEmailAddress('token', function(err, emailAddress) {
                    expect(err).to.exist;
                    expect(emailAddress).to.not.exist;
                    done();
                });
            });

            it('should fail due to error in oauth api', function(done) {
                getEmailAddressFromConfigStub.yields();
                oauthStub.queryEmailAddress.withArgs('token').yields(null, 'asdf@example.com');
                appConfigStoreStub.storeList.withArgs(['asdf@example.com'], 'emailaddress').yields(new Error());

                auth.queryEmailAddress('token', function(err, emailAddress) {
                    expect(err).to.exist;
                    expect(emailAddress).to.exist;
                    done();
                });
            });
        });

    });
});