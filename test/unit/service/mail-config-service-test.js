'use strict';

var cfg = require('../../../src/js/app-config').config;

describe('Mail Config Service unit test', function() {
    var mailConfig, httpBackend;

    beforeEach(function() {
        angular.module('mail-config-test', ['woServices']);
        angular.mock.module('mail-config-test');
        angular.mock.inject(function($injector, $httpBackend) {
            httpBackend = $httpBackend;
            mailConfig = $injector.get('mailConfig');
        });
    });

    afterEach(function() {
        httpBackend.verifyNoOutstandingExpectation();
        httpBackend.verifyNoOutstandingRequest();
    });

    describe('get', function() {
        var url = cfg.settingsUrl + 'example.com',
            exampleCfg = {
                imap: {}
            };

        it('should work', function() {
            httpBackend.expectGET(url).respond(exampleCfg);

            mailConfig.get('text@example.com').then(function(config) {
                expect(config.imap).to.exist;
            });
            httpBackend.flush();
        });

        it('should fail for invalid email address', inject(function($rootScope) {
            mailConfig.get('textexample.com').catch(function(err) {
                expect(err.message).to.contain('Invalid');
            });
            $rootScope.$apply();
        }));

        it('should fail with http 500', function() {
            httpBackend.expectGET(url).respond(500, '');

            mailConfig.get('text@example.com').catch(function(err) {
                expect(err).to.exist;
            });
            httpBackend.flush();
        });
    });

});