define(function(require) {
    'use strict';

    var RestDAO = require('js/dao/rest-dao'),
        $ = require('jquery'),
        expect = chai.expect;

    describe('Rest DAO unit tests', function() {

        var restDao;

        beforeEach(function() {
            restDao = new RestDAO();
        });

        afterEach(function() {
            if (typeof $.ajax.callCount !== 'undefined') {
                $.ajax.restore();
            }
        });

        describe('contructor', function() {
            it('should set default base uri', function() {
                restDao = new RestDAO();
                expect(restDao).to.exist;
                expect(restDao._baseUri).to.exist;
            });

            it('should accept default base uri', function() {
                var baseUri = 'http://custom.com';

                restDao = new RestDAO({
                    baseUri: baseUri
                });
                expect(restDao).to.exist;
                expect(restDao._baseUri).to.equal(baseUri);
            });
        });

        describe('get', function() {
            it('should work with json as default type', function(done) {
                var spy = sinon.stub($, 'ajax').yieldsTo('success', {
                    foo: 'bar'
                }, 'success', {
                    status: 200
                });

                restDao.get({
                    uri: '/asdf',
                    type: 'json'
                }, function(err, data, status) {
                    expect(err).to.not.exist;
                    expect(data.foo).to.equal('bar');
                    expect(spy.calledWith(sinon.match(function(request) {
                        return request.headers.Accept === 'application/json' && request.dataType === 'json';
                    }))).to.be.true;
                    expect(status).to.equal(200);
                    done();
                });
            });

            it('should work with json', function(done) {
                var spy = sinon.stub($, 'ajax').yieldsTo('success', {
                    foo: 'bar'
                }, 'success', {
                    status: 200
                });

                restDao.get({
                    uri: '/asdf',
                    type: 'json'
                }, function(err, data, status) {
                    expect(err).to.not.exist;
                    expect(data.foo).to.equal('bar');
                    expect(spy.calledWith(sinon.match(function(request) {
                        return request.headers.Accept === 'application/json' && request.dataType === 'json';
                    }))).to.be.true;
                    expect(status).to.equal(200);
                    done();
                });
            });

            it('should work with plain text', function(done) {
                var spy = sinon.stub($, 'ajax').yieldsTo('success', 'foobar!', 'success', {
                    status: 200
                });

                restDao.get({
                    uri: '/asdf',
                    type: 'text'
                }, function(err, data, status) {
                    expect(err).to.not.exist;
                    expect(data).to.equal('foobar!');
                    expect(spy.calledWith(sinon.match(function(request) {
                        return request.headers.Accept === 'text/plain' && request.dataType === 'text';
                    }))).to.be.true;
                    expect(status).to.equal(200);
                    done();
                });
            });

            it('should work with xml', function(done) {
                var spy = sinon.stub($, 'ajax').yieldsTo('success', '<foo>bar</foo>', 'success', {
                    status: 200
                });

                restDao.get({
                    uri: '/asdf',
                    type: 'xml'
                }, function(err, data, status) {
                    expect(err).to.not.exist;
                    expect(data).to.equal('<foo>bar</foo>'); // that's probably not right, but in the unit test, it is :)
                    expect(spy.calledWith(sinon.match(function(request) {
                        return request.headers.Accept === 'application/xml' && request.dataType === 'xml';
                    }))).to.be.true;
                    expect(status).to.equal(200);
                    done();
                });
            });

            it('should fail for missing uri parameter', function(done) {
                restDao.get({}, function(err, data) {
                    expect(err).to.exist;
                    expect(err.code).to.equal(400);
                    expect(data).to.not.exist;
                    done();
                });
            });

            it('should fail for unhandled data type', function(done) {
                restDao.get({
                    uri: '/asdf',
                    type: 'snafu'
                }, function(err, data) {
                    expect(err).to.exist;
                    expect(err.code).to.equal(400);
                    expect(data).to.not.exist;
                    done();
                });
            });

            it('should fail for server error', function(done) {
                sinon.stub($, 'ajax').yieldsTo('error', {
                    status: 500
                }, {
                    statusText: 'Internal error'
                }, {});

                restDao.get({
                    uri: '/asdf'
                }, function(err, data) {
                    expect(err).to.exist;
                    expect(err.code).to.equal(500);
                    expect(data).to.not.exist;
                    done();
                });
            });
        });

        describe('put', function() {
            it('should fail', function(done) {
                sinon.stub($, 'ajax').yieldsTo('error', {
                    status: 500
                }, {
                    statusText: 'Internal error'
                }, {});

                restDao.put('/asdf', {}, function(err) {
                    expect(err).to.exist;
                    expect(err.code).to.equal(500);
                    done();
                });
            });

            it('should work', function(done) {
                var spy = sinon.stub($, 'ajax').yieldsTo('success', undefined, 'success', {
                    status: 201
                });

                restDao.put('/asdf', {}, function(err, res, status) {
                    expect(err).to.not.exist;
                    expect(res).to.not.exist;
                    expect(spy.callCount).to.equal(1);
                    expect(status).to.equal(201);
                    done();
                });
            });
        });

        describe('remove', function() {
            it('should fail', function(done) {
                sinon.stub($, 'ajax').yieldsTo('error', {
                    status: 500
                }, {
                    statusText: 'Internal error'
                }, {});

                restDao.remove('/asdf', function(err) {
                    expect(err).to.exist;
                    expect(err.code).to.equal(500);
                    done();
                });
            });

            it('should work', function(done) {
                var spy = sinon.stub($, 'ajax').yieldsTo('success', undefined, 'success', {
                    status: 204
                });
                restDao.remove('/asdf', function(err, res, status) {
                    expect(err).to.not.exist;
                    expect(res).to.not.exist;
                    expect(spy.callCount).to.equal(1);
                    expect(status).to.equal(204);
                    done();
                });
            });
        });

    });

});