'use strict';

var OAuth = require('../../src/js/util/oauth'),
    RestDAO = require('../../src/js/dao/rest-dao');

describe('OAuth unit tests', function() {
    var oauth, googleApiStub, identityStub, getPlatformInfoStub, removeCachedStub,
        testEmail = 'test@example.com';

    beforeEach(function() {
        googleApiStub = sinon.createStubInstance(RestDAO);
        oauth = new OAuth(googleApiStub);

        window.chrome = window.chrome || {};

        window.chrome.identity = window.chrome.identity || {};
        if (typeof window.chrome.identity.getAuthToken !== 'function') {
            window.chrome.identity.getAuthToken = function() {};
        }
        identityStub = sinon.stub(window.chrome.identity, 'getAuthToken');

        if (typeof window.chrome.identity.removeCachedAuthToken !== 'function') {
            window.chrome.identity.removeCachedAuthToken = function() {};
        }
        removeCachedStub = sinon.stub(window.chrome.identity, 'removeCachedAuthToken');

        window.chrome.runtime = window.chrome.runtime || {};
        if (typeof window.chrome.runtime.getPlatformInfo !== 'function') {
            window.chrome.runtime.getPlatformInfo = function() {};
        }
        getPlatformInfoStub = sinon.stub(window.chrome.runtime, 'getPlatformInfo');
    });

    afterEach(function() {
        identityStub.restore();
        getPlatformInfoStub.restore();
        removeCachedStub.restore();
    });

    describe('isSupported', function() {
        it('should work', function() {
            expect(oauth.isSupported()).to.be.true;
        });
    });

    describe('refreshToken', function() {
        var getOAuthTokenStub;

        beforeEach(function() {
            getOAuthTokenStub = sinon.stub(oauth, 'getOAuthToken');
        });
        afterEach(function() {
            getOAuthTokenStub.restore();
        });

        it('should work', function() {
            removeCachedStub.withArgs({
                token: 'oldToken'
            }).yields();

            getOAuthTokenStub.withArgs(testEmail).yields();

            oauth.refreshToken({
                oldToken: 'oldToken',
                emailAddress: testEmail
            }, function(err) {
                expect(err).to.not.exist;
                expect(removeCachedStub.calledOnce).to.be.true;
                expect(getOAuthTokenStub.calledOnce).to.be.true;
            });
        });

        it('should work without email', function() {
            removeCachedStub.withArgs({
                token: 'oldToken'
            }).yields();

            getOAuthTokenStub.withArgs(undefined).yields();

            oauth.refreshToken({
                oldToken: 'oldToken',
            }, function(err) {
                expect(err).to.not.exist;
                expect(removeCachedStub.calledOnce).to.be.true;
                expect(getOAuthTokenStub.calledOnce).to.be.true;
                expect(getOAuthTokenStub.calledWith(undefined)).to.be.true;
            });
        });

        it('should fail without all options', function() {
            oauth.refreshToken({
                emailAddress: testEmail
            }, function(err) {
                expect(err).to.exist;
                expect(removeCachedStub.called).to.be.false;
                expect(getOAuthTokenStub.called).to.be.false;
            });
        });
    });

    describe('getOAuthToken', function() {
        it('should work for empty emailAddress', function(done) {
            getPlatformInfoStub.yields({
                os: 'android'
            });
            identityStub.withArgs({
                interactive: true
            }).yields('token');

            oauth.getOAuthToken(undefined, function(err, token) {
                expect(err).to.not.exist;
                expect(token).to.equal('token');
                done();
            });
        });

        it('should work on android app', function(done) {
            getPlatformInfoStub.yields({
                os: 'android'
            });
            identityStub.withArgs({
                interactive: true,
                accountHint: testEmail
            }).yields('token');

            oauth.getOAuthToken(testEmail, function(err, token) {
                expect(err).to.not.exist;
                expect(token).to.equal('token');
                done();
            });
        });

        it('should work on desktop chrome', function(done) {
            getPlatformInfoStub.yields({
                os: 'mac'
            });
            identityStub.withArgs({
                interactive: true
            }).yields('token');

            oauth.getOAuthToken(testEmail, function(err, token) {
                expect(err).to.not.exist;
                expect(token).to.equal('token');
                done();
            });
        });

        it('should fail', function(done) {
            getPlatformInfoStub.yields({
                os: 'android'
            });
            identityStub.yields();

            oauth.getOAuthToken(testEmail, function(err, token) {
                expect(err).to.exist;
                expect(token).to.not.exist;
                done();
            });
        });
    });

    describe('queryEmailAddress', function() {
        it('should work', function(done) {
            googleApiStub.get.withArgs({
                uri: '/oauth2/v3/userinfo?access_token=token'
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
                uri: '/oauth2/v3/userinfo?access_token=token'
            }).yields(new Error());

            oauth.queryEmailAddress('token', function(err, emailAddress) {
                expect(err).to.exist;
                expect(emailAddress).to.not.exist;
                done();
            });
        });
    });

});