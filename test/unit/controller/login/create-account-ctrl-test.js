'use strict';

var CreateAccountCtrl = require('../../../../src/js/controller/login/create-account'),
    AdminDao = require('../../../../src/js/service/admin'),
    Auth = require('../../../../src/js/service/auth');

describe('Create Account Controller unit test', function() {
    var scope, location, ctrl, authStub, adminStub;

    beforeEach(function() {
        // remember original module to restore later, then replace it
        adminStub = sinon.createStubInstance(AdminDao);
        authStub = sinon.createStubInstance(Auth);

        angular.module('createaccounttest', ['woServices', 'woAppConfig']);
        angular.mock.module('createaccounttest');
        angular.mock.inject(function($controller, $rootScope, $location) {
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
                $routeParams: {},
                auth: authStub,
                admin: adminStub
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