define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        ImapClient = require('imap-client'),
        SmtpClient = require('smtpclient'),
        SetCredentialsCtrl = require('js/controller/login-set-credentials'),
        appController = require('js/app-controller');

    describe('Login (Set Credentials) Controller unit test', function() {
        var scope, location, setCredentialsCtrl;
        var imap, smtp;
        var origAuth;
        var provider = 'providerproviderprovider';

        beforeEach(function() {
            origAuth = appController._auth;
            appController._auth = {};

            imap = sinon.createStubInstance(ImapClient);
            smtp = sinon.createStubInstance(SmtpClient);

            angular.module('setcredentialstest', []);
            mocks.module('setcredentialstest');
            mocks.inject(function($rootScope, $controller, $location) {
                scope = $rootScope.$new();
                location = $location;
                location.search({
                    provider: provider
                });

                scope.state = {};
                setCredentialsCtrl = $controller(SetCredentialsCtrl, {
                    $scope: scope,
                    $routeParams: {}
                });
            });
        });

        afterEach(function() {
            appController._auth = origAuth;
        });

        describe('set credentials', function() {
            it('should work', function(done) {
                var imapCert = 'imapcertimapcertimapcertimapcertimapcertimapcert',
                    smtpCert = 'smtpcertsmtpcertsmtpcertsmtpcertsmtpcertsmtpcert';

                scope.emailAddress = 'emailemailemailemail';
                scope.password = 'passwdpasswdpasswdpasswd';
                scope.smtpHost = 'hosthosthost';
                scope.smtpPort = 1337;
                scope.smtpEncryption = '1'; // STARTTLS
                scope.imapHost = 'hosthosthost';
                scope.imapPort = 1337;
                scope.imapEncryption = '2'; // TLS
                scope.realname = 'peter pan';

                imap.login.yields();

                appController._auth.setCredentials = function(args) {
                    expect(smtp.connect.calledOnce).to.be.true;
                    expect(imap.login.calledOnce).to.be.true;

                    expect(args).to.deep.equal({
                        provider: provider,
                        emailAddress: scope.emailAddress,
                        username: scope.username || scope.emailAddress,
                        realname: scope.realname,
                        password: scope.password,
                        imap: {
                            host: scope.imapHost.toLowerCase(),
                            port: scope.imapPort,
                            secure: true,
                            ignoreTLS: false,
                            ca: scope.imapCert,
                            pinned: false
                        },
                        smtp: {
                            host: scope.smtpHost.toLowerCase(),
                            port: scope.smtpPort,
                            secure: false,
                            ignoreTLS: false,
                            ca: scope.smtpCert,
                            pinned: false
                        }
                    });
                    done();
                };

                scope.test(imap, smtp);

                imap.onCert(imapCert);
                smtp.oncert(smtpCert);

                smtp.onidle();
            });
        });
    });
});