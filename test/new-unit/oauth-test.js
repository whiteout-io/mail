define(function(require) {
    'use strict';

    var OAuth = require('js/util/oauth'),
        RestDAO = require('js/dao/rest-dao'),
        expect = chai.expect;

    describe('OAuth unit tests', function() {
        var oauth, googleApiStub, identityStub;

        beforeEach(function() {
            googleApiStub = sinon.createStubInstance(RestDAO);
            oauth = new OAuth(googleApiStub);

            window.chrome = window.chrome || {};
            window.chrome.identity = window.chrome.identity || {};
            if (typeof window.chrome.identity.getAuthToken !== 'function') {
                window.chrome.identity.getAuthToken = function() {};
            }
            identityStub = sinon.stub(window.chrome.identity, 'getAuthToken');
        });

        afterEach(function() {
            identityStub.restore();
        });

        describe('isSupported', function() {
            it('should work', function() {
                expect(oauth.isSupported()).to.be.true;
            });
        });

        describe('getOAuthToken', function() {
            it('should work', function(done) {
                identityStub.yields('token');

                oauth.getOAuthToken(function(err, token) {
                    expect(err).to.not.exist;
                    expect(token).to.equal('token');
                    done();
                });
            });

            it('should fail', function(done) {
                identityStub.yields();

                oauth.getOAuthToken(function(err, token) {
                    expect(err).to.exist;
                    expect(token).to.not.exist;
                    done();
                });
            });
        });

        describe('queryEmailAddress', function() {
            it('should work', function(done) {
                googleApiStub.get.withArgs({
                    uri: '/oauth2/v1/tokeninfo?access_token=token'
                }).yields(null, {
                    email: 'asdf@example.com'
                });

                oauth.queryEmailAddress('token', function(err, emailAddress) {
                    expect(err).to.not.exist;
                    expect(emailAddress).to.equal('asdf@example.com');
                    done();
                });
            });

            it('should fail due to invalid token', function(done) {
                oauth.queryEmailAddress('', function(err, emailAddress) {
                    expect(err).to.exist;
                    expect(emailAddress).to.not.exist;
                    done();
                });
            });

            it('should fail due to error in rest api', function(done) {
                googleApiStub.get.withArgs({
                    uri: '/oauth2/v1/tokeninfo?access_token=token'
                }).yields(new Error());

                oauth.queryEmailAddress('token', function(err, emailAddress) {
                    expect(err).to.exist;
                    expect(emailAddress).to.not.exist;
                    done();
                });
            });
        });

    });
});