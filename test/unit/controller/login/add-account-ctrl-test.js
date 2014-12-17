'use strict';

var AddAccountCtrl = require('../../../../src/js/controller/login/add-account'),
    Auth = require('../../../../src/js/service/auth'),
    Dialog = require('../../../../src/js/util/dialog'),
    cfg = require('../../../../src/js/app-config').config;

describe('Add Account Controller unit test', function() {
    var scope, location, mailConfigMock, ctrl, authStub, dialogStub;

    beforeEach(function() {
        // remember original module to restore later, then replace it
        authStub = sinon.createStubInstance(Auth);
        dialogStub = sinon.createStubInstance(Dialog);

        angular.module('addaccounttest', ['woServices']);
        angular.mock.module('addaccounttest');
        angular.mock.inject(function($controller, $rootScope, $location, mailConfig) {
            location = $location;
            mailConfigMock = mailConfig;
            scope = $rootScope.$new();
            scope.state = {};
            scope.form = {};

            sinon.stub(location, 'path').returns(location);
            sinon.stub(location, 'search').returns(location);
            sinon.stub(scope, '$apply', function() {});

            ctrl = $controller(AddAccountCtrl, {
                $location: location,
                $scope: scope,
                $routeParams: {},
                mailConfig: mailConfigMock,
                auth: authStub,
                dialog: dialogStub
            });
        });
    });

    afterEach(function() {
        location.path.restore();
        location.search.restore();
        if (scope.$apply.restore) {
            scope.$apply.restore();
        }
    });

    describe('getAccountSettings', function() {
        var url, oauthPossibleStub, setCredentialsStub, mailConfigStub, mailConfig;

        beforeEach(inject(function($q) {
            scope.form.$invalid = false;
            scope.emailAddress = 'test@example.com';
            url = cfg.settingsUrl + 'example.com';
            mailConfig = {
                imap: {
                    hostname: 'imap.example.com',
                    source: 'guess'
                }
            };
            var deferred = $q.defer();
            mailConfigStub = sinon.stub(mailConfigMock, 'get');
            mailConfigStub.returns(deferred.promise);
            deferred.resolve(mailConfig);

            oauthPossibleStub = sinon.stub(scope, 'oauthPossible');
            setCredentialsStub = sinon.stub(scope, 'setCredentials');
        }));

        afterEach(function() {
            mailConfigStub.restore();
            oauthPossibleStub.restore();
            setCredentialsStub.restore();
        });

        it('should work for gmail', inject(function($rootScope) {
            authStub.useOAuth.returns(true);

            scope.getAccountSettings();
            $rootScope.$apply();

            expect(oauthPossibleStub.calledOnce).to.be.true;
        }));

        it('should work for other domain', inject(function($rootScope) {
            authStub.useOAuth.returns(false);

            scope.getAccountSettings();
            $rootScope.$apply();

            expect(setCredentialsStub.calledOnce).to.be.true;
        }));

        it('should fail for mailConfig error', inject(function($q, $rootScope) {
            authStub.useOAuth.returns(false);

            var deferred = $q.defer();
            mailConfigStub.returns(deferred.promise);
            deferred.reject(new Error());

            scope.getAccountSettings();
            $rootScope.$apply();

            expect(scope.errMsg).to.exist;
        }));
    });

    describe('oauthPossible', function() {
        var setCredentialsStub;

        beforeEach(function() {
            setCredentialsStub = sinon.stub(scope, 'setCredentials');
        });

        afterEach(function() {
            setCredentialsStub.restore();
        });

        it('should use oauth', function(done) {
            dialogStub.confirm = function(options) {
                options.callback(true).then(function() {
                    expect(setCredentialsStub.calledOnce).to.be.true;
                    expect(authStub.getOAuthToken.calledOnce).to.be.true;
                    done();
                });
            };
            authStub.getOAuthToken.returns(resolves());

            scope.oauthPossible();
        });

        it('should not use oauth', function() {
            dialogStub.confirm = function(options) {
                options.callback(false);
            };

            scope.oauthPossible();

            expect(setCredentialsStub.calledOnce).to.be.true;
            expect(authStub.getOAuthToken.called).to.be.false;
        });

        it('should not forward to login when oauth fails', function(done) {
            dialogStub.error = function(err) {
                expect(err).to.exist;
                expect(setCredentialsStub.called).to.be.false;
                done();
            };

            dialogStub.confirm = function(options) {
                options.callback(true);
            };
            authStub.getOAuthToken.returns(rejects(new Error()));

            scope.oauthPossible();
        });
    });

    describe('setCredentials', function() {
        it('should work', inject(function($timeout) {
            scope.setCredentials().then();
            $timeout.flush();

            expect(location.path.calledWith('/login-set-credentials')).to.be.true;
        }));
    });

});