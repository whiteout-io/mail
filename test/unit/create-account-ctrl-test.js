'use strict';

var mocks = angular.mock,
    CreateAccountCtrl = require('../../src/js/controller/create-account'),
    AdminDao = require('../../src/js/dao/admin-dao'),
    appController = require('../../src/js/app-controller');

describe('Create Account Controller unit test', function() {
    var scope, location, ctrl, authStub, origAuth, adminStub;

    beforeEach(function() {
        // remember original module to restore later, then replace it
        origAuth = appController._auth;
        appController._auth = authStub = {};
        appController._adminDao = adminStub = sinon.createStubInstance(AdminDao);

        angular.module('createaccounttest', []);
        mocks.module('createaccounttest');
        mocks.inject(function($controller, $rootScope, $location) {
            location = $location;
            scope = $rootScope.$new();
            scope.state = {};
            scope.form = {};
            scope.formValidate = {};

            sinon.stub(location, 'path').returns(location);
            sinon.stub(location, 'search').returns(location);
            sinon.stub(scope, '$apply', function() {});

            ctrl = $controller(CreateAccountCtrl, {
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
            scope.phone = '12345';
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
            scope.phone = '12345';
            adminStub.createUser.yieldsAsync();

            scope.$apply = function() {
                expect(scope.busy).to.be.false;
                expect(scope.errMsg).to.be.undefined;
                expect(adminStub.createUser.calledOnce).to.be.true;
                done();
            };

            scope.createWhiteoutAccount();
            expect(scope.busy).to.be.true;
        });
    });

});