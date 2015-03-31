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
        it('should work', function(done) {
            lawnchairDaoStub.init.returns(resolves());

            storageDao.init(testUser).then(function() {
                expect(lawnchairDaoStub.init.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail', function(done) {
            lawnchairDaoStub.init.returns(rejects(new Error()));

            storageDao.init(testUser).catch(function(err) {
                expect(err).to.exist;
                expect(lawnchairDaoStub.init.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('store list', function() {
        it('should fail', function(done) {
            var list = [{}];

            storageDao.storeList(list, '').catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work with empty list', function(done) {
            var list = [];

            storageDao.storeList(list, 'email').then(done);
        });

        it('should work', function(done) {
            lawnchairDaoStub.batch.returns(resolves());

            var list = [{
                foo: 'bar'
            }];

            storageDao.storeList(list, 'email').then(function() {
                expect(lawnchairDaoStub.batch.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('remove list', function() {
        it('should work', function(done) {
            lawnchairDaoStub.removeList.returns(resolves());

            storageDao.removeList('email').then(function() {
                expect(lawnchairDaoStub.removeList.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('list items', function() {
        it('should work', function(done) {
            lawnchairDaoStub.list.returns(resolves());

            storageDao.listItems('email').then(function() {
                expect(lawnchairDaoStub.list.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('clear', function() {
        it('should work', function(done) {
            lawnchairDaoStub.clear.returns(resolves());

            storageDao.clear().then(function() {
                expect(lawnchairDaoStub.clear.calledOnce).to.be.true;
                done();
            });
        });
    });

});