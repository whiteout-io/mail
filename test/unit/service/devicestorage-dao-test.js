'use strict';

var LawnchairDAO = require('../../../src/js/service/lawnchair'),
    DeviceStorageDAO = require('../../../src/js/service/devicestorage');

var testUser = 'test@example.com';

describe('Device Storage DAO unit tests', function() {

    var storageDao, lawnchairDaoStub;

    beforeEach(function() {
        lawnchairDaoStub = sinon.createStubInstance(LawnchairDAO);
        storageDao = new DeviceStorageDAO(lawnchairDaoStub);
    });

    afterEach(function() {});

    describe('init', function() {
        it('should work', function() {
            storageDao.init(testUser);
            expect(lawnchairDaoStub.init.calledOnce).to.be.true;
        });
    });

    describe('store list', function() {
        it('should fail', function(done) {
            var list = [{}];

            storageDao.storeList(list, '', function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work with empty list', function(done) {
            var list = [];

            storageDao.storeList(list, 'email', function(err) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('should work', function(done) {
            lawnchairDaoStub.batch.yields();

            var list = [{
                foo: 'bar'
            }];

            storageDao.storeList(list, 'email', function(err) {
                expect(err).to.not.exist;
                expect(lawnchairDaoStub.batch.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('remove list', function() {
        it('should work', function(done) {
            lawnchairDaoStub.removeList.yields();

            storageDao.removeList('email', function(err) {
                expect(err).to.not.exist;
                expect(lawnchairDaoStub.removeList.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('list items', function() {
        it('should work', function(done) {
            lawnchairDaoStub.list.yields();

            storageDao.listItems('email', 0, null, function(err) {
                expect(err).to.not.exist;
                expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('clear', function() {
        it('should work', function(done) {
            lawnchairDaoStub.clear.yields();

            storageDao.clear(function(err) {
                expect(err).to.not.exist;
                expect(lawnchairDaoStub.clear.calledOnce).to.be.true;
                done();
            });
        });
    });

});