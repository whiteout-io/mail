'use strict';

var RestDAO = require('../../../src/js/service/rest'),
    PublicKeyDAO = require('../../../src/js/service/publickey'),
    appConfig = require('../../../src/js/app-config');

describe('Public Key DAO unit tests', function() {

    var pubkeyDao, restDaoStub;

    beforeEach(function() {
        restDaoStub = sinon.createStubInstance(RestDAO);
        pubkeyDao = new PublicKeyDAO(restDaoStub, appConfig);
    });

    afterEach(function() {});

    describe('get', function() {
        it('should fail', function(done) {
            restDaoStub.get.yields(42);

            pubkeyDao.get('id', function(err, key) {
                expect(err).to.exist;
                expect(key).to.not.exist;
                expect(restDaoStub.get.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            restDaoStub.get.yields(null, {
                _id: '12345',
                publicKey: 'asdf'
            });

            pubkeyDao.get('id', function(err, key) {
                expect(err).to.not.exist;
                expect(key).to.exist;
                expect(key._id).to.exist;
                expect(key.publicKey).to.exist;
                expect(restDaoStub.get.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('verify', function() {
        it('should fail', function(done) {
            restDaoStub.get.yields(42);

            pubkeyDao.verify('id', function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should not error for 400', function(done) {
            restDaoStub.get.yields({
                code: 400
            });

            pubkeyDao.verify('id', function(err) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('should work', function(done) {
            var uuid = 'c621e328-8548-40a1-8309-adf1955e98a9';
            restDaoStub.get.yields(null);

            pubkeyDao.verify(uuid, function(err) {
                expect(err).to.not.exist;
                expect(restDaoStub.get.calledWith(sinon.match(function(arg) {
                    return arg.uri === '/verify/' + uuid && arg.type === 'text';
                }))).to.be.true;
                done();
            });
        });
    });

    describe('get by userId', function() {
        it('should fail', function(done) {
            restDaoStub.get.yields(42);

            pubkeyDao.getByUserId('userId', function(err, key) {
                expect(err).to.exist;
                expect(key).to.not.exist;
                expect(restDaoStub.get.calledOnce).to.be.true;
                done();
            });
        });

        it('should react to 404', function(done) {
            restDaoStub.get.yields({
                code: 404
            });

            pubkeyDao.getByUserId('userId', function(err, key) {
                expect(err).to.not.exist;
                expect(key).to.not.exist;
                expect(restDaoStub.get.calledOnce).to.be.true;
                done();
            });
        });

        it('should return empty array', function(done) {
            restDaoStub.get.yields(null, []);

            pubkeyDao.getByUserId('userId', function(err, key) {
                expect(err).to.not.exist;
                expect(key).to.not.exist;
                expect(restDaoStub.get.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            restDaoStub.get.yields(null, [{
                _id: '12345',
                publicKey: 'asdf'
            }]);

            pubkeyDao.getByUserId('userId', function(err, key) {
                expect(err).to.not.exist;
                expect(key).to.exist;
                expect(key._id).to.exist;
                expect(key.publicKey).to.exist;
                expect(restDaoStub.get.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('put', function() {
        it('should fail', function(done) {
            restDaoStub.put.yields();

            pubkeyDao.put({
                _id: '12345',
                publicKey: 'asdf'
            }, function(err) {
                expect(err).to.not.exist;
                expect(restDaoStub.put.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('remove', function() {
        it('should fail', function(done) {
            restDaoStub.remove.yields();

            pubkeyDao.remove('12345', function(err) {
                expect(err).to.not.exist;
                expect(restDaoStub.remove.calledOnce).to.be.true;
                done();
            });
        });
    });

});