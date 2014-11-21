'use strict';

var RestDAO = require('../../src/js/dao/rest-dao');

describe('Rest DAO unit tests', function() {

    var restDao, xhrMock, requests;

    beforeEach(function() {
        restDao = new RestDAO();
        xhrMock = sinon.useFakeXMLHttpRequest();
        requests = [];

        xhrMock.onCreate = function(xhr) {
            requests.push(xhr);
        };
    });

    afterEach(function() {
        xhrMock.restore();
    });

    describe('contructor', function() {
        it('should set default base uri', function() {
            restDao = new RestDAO();
            expect(restDao).to.exist;
            expect(restDao._baseUri).to.exist;
        });

        it('should accept default base uri', function() {
            var baseUri = 'http://custom.com';

            restDao = new RestDAO(baseUri);
            expect(restDao).to.exist;
            expect(restDao._baseUri).to.equal(baseUri);
        });
    });

    describe('get', function() {
        it('should work with json as default type', function() {
            restDao.get({
                uri: '/asdf'
            }, function(err, data, status) {
                expect(err).to.not.exist;
                expect(data.foo).to.equal('bar');
                var req = requests[0];
                expect(req.requestHeaders.Accept).to.equal('application/json');
                expect(status).to.equal(200);
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(200, {
                "Content-Type": "application/json"
            }, '{"foo": "bar"}');
        });

        it('should work with jsonz', function() {
            restDao.get({
                uri: '/asdf',
                type: 'json'
            }, function(err, data, status) {
                expect(err).to.not.exist;
                expect(data.foo).to.equal('bar');
                var req = requests[0];
                expect(req.requestHeaders.Accept).to.equal('application/json');
                expect(status).to.equal(200);
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(200, {
                "Content-Type": "application/json"
            }, '{"foo": "bar"}');
        });

        it('should work with plain text', function() {
            restDao.get({
                uri: '/asdf',
                type: 'text'
            }, function(err, data, status) {
                expect(err).to.not.exist;
                expect(data).to.equal('foobar!');
                var req = requests[0];
                expect(req.requestHeaders.Accept).to.equal('text/plain');
                expect(status).to.equal(200);
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(200, {
                "Content-Type": "text/plain"
            }, 'foobar!');
        });

        it('should work with xml', function() {
            restDao.get({
                uri: '/asdf',
                type: 'xml'
            }, function(err, data, status) {
                expect(err).to.not.exist;
                expect(data).to.equal('<foo>bar</foo>');
                var req = requests[0];
                expect(req.requestHeaders.Accept).to.equal('application/xml');
                expect(status).to.equal(200);
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(200, {
                "Content-Type": "application/xml"
            }, '<foo>bar</foo>');
        });

        it('should fail for missing uri parameter', function() {
            restDao.get({}, function(err, data) {
                expect(err).to.exist;
                expect(err.code).to.equal(400);
                expect(data).to.not.exist;
            });
        });

        it('should fail for unhandled data type', function() {
            restDao.get({
                uri: '/asdf',
                type: 'snafu'
            }, function(err, data) {
                expect(err).to.exist;
                expect(err.code).to.equal(400);
                expect(data).to.not.exist;
            });
        });

        it('should fail for server error', function() {
            restDao.get({
                uri: '/asdf'
            }, function(err, data) {
                expect(err).to.exist;
                expect(err.code).to.equal(500);
                expect(data).to.not.exist;
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(500, {
                "Content-Type": "text/plain"
            }, 'Internal error');
        });
    });

    describe('post', function() {
        it('should fail', function() {
            restDao.post('/asdf', {}, function(err) {
                expect(err).to.exist;
                expect(err.code).to.equal(500);
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(500, {
                "Content-Type": "text/plain"
            }, 'Internal error');
        });

        it('should work', function() {
            restDao.post('/asdf', {}, function(err, res, status) {
                expect(err).to.not.exist;
                expect(res).to.equal('');
                expect(status).to.equal(201);
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(201);
        });
    });

    describe('put', function() {
        it('should fail', function() {
            restDao.put('/asdf', {}, function(err) {
                expect(err).to.exist;
                expect(err.code).to.equal(500);
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(500, {
                "Content-Type": "text/plain"
            }, 'Internal error');
        });

        it('should work', function() {
            restDao.put('/asdf', {}, function(err, res, status) {
                expect(err).to.not.exist;
                expect(res).to.equal('');
                expect(status).to.equal(201);
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(201);
        });
    });

    describe('remove', function() {
        it('should fail', function() {
            restDao.remove('/asdf', function(err) {
                expect(err).to.exist;
                expect(err.code).to.equal(500);
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(500, {
                "Content-Type": "text/plain"
            }, 'Internal error');
        });

        it('should work', function() {
            restDao.remove('/asdf', function(err, res, status) {
                expect(err).to.not.exist;
                expect(res).to.equal('');
                expect(status).to.equal(200);
            });

            expect(requests.length).to.equal(1);
            requests[0].respond(200);
        });
    });

});