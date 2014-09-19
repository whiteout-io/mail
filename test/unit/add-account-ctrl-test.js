define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        AddAccountCtrl = require('js/controller/add-account'),
        Auth = require('js/bo/auth'),
        AdminDao = require('js/dao/admin-dao'),
        appController = require('js/app-controller');

    describe('Add Account Controller unit test', function() {
        var scope, location, ctrl, authStub, origAuth, adminStub;

        beforeEach(function() {
            // remember original module to restore later, then replace it
            origAuth = appController._auth;
            appController._auth = authStub = sinon.createStubInstance(Auth);
            appController._adminDao = adminStub = sinon.createStubInstance(AdminDao);

            angular.module('addaccounttest', []);
            mocks.module('addaccounttest');
            mocks.inject(function($controller, $rootScope, $location) {
                location = $location;
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
        });

        describe('createWhiteoutAccount', function() {
            it('should return early for invalid form', function() {
                scope.form.$invalid = true;
                scope.createWhiteoutAccount();
                expect(adminStub.createUser.called).to.be.false;
            });

            it('should fail to error creating user', function(done) {
                scope.form.$invalid = false;
                scope.betaCode = 'asfd';
                adminStub.createUser.yieldsAsync(new Error('asdf'));

                scope.$apply = function() {
                    expect(scope.busy).to.be.false;
                    expect(scope.errMsg).to.equal('asdf');
                    expect(adminStub.createUser.calledOnce).to.be.true;
                    done();
                };

                scope.createWhiteoutAccount();
                expect(scope.busy).to.be.true;
            });

            it('should work', function(done) {
                scope.form.$invalid = false;
                scope.betaCode = 'asfd';
                adminStub.createUser.yieldsAsync();

                scope.$apply = function() {
                    expect(scope.busy).to.be.false;
                    expect(scope.errMsg).to.be.undefined;
                    expect(scope.step).to.equal(3);
                    expect(adminStub.createUser.calledOnce).to.be.true;
                    done();
                };

                scope.createWhiteoutAccount();
                expect(scope.busy).to.be.true;
            });
        });

        describe('validateUser', function() {
            it('should return early for invalid form', function() {
                scope.formValidate.$invalid = true;
                scope.validateUser();
                expect(adminStub.validateUser.called).to.be.false;
            });

            it('should fail to error creating user', function(done) {
                scope.formValidate.$invalid = false;
                scope.token = 'asfd';
                adminStub.validateUser.yieldsAsync(new Error('asdf'));

                scope.$apply = function() {
                    expect(scope.busyValidate).to.be.false;
                    expect(scope.errMsgValidate).to.equal('asdf');
                    expect(adminStub.validateUser.calledOnce).to.be.true;
                    done();
                };

                scope.validateUser();
                expect(scope.busyValidate).to.be.true;
            });

            it('should work', function(done) {
                scope.formValidate.$invalid = false;
                scope.token = 'asfd';
                adminStub.validateUser.yieldsAsync();

                scope.login = function() {
                    expect(scope.busyValidate).to.be.true;
                    expect(scope.errMsgValidate).to.be.undefined;
                    expect(adminStub.validateUser.calledOnce).to.be.true;
                    done();
                };

                scope.validateUser();
                expect(scope.busyValidate).to.be.true;
            });
        });

        describe('login', function() {
            it('should work', function() {
                scope.form.$invalid = false;
                authStub.setCredentials.returns();

                scope.login();
                expect(authStub.setCredentials.calledOnce).to.be.true;
                expect(location.path.calledWith('/login')).to.be.true;
            });
        });

        describe('connectToGoogle', function() {
            it('should forward to login', function() {
                authStub._oauth = {
                    isSupported: function() {
                        return true;
                    }
                };

                authStub.getOAuthToken.yields();

                scope.connectToGoogle();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'gmail'
                })).to.be.true;
                expect(authStub.getOAuthToken.calledOnce).to.be.true;
            });

            it('should not use oauth for gmail', function() {
                authStub._oauth = {
                    isSupported: function() {
                        return false;
                    }
                };

                scope.connectToGoogle();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'gmail'
                })).to.be.true;
                expect(authStub.getOAuthToken.called).to.be.false;
            });

            it('should not forward to login when oauth fails', function(done) {
                authStub._oauth = {
                    isSupported: function() {
                        return true;
                    }
                };

                authStub.getOAuthToken.yields(new Error());

                scope.onError = function(err) {
                    expect(err).to.exist;
                    expect(location.path.called).to.be.false;
                    expect(location.search.called).to.be.false;

                    done();
                };

                scope.connectToGoogle();
            });
        });

        describe('connectTo', function() {
            it('should forward to login', function() {
                var provider = 'wmail';
                scope.connectTo(provider);

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: provider
                })).to.be.true;
            });
        });

    });
});