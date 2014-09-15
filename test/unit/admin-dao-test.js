define(function(require) {
    'use strict';

    var RestDAO = require('js/dao/rest-dao'),
        AdminDAO = require('js/dao/admin-dao'),
        expect = chai.expect;

    describe('Admin DAO unit tests', function() {

        var adminDao, restDaoStub,
            emailAddress = 'test@example.com',
            password = 'secret';

        beforeEach(function() {
            restDaoStub = sinon.createStubInstance(RestDAO);
            adminDao = new AdminDAO(restDaoStub);
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
                    password: password
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
                    password: password
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
                    password: password
                };

                restDaoStub.post.withArgs(opt, '/user').yields();

                adminDao.createUser(opt, function(err) {
                    expect(err).to.not.exist;
                    expect(restDaoStub.post.calledOnce).to.be.true;
                    done();
                });
            });
        });

    });

});