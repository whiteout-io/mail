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

    beforeEach(function(done) {
        lawnchairDao = new LawnchairDAO();
        lawnchairDao.init(dbName).then(function() {
            expect(lawnchairDao._db).to.exist;
            done();
        });
    });

    afterEach(function(done) {
        lawnchairDao.clear().then(done);
    });

    describe('read', function() {
        it('should fail', function(done) {
            lawnchairDao.read(undefined).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });
    });

    describe('list', function() {
        it('should fail', function(done) {
            lawnchairDao.list(undefined).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });
    });

    describe('remove list', function() {
        it('should fail', function(done) {
            lawnchairDao.removeList(undefined).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });
    });

    describe('persist/read/remove', function() {
        it('should fail', function(done) {
            lawnchairDao.persist(undefined, data).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });
        it('should fail', function(done) {
            lawnchairDao.persist('1234', undefined).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            lawnchairDao.persist(key, data).then(function() {
                return lawnchairDao.read(key);
            }).then(function(fetched) {
                expect(fetched).to.deep.equal(data);
                return lawnchairDao.remove(key);
            }).then(function() {
                return lawnchairDao.read(key);
            }).then(function(fetched) {
                expect(fetched).to.not.exist;
                done();
            });
        });
    });

    describe('batch/list/removeList', function() {
        it('should fails', function(done) {
            lawnchairDao.batch({}).catch(function(err) {
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

            lawnchairDao.batch(list).then(function() {
                return lawnchairDao.list('type');
            }).then(function(fetched) {
                expect(fetched.length).to.equal(2);
                expect(fetched[0]).to.deep.equal(list[0].object);
                return lawnchairDao.removeList('type');
            }).then(function() {
                return lawnchairDao.list('type');
            }).then(function(fetched) {
                expect(fetched).to.exist;
                expect(fetched.length).to.equal(0);
                done();
            });
        });
    });

});