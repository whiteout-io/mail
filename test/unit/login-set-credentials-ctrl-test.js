'use strict';

var mocks = angular.mock,
    Auth = require('../../src/js/bo/auth'),
    ConnectionDoctor = require('../../src/js/util/connection-doctor'),
    SetCredentialsCtrl = require('../../src/js/controller/login-set-credentials'),
    appController = require('../../src/js/app-controller');

describe('Login (Set Credentials) Controller unit test', function() {
    // Angular parameters
    var scope, location, provider;

    // Stubs
    var auth, origAuth, doctor, origDoctor;

    // SUT
    var setCredentialsCtrl;

    beforeEach(function() {
        // remeber pre-test state to restore later
        origAuth = appController._auth;
        origDoctor = appController._doctor;
        auth = appController._auth = sinon.createStubInstance(Auth);
        doctor = appController._doctor = sinon.createStubInstance(ConnectionDoctor);

        // setup the controller
        angular.module('setcredentialstest', []);
        mocks.module('setcredentialstest');
        mocks.inject(function($rootScope, $controller, $location) {
            scope = $rootScope.$new();
            location = $location;
            location.search({
                provider: provider
            });
            scope.state = {
                login: {
                    mailConfig: {
                        imap: {},
                        smtp: {}
                    }
                }
            };

            setCredentialsCtrl = $controller(SetCredentialsCtrl, {
                $scope: scope,
                $routeParams: {}
            });
        });
    });

    afterEach(function() {
        // restore pre-test state
        appController._auth = origAuth;
        appController._doctor = origDoctor;
    });

    describe('set credentials', function() {
        it('should work', function() {
            scope.emailAddress = 'emailemailemailemail';
            scope.password = 'passwdpasswdpasswdpasswd';
            scope.smtpHost = 'hosthosthost';
            scope.smtpPort = 1337;
            scope.smtpEncryption = '1'; // STARTTLS
            scope.imapHost = 'hosthosthost';
            scope.imapPort = 1337;
            scope.imapEncryption = '2'; // TLS
            scope.realname = 'peter pan';

            var expectedCredentials = {
                emailAddress: scope.emailAddress,
                username: scope.username || scope.emailAddress,
                realname: scope.realname,
                password: scope.password,
                xoauth2: undefined,
                imap: {
                    host: scope.imapHost.toLowerCase(),
                    port: scope.imapPort,
                    secure: true,
                    ignoreTLS: false
                },
                smtp: {
                    host: scope.smtpHost.toLowerCase(),
                    port: scope.smtpPort,
                    secure: false,
                    ignoreTLS: false
                }
            };

            doctor.check.yields(); // synchronous yields!

            scope.test();

            expect(doctor.check.calledOnce).to.be.true;
            expect(doctor.configure.calledOnce).to.be.true;
            expect(doctor.configure.calledWith(expectedCredentials)).to.be.true;
            expect(auth.setCredentials.calledOnce).to.be.true;
        });
    });
});