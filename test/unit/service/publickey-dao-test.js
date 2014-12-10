'use strict';

var RestDAO = require('../../../src/js/service/rest'),
    PublicKeyDAO = require('../../../src/js/service/publickey');

describe('Public Key DAO unit tests', function() {

    var pubkeyDao, restDaoStub;

    beforeEach(function() {
        restDaoStub = sinon.createStubInstance(RestDAO);
        pubkeyDao = new PublicKeyDAO(restDaoStub);
    });

    afterEach(function() {});

    describe('get', function() {
        it('should fail', function(done) {
            restDaoStub.get.returns(rejects(42));

            pubkeyDao.get('id').catch(function(err) {
                expect(err).to.exist;
                expect(restDaoStub.get.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            restDaoStub.get.returns(resolves({
                _id: '12345',
                publicKey: 'asdf'
            }));

            pubkeyDao.get('id').then(function(key) {
                expect(key._id).to.exist;
                expect(key.publicKey).to.exist;
                expect(restDaoStub.get.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('verify', function() {
        it('should fail', function(done) {
            restDaoStub.get.returns(rejects(42));

            pubkeyDao.verify('id').catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should not error for 400', function(done) {
            restDaoStub.get.returns(rejects({
                code: 400
            }));

            pubkeyDao.verify('id').then(done);
        });

        it('should work', function(done) {
            var uuid = 'c621e328-8548-40a1-8309-adf1955e98a9';
            restDaoStub.get.returns(resolves());

            pubkeyDao.verify(uuid).then(function() {
                expect(restDaoStub.get.calledWith(sinon.match(function(arg) {
                    return arg.uri === '/verify/' + uuid && arg.type === 'text';
                }))).to.be.true;
                done();
            });
        });
    });

    describe('get by userId', function() {
        it('should fail', function(done) {
            restDaoStub.get.returns(rejects(42));

            pubkeyDao.getByUserId('userId').catch(function(err) {
                expect(err).to.exist;
                expect(restDaoStub.get.calledOnce).to.be.true;
                done();
            });
        });

        it('should react to 404', function(done) {
            restDaoStub.get.returns(resolves({
                code: 404
            }));

            pubkeyDao.getByUserId('userId').then(function(key) {
                expect(key).to.not.exist;
                expect(restDaoStub.get.calledOnce).to.be.true;
                done();
            });
        });

        it('should return empty array', function(done) {
            restDaoStub.get.returns(resolves([]));

            pubkeyDao.getByUserId('userId').then(function(key) {
                expect(key).to.not.exist;
                expect(restDaoStub.get.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            restDaoStub.get.returns(resolves([{
                _id: '12345',
                publicKey: 'asdf'
            }]));

            pubkeyDao.getByUserId('userId').then(function(key) {
                expect(key._id).to.exist;
                expect(key.publicKey).to.exist;
                expect(restDaoStub.get.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('put', function() {
        it('should fail', function(done) {
            restDaoStub.put.returns(resolves());

            pubkeyDao.put({
                _id: '12345',
                publicKey: 'asdf'
            }).then(function() {
                expect(restDaoStub.put.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('remove', function() {
        it('should fail', function(done) {
            restDaoStub.remove.returns(resolves());

            pubkeyDao.remove('12345').then(function(err) {
                expect(restDaoStub.remove.calledOnce).to.be.true;
                done();
            });
        });
    });

});