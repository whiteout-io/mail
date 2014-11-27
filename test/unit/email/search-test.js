'use strict';

describe('Search Service unit test', function() {
    var search;

    beforeEach(function() {
        angular.module('search-test', ['woEmail']);
        angular.mock.module('search-test');
        angular.mock.inject(function($injector) {
            search = $injector.get('search');
        });
    });

    afterEach(function() {});

    describe('filter', function() {
        var message1 = {
                to: [{
                    name: 'name1',
                    address: 'address1'
                }],
                subject: 'subject1',
                body: 'body1',
                html: 'html1'
            },
            message2 = {
                to: [{
                    name: 'name2',
                    address: 'address2'
                }],
                subject: 'subject2',
                body: 'body2',
                html: 'html2'
            },
            message3 = {
                to: [{
                    name: 'name3',
                    address: 'address3'
                }],
                subject: 'subject3',
                body: 'body1',
                html: 'html1',
                encrypted: true
            },
            message4 = {
                to: [{
                    name: 'name4',
                    address: 'address4'
                }],
                subject: 'subject4',
                body: 'body1',
                html: 'html1',
                encrypted: true,
                decrypted: true
            },
            testMessages = [message1, message2, message3, message4];

        it('return same messages array on empty query string', function() {
            var result = search.filter(testMessages, '');
            expect(result).to.equal(testMessages);
        });

        it('return message1 on matching subject', function() {
            var result = search.filter(testMessages, 'subject1');
            expect(result.length).to.equal(1);
            expect(result[0]).to.equal(message1);
        });

        it('return message1 on matching name', function() {
            var result = search.filter(testMessages, 'name1');
            expect(result.length).to.equal(1);
            expect(result[0]).to.equal(message1);
        });

        it('return message1 on matching address', function() {
            var result = search.filter(testMessages, 'address1');
            expect(result.length).to.equal(1);
            expect(result[0]).to.equal(message1);
        });

        it('return plaintext and decrypted messages on matching body', function() {
            var result = search.filter(testMessages, 'body1');
            expect(result.length).to.equal(2);
            expect(result[0]).to.equal(message1);
            expect(result[1]).to.equal(message4);
        });

        it('return plaintext and decrypted messages on matching html', function() {
            var result = search.filter(testMessages, 'html1');
            expect(result.length).to.equal(2);
            expect(result[0]).to.equal(message1);
            expect(result[1]).to.equal(message4);
        });
    });

});