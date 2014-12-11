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

        it('should not signup if user has not agreed', function(done) {
            newsletter.signup('text@example.com', false).then(function(result) {
                expect(result).to.be.false;
                expect(requests.length).to.equal(0);
                done();
            });
        });

        it('should not signup due to invalid email address', function(done) {
            newsletter.signup('textexample.com', true).catch(function(err) {
                expect(err.message).to.contain('Invalid');
                expect(requests.length).to.equal(0);
                done();
            });
        });

        it('should fail', function(done) {
            newsletter.signup('text@example.com', true).catch(function(err) {
                expect(err).to.exist;
                expect(requests.length).to.equal(1);
                done();
            });

            requests[0].onerror('err');
        });

        it('should work', function(done) {
            newsletter.signup('text@example.com', true).then(function(result) {
                expect(result).to.exist;
                expect(requests.length).to.equal(1);
                done();
            });

            requests[0].respond(200, {
                "Content-Type": "text/plain"
            }, 'foobar!');
        });
    });

});