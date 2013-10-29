define(function(require) {
    'use strict';

    var RestDAO = require('js/dao/rest-dao'),
        $ = require('jquery'),
        expect = chai.expect;

    describe('Rest DAO unit tests', function() {

        var restDao;

        beforeEach(function() {
            sinon.stub($, 'ajax').yieldsTo('success', {
                foo: 'bar'
            });
            restDao = new RestDAO();
        });

        afterEach(function() {
            $.ajax.restore();
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
            it('should fail', function(done) {
                $.ajax.restore();
                sinon.stub($, 'ajax').yieldsTo('error', {
                    status: 500
                }, {
                    statusText: 'Internal error'
                }, {});

                restDao.get('/asdf', function(err, data) {
                    expect(err).to.exist;
                    expect(err.code).to.equal(500);
                    expect(data).to.not.exist;
                    done();
                });
            });

            it('should work', function(done) {
                restDao.get('/asdf', function(err, data) {
                    expect(err).to.not.exist;
                    expect(data.foo).to.equal('bar');
                    done();
                });
            });
        });

        describe('put', function() {
            it('should fail', function(done) {
                $.ajax.restore();
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
                restDao.put('/asdf', {}, function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

        describe('remove', function() {
            it('should fail', function(done) {
                $.ajax.restore();
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
                restDao.remove('/asdf', function(err) {
                    expect(err).to.not.exist;
                    done();
                });
            });
        });

    });

});