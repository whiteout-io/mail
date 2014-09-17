define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        AddAccountCtrl = require('js/controller/add-account'),
        Auth = require('js/bo/auth'),
        appController = require('js/app-controller');

    describe('Add Account Controller unit test', function() {
        var scope, location, ctrl, authStub, origAuth;

        beforeEach(function() {
            // remember original module to restore later, then replace it
            origAuth = appController._auth;
            appController._auth = authStub = sinon.createStubInstance(Auth);

            angular.module('addaccounttest', []);
            mocks.module('addaccounttest');
            mocks.inject(function($controller, $rootScope, $location) {
                location = $location;
                scope = $rootScope.$new();
                scope.state = {};

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
            scope.$apply.restore();
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

        describe('connectToYahoo', function() {
            it('should forward to login', function() {
                scope.connectToYahoo();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'yahoo'
                })).to.be.true;
            });
        });

        describe('connectToTonline', function() {
            it('should forward to login', function() {
                scope.connectToTonline();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'tonline'
                })).to.be.true;
            });
        });

        describe('connectToOutlook', function() {
            it('should forward to login', function() {
                scope.connectToOutlook();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'outlook'
                })).to.be.true;
            });
        });

        describe('connectToGmx', function() {
            it('should forward to login', function() {
                scope.connectToGmx();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'gmx'
                })).to.be.true;
            });
        });

        describe('connectToWebde', function() {
            it('should forward to login', function() {
                scope.connectToWebde();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'webde'
                })).to.be.true;
            });
        });

        describe('connectOther', function() {
            it('should forward to login', function() {
                scope.connectOther();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'custom'
                })).to.be.true;
            });
        });
    });
});