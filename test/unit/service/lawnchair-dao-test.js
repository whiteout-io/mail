'use strict';

var LawnchairDAO = require('../../../src/js/service/lawnchair');


var dbName = 'lawnchair@test.com';

var key = 'type_1';
var data = {
    name: 'testName1',
    type: 'testType1'
};

var key2 = 'type_2';
var data2 = {
    name: 'testName2',
    type: 'testType2'
};

describe('Lawnchair DAO unit tests', function() {
    var lawnchairDao;

    beforeEach(function() {
        lawnchairDao = new LawnchairDAO();
        lawnchairDao.init(dbName);
        expect(lawnchairDao._db).to.exist;
    });

    afterEach(function(done) {
        lawnchairDao.clear(function(err) {
            expect(err).to.not.exist;
            done();
        });
    });

    describe('read', function() {
        it('should fail', function(done) {
            lawnchairDao.read(undefined, function(err) {
                expect(err).to.exist;
                done();
            });
        });
    });

    describe('list', function() {
        it('should fail', function(done) {
            lawnchairDao.list(undefined, 0, null, function(err) {
                expect(err).to.exist;
                done();
            });
        });
    });

    describe('remove list', function() {
        it('should fail', function(done) {
            lawnchairDao.removeList(undefined, function(err) {
                expect(err).to.exist;
                done();
            });
        });
    });

    describe('persist/read/remove', function() {
        it('should fail', function(done) {
            lawnchairDao.persist(undefined, data, function(err) {
                expect(err).to.exist;
                done();
            });
        });
        it('should fail', function(done) {
            lawnchairDao.persist('1234', undefined, function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            lawnchairDao.persist(key, data, function(err) {
                expect(err).to.not.exist;
                lawnchairDao.read(key, onRead);
            });

            function onRead(err, fetched) {
                expect(err).to.not.exist;
                expect(fetched).to.deep.equal(data);
                lawnchairDao.remove(key, onRemove);
            }

            function onRemove(err) {
                expect(err).to.not.exist;
                lawnchairDao.read(key, onReadAgain);
            }

            function onReadAgain(err, fetched) {
                expect(err).to.not.exist;
                expect(fetched).to.not.exist;
                done();
            }
        });
    });

    describe('batch/list/removeList', function() {
        it('should fails', function(done) {
            lawnchairDao.batch({}, function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            var list = [{
                key: key,
                object: data
            }, {
                key: key2,
                object: data2
            }];

            lawnchairDao.batch(list, function(err) {
                expect(err).to.not.exist;
                lawnchairDao.list('type', 0, null, onList);
            });

            function onList(err, fetched) {
                expect(err).to.not.exist;
                expect(fetched.length).to.equal(2);
                expect(fetched[0]).to.deep.equal(list[0].object);
                lawnchairDao.removeList('type', onRemoveList);
            }

            function onRemoveList(err) {
                expect(err).to.not.exist;
                lawnchairDao.list('type', 0, null, onListAgain);
            }

            function onListAgain(err, fetched) {
                expect(err).to.not.exist;
                expect(fetched).to.exist;
                expect(fetched.length).to.equal(0);
                done();
            }
        });
    });

});