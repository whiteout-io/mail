define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        Auth = require('js/bo/auth'),
        mocks = require('angularMocks'),
        LoginInitialCtrl = require('js/controller/login-initial'),
        PGP = require('js/crypto/pgp'),
        EmailDAO = require('js/dao/email-dao'),
        appController = require('js/app-controller');

    describe('Login (initial user) Controller unit test', function() {
        var scope, ctrl, location, origEmailDao, emailDaoMock,
            origAuth, authMock,
            emailAddress = 'fred@foo.com',
            passphrase = 'asd',
            keyId, expectedKeyId,
            cryptoMock;

        beforeEach(function() {
            // remember original module to restore later
            origEmailDao = appController._emailDao;
            origAuth = appController._auth;

            appController._emailDao = emailDaoMock = sinon.createStubInstance(EmailDAO);
            appController._auth = authMock = sinon.createStubInstance(Auth);

            keyId = '9FEB47936E712926';
            expectedKeyId = '6E712926';
            cryptoMock = sinon.createStubInstance(PGP);
            emailDaoMock._crypto = cryptoMock;

            emailDaoMock._account = {
                emailAddress: emailAddress,
            };

            angular.module('logininitialtest', []);
            mocks.module('logininitialtest');
            mocks.inject(function($rootScope, $controller, $location) {
                scope = $rootScope.$new();
                location = $location;
                scope.state = {
                    ui: {}
                };
                ctrl = $controller(LoginInitialCtrl, {
                    $scope: scope
                });
            });
        });

        afterEach(function() {
            // restore the module
            appController._emailDao = origEmailDao;
            appController._auth = origAuth;
        });

        describe('initial state', function() {
            it('should be well defined', function() {
                expect(scope.confirmPassphrase).to.exist;
                expect(scope.state.ui).to.equal(1);
            });
        });

        describe('signUpToNewsletter', function() {
            var xhrMock, requests;

            beforeEach(function() {
                xhrMock = sinon.useFakeXMLHttpRequest();
                requests = [];

                xhrMock.onCreate = function(xhr) {
                    requests.push(xhr);
                };
            });

            afterEach(function() {
                xhrMock.restore();
            });

            it('should not signup', function() {
                scope.state.newsletter = false;

                scope.signUpToNewsletter();
                expect(requests.length).to.equal(0);
            });

            it('should fail', function(done) {
                scope.state.newsletter = true;

                scope.signUpToNewsletter(function(err, xhr) {
                    expect(err).to.exist;
                    expect(xhr).to.not.exist;
                    done();
                });

                expect(requests.length).to.equal(1);
                requests[0].onerror('err');
            });

            it('should work without callback', function() {
                scope.state.newsletter = true;

                scope.signUpToNewsletter();

                expect(requests.length).to.equal(1);
                requests[0].respond(200, {
                    "Content-Type": "text/plain"
                }, 'foobar!');
            });
        });

        describe('go to import key', function() {
            var signUpToNewsletterStub;
            beforeEach(function() {
                signUpToNewsletterStub = sinon.stub(scope, 'signUpToNewsletter');
            });
            afterEach(function() {
                signUpToNewsletterStub.restore();
            });

            it('should not continue if terms are not accepted', function(done) {
                scope.state.agree = undefined;

                scope.onError = function(err) {
                    expect(err.message).to.contain('Terms');
                    expect(signUpToNewsletterStub.called).to.be.false;
                    done();
                };

                scope.importKey();
            });

            it('should work', function() {
                scope.state.agree = true;
                scope.importKey();
                expect(signUpToNewsletterStub.calledOnce).to.be.true;
                expect(location.$$path).to.equal('/login-new-device');
            });
        });

        describe('check passphrase quality', function() {
            it('should be too short', function() {
                scope.state.passphrase = '&§DG36';
                scope.checkPassphraseQuality();

                expect(scope.passphraseMsg).to.equal('Very weak');
                expect(scope.passphraseRating).to.equal(0);
            });

            it('should be very weak', function() {
                scope.state.passphrase = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
                scope.checkPassphraseQuality();

                expect(scope.passphraseMsg).to.equal('Very weak');
                expect(scope.passphraseRating).to.equal(0);
            });

            it('should be weak', function() {
                scope.state.passphrase = 'asdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdf';
                scope.checkPassphraseQuality();

                expect(scope.passphraseMsg).to.equal('Weak');
                expect(scope.passphraseRating).to.equal(1);
            });

            it('should be good', function() {
                scope.state.passphrase = 'asdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdf5';
                scope.checkPassphraseQuality();

                expect(scope.passphraseMsg).to.equal('Good');
                expect(scope.passphraseRating).to.equal(2);
            });

            it('should be strong', function() {
                scope.state.passphrase = '&§DG36abcd';
                scope.checkPassphraseQuality();

                expect(scope.passphraseMsg).to.equal('Strong');
                expect(scope.passphraseRating).to.equal(3);
            });
        });

        describe('setPassphrase', function() {
            var signUpToNewsletterStub;
            beforeEach(function() {
                signUpToNewsletterStub = sinon.stub(scope, 'signUpToNewsletter');
            });
            afterEach(function() {
                signUpToNewsletterStub.restore();
            });

            it('should not continue if terms are not accepted', function(done) {
                scope.state.agree = undefined;

                scope.onError = function(err) {
                    expect(err.message).to.contain('Terms');
                    expect(signUpToNewsletterStub.called).to.be.false;
                    done();
                };

                scope.setPassphrase();
            });

            it('should continue', function(done) {
                scope.state.agree = true;

                var setStateStub = sinon.stub(scope, 'setState', function(state) {
                    expect(setStateStub.calledOnce).to.be.true;
                    expect(signUpToNewsletterStub.calledOnce).to.be.true;
                    expect(state).to.equal(2);
                    done();
                });

                scope.setPassphrase();
            });
        });

        describe('confirm passphrase', function() {
            var setStateStub;

            it('should unlock crypto', function(done) {
                scope.state.passphrase = passphrase;
                scope.state.confirmation = passphrase;

                emailDaoMock.unlock.withArgs({
                    passphrase: passphrase
                }).yields();
                authMock.storeCredentials.yields();

                scope.$apply = function() {
                    expect(location.$$path).to.equal('/desktop');
                    expect(emailDaoMock.unlock.calledOnce).to.be.true;
                    done();
                };

                scope.confirmPassphrase();
            });

            it('should not do anything matching passphrases', function() {
                scope.state.passphrase = 'a';
                scope.state.confirmation = 'b';

                scope.confirmPassphrase();
            });

            it('should not work when keypair generation fails', function(done) {
                scope.state.passphrase = passphrase;
                scope.state.confirmation = passphrase;

                emailDaoMock.unlock.withArgs({
                    passphrase: passphrase
                }).yields(new Error('asd'));

                setStateStub = sinon.stub(scope, 'setState', function(state) {
                    if (setStateStub.calledOnce) {
                        expect(state).to.equal(3);
                    } else if (setStateStub.calledTwice) {
                        expect(state).to.equal(2);
                        expect(emailDaoMock.unlock.calledOnce).to.be.true;
                        scope.setState.restore();
                    }
                });

                scope.onError = function(err) {
                    expect(err.message).to.equal('asd');
                    done();
                };

                scope.confirmPassphrase();
            });
        });

    });
});