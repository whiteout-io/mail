'use strict';

var mocks = angular.mock,
    AddAccountCtrl = require('../../src/js/controller/add-account'),
    Auth = require('../../src/js/bo/auth'),
    appController = require('../../src/js/app-controller'),
    cfg = require('../../src/js/app-config').config;

describe('Add Account Controller unit test', function() {
    var scope, location, httpBackend, ctrl, authStub, origAuth;

    beforeEach(function() {
        // remember original module to restore later, then replace it
        origAuth = appController._auth;
        appController._auth = authStub = sinon.createStubInstance(Auth);

        angular.module('addaccounttest', []);
        mocks.module('addaccounttest');
        mocks.inject(function($controller, $rootScope, $location, $httpBackend) {
            location = $location;
            httpBackend = $httpBackend;
            scope = $rootScope.$new();
            scope.state = {};
            scope.form = {};
            scope.formValidate = {};

            sinon.stub(location, 'path').returns(location);
            sinon.stub(location, 'search').returns(location);
            sinon.stub(scope, '$apply', function() {});

            ctrl = $controller(AddAccountCtrl, {
                $location: location,
                $scope: scope,
                $routeParams: {}
            });
        });
    });

    afterEach(function() {
        // restore the app controller module
        appController._auth = origAuth;

        location.path.restore();
        location.search.restore();
        if (scope.$apply.restore) {
            scope.$apply.restore();
        }

        httpBackend.verifyNoOutstandingExpectation();
        httpBackend.verifyNoOutstandingRequest();
    });

    describe('getAccountSettings', function() {
        var url, connectToGoogleStub, setCredentialsStub, mailConfig;

        beforeEach(function() {
            scope.form.$invalid = false;
            scope.emailAddress = 'test@example.com';
            url = cfg.settingsUrl + 'example.com';
            mailConfig = {
                imap: {
                    hostname: 'imap.example.com',
                    source: 'guess'
                }
            };
            connectToGoogleStub = sinon.stub(scope, 'connectToGoogle');
            setCredentialsStub = sinon.stub(scope, 'setCredentials');
        });

        afterEach(function() {
            connectToGoogleStub.restore();
            setCredentialsStub.restore();
        });

        it('should work for gmail', function() {
            mailConfig.imap.hostname = 'imap.gmail.com';
            httpBackend.expectGET(url).respond(mailConfig);

            scope.getAccountSettings();
            httpBackend.flush();

            expect(connectToGoogleStub.calledOnce).to.be.true;
        });

        it('should work for guessed domain', function() {
            httpBackend.expectGET(url).respond(mailConfig);

            scope.getAccountSettings();
            httpBackend.flush();

            expect(setCredentialsStub.calledWith('custom')).to.be.true;
        });

        it('should work for dns domain', function() {
            mailConfig.imap.source = 'dns';
            httpBackend.expectGET(url).respond(mailConfig);

            scope.getAccountSettings();
            httpBackend.flush();

            expect(setCredentialsStub.calledWith(undefined)).to.be.true;
        });

        it('should fail with http 500', function() {
            httpBackend.expectGET(url).respond(500, '');

            scope.getAccountSettings();
            httpBackend.flush();

            expect(scope.errMsg).to.exist;
        });
    });

    describe('connectToGoogle', function() {
        var setCredentialsStub;

        beforeEach(function() {
            setCredentialsStub = sinon.stub(scope, 'setCredentials');
        });

        afterEach(function() {
            setCredentialsStub.restore();
        });

        it('should use oauth', function() {
            authStub._oauth = {
                isSupported: function() {
                    return true;
                }
            };
            scope.onError = function(options) {
                options.callback(true);
            };
            authStub.getOAuthToken.yields();

            scope.connectToGoogle();

            expect(setCredentialsStub.calledWith('gmail')).to.be.true;
            expect(authStub.getOAuthToken.calledOnce).to.be.true;
        });

        it('should not use oauth', function() {
            authStub._oauth = {
                isSupported: function() {
                    return true;
                }
            };
            scope.onError = function(options) {
                options.callback(false);
            };

            scope.connectToGoogle();

            expect(setCredentialsStub.calledWith('gmail')).to.be.true;
            expect(authStub.getOAuthToken.called).to.be.false;
        });

        it('should not use oauth if not supported', function() {
            authStub._oauth = {
                isSupported: function() {
                    return false;
                }
            };

            scope.connectToGoogle();

            expect(setCredentialsStub.calledWith('gmail')).to.be.true;
            expect(authStub.getOAuthToken.called).to.be.false;
        });

        it('should not forward to login when oauth fails', function(done) {
            authStub._oauth = {
                isSupported: function() {
                    return true;
                }
            };
            scope.onError = function(options) {
                scope.onError = function(err) {
                    expect(err).to.exist;
                    expect(setCredentialsStub.called).to.be.false;
                    done();
                };

                options.callback(true);
            };
            authStub.getOAuthToken.yields(new Error());

            scope.connectToGoogle();
        });
    });

    describe('setCredentials', function() {
        it('should work', function() {
            scope.setCredentials('gmail');

            expect(location.path.calledWith('/login-set-credentials')).to.be.true;
            expect(location.search.calledWith({
                provider: 'gmail'
            })).to.be.true;
        });
    });

});