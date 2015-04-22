'use strict';

var Auth = require('../../../../src/js/service/auth'),
    ConnectionDoctor = require('../../../../src/js/util/connection-doctor'),
    SetCredentialsCtrl = require('../../../../src/js/controller/login/login-set-credentials');

describe('Login (Set Credentials) Controller unit test', function() {
    // Angular parameters
    var scope, location, provider;

    // Stubs
    var auth, doctor;

    // SUT
    var setCredentialsCtrl;

    beforeEach(function() {
        // remeber pre-test state to restore later
        auth = sinon.createStubInstance(Auth);
        doctor = sinon.createStubInstance(ConnectionDoctor);

        // setup the controller
        angular.module('setcredentialstest', []);
        angular.mock.module('setcredentialstest');
        angular.mock.inject(function($rootScope, $controller, $location) {
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
                $routeParams: {},
                $q: window.qMock,
                auth: auth,
                connectionDoctor: doctor
            });
        });
    });

    afterEach(function() {});

    describe('set credentials', function() {
        it('should work', function(done) {
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
                    ignoreTLS: false,
                    requireTLS: false
                },
                smtp: {
                    host: scope.smtpHost.toLowerCase(),
                    port: scope.smtpPort,
                    secure: false,
                    ignoreTLS: false,
                    requireTLS: true
                }
            };

            doctor.check.returns(resolves()); // synchronous yields!

            scope.test().then(function() {
                expect(doctor.check.calledOnce).to.be.true;
                expect(doctor.configure.calledOnce).to.be.true;
                expect(doctor.configure.calledWith(expectedCredentials)).to.be.true;
                expect(auth.setCredentials.calledOnce).to.be.true;
                done();
            });

        });
    });
});