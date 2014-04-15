define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        LoginInitialCtrl = require('js/controller/login-initial'),
        PGP = require('js/crypto/pgp'),
        EmailDAO = require('js/dao/email-dao'),
        appController = require('js/app-controller');

    describe('Login (initial user) Controller unit test', function() {
        var scope, ctrl, location, origEmailDao, emailDaoMock,
            emailAddress = 'fred@foo.com',
            passphrase = 'asd',
            keyId, expectedKeyId,
            cryptoMock;

        beforeEach(function() {
            // remember original module to restore later
            origEmailDao = appController._emailDao;

            emailDaoMock = sinon.createStubInstance(EmailDAO);
            appController._emailDao = emailDaoMock;

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
        });

        describe('initial state', function() {
            it('should be well defined', function() {
                expect(scope.confirmPassphrase).to.exist;
                expect(scope.state.ui).to.equal(1);
            });
        });

        describe('go to import key', function() {
            it('should not continue if terms are not accepted', function(done) {
                scope.state.agree = undefined;

                scope.onError = function(err) {
                    expect(err.message).to.contain('Terms');
                    done();
                };

                scope.importKey();
            });

            it('should work', function() {
                scope.state.agree = true;
                scope.importKey();
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

        describe('confirm passphrase', function() {
            var setStateStub;

            it('should not continue if terms are not accepted', function(done) {
                scope.state.passphrase = passphrase;
                scope.state.confirmation = passphrase;
                scope.state.agree = undefined;

                scope.onError = function(err) {
                    expect(err.message).to.contain('Terms');
                    done();
                };

                scope.confirmPassphrase();
            });

            it('should unlock crypto', function(done) {
                scope.state.passphrase = passphrase;
                scope.state.confirmation = passphrase;
                scope.state.agree = true;

                emailDaoMock.unlock.withArgs({
                    passphrase: passphrase
                }).yields();

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
                scope.state.agree = true;

                emailDaoMock.unlock.withArgs({
                    passphrase: passphrase
                }).yields(new Error('asd'));

                setStateStub = sinon.stub(scope, 'setState', function(state) {
                    if (setStateStub.calledOnce) {
                        expect(state).to.equal(2);
                    } else if (setStateStub.calledTwice) {
                        expect(state).to.equal(1);
                        expect(emailDaoMock.unlock.calledOnce).to.be.true;
                        scope.setState.restore();
                        done();
                    }
                });

                scope.confirmPassphrase();
            });
        });

    });
});