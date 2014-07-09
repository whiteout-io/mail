define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        AddAccountCtrl = require('js/controller/add-account'),
        Auth = require('js/bo/auth'),
        appController = require('js/app-controller');

    describe('Add Account Controller unit test', function() {
        var scope, location, ctrl, authStub;

        describe('connectToGoogle', function() {
            var origAuth;
            beforeEach(function() {
                // remember original module to restore later, then replace it
                appController._auth;
                appController._auth = authStub = sinon.createStubInstance(Auth);
            });

            afterEach(function() {
                // restore the app controller module
                location && location.path && location.path.restore && location.path.restore();
                appController._auth = origAuth;
            });

            it('should fail on fetchOAuthToken error', function(done) {
                angular.module('addaccounttest', []);
                mocks.module('addaccounttest');
                mocks.inject(function($controller, $rootScope) {
                    scope = $rootScope.$new();
                    scope.state = {};
                    ctrl = $controller(AddAccountCtrl, {
                        $location: location,
                        $scope: scope
                    });
                });

                scope.onError = function(err) {
                    expect(err).to.equal(42);
                    expect(authStub.setCredentials.calledOnce).to.be.true;
                    done();
                };
                authStub.setCredentials.yields(42);

                scope.connectToGoogle();
            });

            it('should forward to login', function(done) {
                angular.module('addaccounttest', []);
                mocks.module('addaccounttest');
                mocks.inject(function($controller, $rootScope, $location) {
                    location = $location;
                    scope = $rootScope.$new();
                    scope.state = {};

                    sinon.stub(location, 'path', function(path) {
                        expect(path).to.equal('/login');
                        expect(authStub.setCredentials.calledOnce).to.be.true;

                        location.path.restore();
                        scope.$apply.restore();
                        done();
                    });

                    sinon.stub(scope, '$apply', function() {});

                    ctrl = $controller(AddAccountCtrl, {
                        $location: location,
                        $scope: scope
                    });
                });

                authStub.setCredentials.yields();

                scope.connectToGoogle();
            });
        });
    });
});