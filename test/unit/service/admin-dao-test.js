'use strict';

var RestDAO = require('../../../src/js/service/rest'),
    AdminDAO = require('../../../src/js/service/admin'),
    appConfig = require('../../../src/js/app-config');

describe('Admin DAO unit tests', function() {

    var adminDao, restDaoStub,
        emailAddress = 'test@example.com',
        password = 'secret';

    beforeEach(function() {
        restDaoStub = sinon.createStubInstance(RestDAO);
        adminDao = new AdminDAO(restDaoStub, appConfig);
    });

    afterEach(function() {});

    describe('createUser', function() {
        it('should fail due to incomplete args', function(done) {
            var opt = {
                emailAddress: emailAddress
            };

            adminDao.createUser(opt, function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail if user already exists', function(done) {
            var opt = {
                emailAddress: emailAddress,
                password: password,
                phone: '12345'
            };

            restDaoStub.post.withArgs(opt, '/user').yields({
                code: 409
            });

            adminDao.createUser(opt, function(err) {
                expect(err.message).to.contain('already taken');
                expect(restDaoStub.post.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail due to unknown error', function(done) {
            var opt = {
                emailAddress: emailAddress,
                password: password,
                phone: '12345'
            };

            restDaoStub.post.withArgs(opt, '/user').yields(new Error());

            adminDao.createUser(opt, function(err) {
                expect(err).to.exist;
                expect(restDaoStub.post.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            var opt = {
                emailAddress: emailAddress,
                password: password,
                phone: '12345'
            };

            restDaoStub.post.withArgs(opt, '/user').yields();

            adminDao.createUser(opt, function(err) {
                expect(err).to.not.exist;
                expect(restDaoStub.post.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('validateUser', function() {
        it('should fail due to incomplete args', function(done) {
            var opt = {
                emailAddress: emailAddress
            };

            adminDao.validateUser(opt, function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail due to error in rest api', function(done) {
            var opt = {
                emailAddress: emailAddress,
                token: 'H45Z6D'
            };

            restDaoStub.post.withArgs(opt, '/user/validate').yields(new Error());

            adminDao.validateUser(opt, function(err) {
                expect(err).to.exist;
                expect(restDaoStub.post.calledOnce).to.be.true;
                done();
            });
        });

        it('should work with no error object', function(done) {
            var opt = {
                emailAddress: emailAddress,
                token: 'H45Z6D'
            };

            restDaoStub.post.withArgs(opt, '/user/validate').yields();

            adminDao.validateUser(opt, function(err) {
                expect(err).to.not.exist;
                expect(restDaoStub.post.calledOnce).to.be.true;
                done();
            });
        });

        it('should work with 202', function(done) {
            var opt = {
                emailAddress: emailAddress,
                token: 'H45Z6D'
            };

            restDaoStub.post.withArgs(opt, '/user/validate').yields({
                code: 202
            });

            adminDao.validateUser(opt, function(err) {
                expect(err).to.not.exist;
                expect(restDaoStub.post.calledOnce).to.be.true;
                done();
            });
        });
    });

});