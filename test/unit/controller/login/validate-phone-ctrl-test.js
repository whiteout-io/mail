'use strict';

var ValidatePhoneCtrl = require('../../../../src/js/controller/login/validate-phone'),
    Auth = require('../../../../src/js/service/auth'),
    AdminDao = require('../../../../src/js/service/admin');

describe('Validate Phone Controller unit test', function() {
    var scope, location, mailConfigMock, ctrl, authStub, adminStub;

    beforeEach(function() {
        authStub = sinon.createStubInstance(Auth);
        adminStub = sinon.createStubInstance(AdminDao);

        angular.module('validatephonetest', ['woServices']);
        angular.mock.module('validatephonetest');
        angular.mock.inject(function($controller, $rootScope, $location, mailConfig) {
            location = $location;
            mailConfigMock = mailConfig;
            scope = $rootScope.$new();
            scope.state = {
                createAccount: {
                    emailAddress: 'test@wmail.io',
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
                $routeParams: {},
                $q: window.qMock,
                mailConfig: mailConfigMock,
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

    describe('validateUser', function() {
        it('should return early for invalid form', function() {
            scope.form.$invalid = true;
            scope.validateUser();
            expect(adminStub.validateUser.called).to.be.false;
        });

        it('should fail to error creating user', function(done) {
            scope.form.$invalid = false;
            scope.token = 'asfd';
            adminStub.validateUser.returns(rejects(new Error('asdf')));

            scope.validateUser().then(function() {
                expect(scope.busy).to.be.false;
                expect(scope.errMsg).to.equal('asdf');
                expect(adminStub.validateUser.calledOnce).to.be.true;
                done();
            });

            expect(scope.busy).to.be.true;
        });

        it('should work', function(done) {
            scope.form.$invalid = false;
            scope.token = 'asfd';
            adminStub.validateUser.returns(resolves());

            scope.login = function() {};

            scope.validateUser().then(function() {
                expect(scope.busy).to.be.true;
                expect(scope.errMsg).to.be.undefined;
                expect(adminStub.validateUser.calledOnce).to.be.true;
                done();
            });

            expect(scope.busy).to.be.true;
        });
    });

    describe('login', function() {
        it('should work', function(done) {
            scope.form.$invalid = false;
            authStub.setCredentials.returns();

            sinon.stub(mailConfigMock, 'get').returns(resolves({
                imap: {},
                smtp: {}
            }));

            scope.login().then(function() {
                expect(mailConfigMock.get.calledOnce).to.be.true;
                expect(authStub.setCredentials.calledOnce).to.be.true;
                expect(location.path.calledWith('/login')).to.be.true;
                done();
            });
        });
    });

});