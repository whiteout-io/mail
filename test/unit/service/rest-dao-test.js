'use strict';

var RestDAO = require('../../../src/js/service/rest');

describe('Rest DAO unit tests', function() {

    var restDao, xhrMock, requests;

    beforeEach(function() {
        restDao = new RestDAO(window.qMock);
        xhrMock = sinon.useFakeXMLHttpRequest();
        requests = [];

        xhrMock.onCreate = function(xhr) {
            requests.push(xhr);
        };
    });

    afterEach(function() {
        xhrMock.restore();
    });

    describe('setBaseUri', function() {
        it('should accept base uri', function() {
            var baseUri = 'http://custom.com';
            restDao = new RestDAO();
            expect(restDao._baseUri).to.not.exist;
            restDao.setBaseUri(baseUri);
            expect(restDao._baseUri).to.equal(baseUri);
        });
    });

    describe('get', function() {
        it('should work with json as default type', function(done) {
            restDao.get({
                uri: '/asdf'
            }).then(function(data) {
                expect(data.foo).to.equal('bar');
                var req = requests[0];
                expect(req.requestHeaders.Accept).to.equal('application/json');
                done();
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(200, {
                "Content-Type": "application/json"
            }, '{"foo": "bar"}');
        });

        it('should work with jsonz', function(done) {
            restDao.get({
                uri: '/asdf',
                type: 'json'
            }).then(function(data) {
                expect(data.foo).to.equal('bar');
                var req = requests[0];
                expect(req.requestHeaders.Accept).to.equal('application/json');
                done();
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(200, {
                "Content-Type": "application/json"
            }, '{"foo": "bar"}');
        });

        it('should work with plain text', function(done) {
            restDao.get({
                uri: '/asdf',
                type: 'text'
            }).then(function(data) {
                expect(data).to.equal('foobar!');
                var req = requests[0];
                expect(req.requestHeaders.Accept).to.equal('text/plain');
                done();
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(200, {
                "Content-Type": "text/plain"
            }, 'foobar!');
        });

        it('should work with xml', function(done) {
            restDao.get({
                uri: '/asdf',
                type: 'xml'
            }).then(function(data) {
                expect(data).to.equal('<foo>bar</foo>');
                var req = requests[0];
                expect(req.requestHeaders.Accept).to.equal('application/xml');
                done();
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(200, {
                "Content-Type": "application/xml"
            }, '<foo>bar</foo>');
        });

        it('should fail for missing uri parameter', function(done) {
            restDao.get({}).catch(function(err) {
                expect(err.code).to.equal(400);
                done();
            });
        });

        it('should fail for unhandled data type', function(done) {
            restDao.get({
                uri: '/asdf',
                type: 'snafu'
            }).catch(function(err) {
                expect(err.code).to.equal(400);
                done();
            });
        });

        it('should fail for server error', function(done) {
            restDao.get({
                uri: '/asdf'
            }).catch(function(err) {
                expect(err.code).to.equal(500);
                done();
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(500, {
                "Content-Type": "text/plain"
            }, 'Internal error');
        });
    });

    describe('post', function() {
        it('should fail', function(done) {
            restDao.post('/asdf', {}).catch(function(err) {
                expect(err.code).to.equal(500);
                done();
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(500, {
                "Content-Type": "text/plain"
            }, 'Internal error');
        });

        it('should work', function(done) {
            restDao.post('/asdf', {}).then(function(res) {
                expect(res).to.equal('');
                done();
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(201);
        });
    });

    describe('put', function() {
        it('should fail', function(done) {
            restDao.put('/asdf', {}).catch(function(err) {
                expect(err.code).to.equal(500);
                done();
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(500, {
                "Content-Type": "text/plain"
            }, 'Internal error');
        });

        it('should work', function(done) {
            restDao.put('/asdf', {}).then(function(res) {
                expect(res).to.equal('');
                done();
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(201);
        });
    });

    describe('remove', function() {
        it('should fail', function(done) {
            restDao.remove('/asdf').catch(function(err) {
                expect(err.code).to.equal(500);
                done();
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(500, {
                "Content-Type": "text/plain"
            }, 'Internal error');
        });

        it('should work', function(done) {
            restDao.remove('/asdf').then(function(res) {
                expect(res).to.equal('');
                done();
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(200);
        });
    });

});