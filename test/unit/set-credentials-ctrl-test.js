define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        SetCredentialsCtrl = require('js/controller/set-credentials'),
        appController = require('js/app-controller');

    describe('Set Credentials Controller unit test', function() {
        var scope, location, setCredentialsCtrl;
        var origAuth;

        beforeEach(function() {
            origAuth = appController._auth;
            appController._auth = {};

            angular.module('setcredentialstest', []);
            mocks.module('setcredentialstest');
            mocks.inject(function($rootScope, $controller, $location) {
                scope = $rootScope.$new();
                location = $location;
                scope.state = {};
                setCredentialsCtrl = $controller(SetCredentialsCtrl, {
                    $scope: scope
                });
            });
        });

        afterEach(function() {
            appController._auth = origAuth;
        });

        describe('set credentials', function() {
            it('should work', function(done) {
                appController._auth.setCredentials = function(args) {
                    expect(args.emailAddress).to.equal('emailemailemailemail');
                    expect(args.password).to.equal('passwdpasswdpasswdpasswd');
                    expect(args.provider).to.equal('providerproviderprovider');
                    
                    done();
                };

                location.search({
                    provider: 'providerproviderprovider'
                });
                scope.emailAddress = 'emailemailemailemail';
                scope.password = 'passwdpasswdpasswdpasswd';

                scope.login();

            });
        });
    });
});