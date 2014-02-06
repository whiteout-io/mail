define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        AddAccountCtrl = require('js/controller/add-account'),
        appController = require('js/app-controller');

    describe('Add Account Controller unit test', function() {
        var scope, location, ctrl,
            fetchOAuthTokenStub;

        describe('connectToGoogle', function() {
            beforeEach(function() {
                // remember original module to restore later, then replace it
                fetchOAuthTokenStub = sinon.stub(appController, 'fetchOAuthToken');
            });

            afterEach(function() {
                // restore the app controller module
                location && location.path && location.path.restore && location.path.restore();
                fetchOAuthTokenStub.restore();
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
                    expect(fetchOAuthTokenStub.calledOnce).to.be.true;
                    done();
                };
                fetchOAuthTokenStub.yields(42);

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
                        expect(fetchOAuthTokenStub.calledOnce).to.be.true;

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

                fetchOAuthTokenStub.yields();

                scope.connectToGoogle();
            });
        });
    });
});