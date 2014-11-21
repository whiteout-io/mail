'use strict';

describe('Newsletter Service unit test', function() {
    var newsletter;

    beforeEach(function() {
        angular.module('newsletter-test', ['woServices']);
        angular.mock.module('newsletter-test');
        angular.mock.inject(function($injector) {
            newsletter = $injector.get('newsletter');
        });
    });

    afterEach(function() {});

    describe('signup', function() {
        var xhrMock, requests;

        beforeEach(function() {
            xhrMock = sinon.useFakeXMLHttpRequest();
            requests = [];

            xhrMock.onCreate = function(xhr) {
                requests.push(xhr);
            };
        });

        afterEach(function() {
            xhrMock.restore();
        });

        it('should not signup if user has not agreed', inject(function($rootScope) {
            newsletter.signup('text@example.com', false).then(function(result) {
                expect(result).to.be.false;
            });

            $rootScope.$apply();
            expect(requests.length).to.equal(0);
        }));

        it('should not signup due to invalid email address', inject(function($rootScope) {
            newsletter.signup('textexample.com', true).catch(function(err) {
                expect(err.message).to.contain('Invalid');
            });

            $rootScope.$apply();
            expect(requests.length).to.equal(0);
        }));

        it('should fail', inject(function($rootScope) {
            newsletter.signup('text@example.com', true).catch(function(err) {
                expect(err).to.exist;
            });

            requests[0].onerror('err');
            $rootScope.$apply();
            expect(requests.length).to.equal(1);
        }));

        it('should work', inject(function($rootScope) {
            newsletter.signup('text@example.com', true).then(function(result) {
                expect(result).to.exist;
            });

            requests[0].respond(200, {
                "Content-Type": "text/plain"
            }, 'foobar!');
            $rootScope.$apply();
            expect(requests.length).to.equal(1);
        }));
    });

});