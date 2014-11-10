'use strict';

var mocks = angular.mock,
    ValidatePhoneCtrl = require('../../src/js/controller/validate-phone'),
    Auth = require('../../src/js/bo/auth'),
    AdminDao = require('../../src/js/dao/admin-dao'),
    appController = require('../../src/js/app-controller');

describe('Validate Phone Controller unit test', function() {
    var scope, location, ctrl, authStub, origAuth, adminStub;

    beforeEach(function() {
        // remember original module to restore later, then replace it
        origAuth = appController._auth;
        appController._auth = authStub = sinon.createStubInstance(Auth);
        appController._adminDao = adminStub = sinon.createStubInstance(AdminDao);

        angular.module('validatephonetest', []);
        mocks.module('validatephonetest');
        mocks.inject(function($controller, $rootScope, $location) {
            location = $location;
            scope = $rootScope.$new();
            scope.state = {
                createAccount: {
                    emailAddress: 'test@example.com',
                    pass: 'asdf',
                    realname: 'Test User'
                }
            };
            scope.form = {};

            sinon.stub(location, 'path').returns(location);
            sinon.stub(location, 'search').returns(location);
            sinon.stub(scope, '$apply', function() {});

            ctrl = $controller(ValidatePhoneCtrl, {
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

    describe('validateUser', function() {
        it('should return early for invalid form', function() {
            scope.form.$invalid = true;
            scope.validateUser();
            expect(adminStub.validateUser.called).to.be.false;
        });

        it('should fail to error creating user', function(done) {
            scope.form.$invalid = false;
            scope.token = 'asfd';
            adminStub.validateUser.yieldsAsync(new Error('asdf'));

            scope.$apply = function() {
                expect(scope.busy).to.be.false;
                expect(scope.errMsg).to.equal('asdf');
                expect(adminStub.validateUser.calledOnce).to.be.true;
                done();
            };

            scope.validateUser();
            expect(scope.busy).to.be.true;
        });

        it('should work', function(done) {
            scope.form.$invalid = false;
            scope.token = 'asfd';
            adminStub.validateUser.yieldsAsync();

            scope.login = function() {
                expect(scope.busy).to.be.true;
                expect(scope.errMsg).to.be.undefined;
                expect(adminStub.validateUser.calledOnce).to.be.true;
                done();
            };

            scope.validateUser();
            expect(scope.busy).to.be.true;
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

});