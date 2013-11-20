define(function(require) {
    'use strict';

    var RestDAO = require('js/dao/rest-dao'),
        InvitationDAO = require('js/dao/invitation-dao'),
        expect = chai.expect;

    describe('Invitation DAO unit tests', function() {
        var restDaoStub, invitationDao,
            alice = 'zuhause@aol.com',
            bob = 'manfred.mustermann@musterdomain.com',
            expectedUri = '/invitation/recipient/' + alice + '/sender/' + bob;

        beforeEach(function() {
            restDaoStub = sinon.createStubInstance(RestDAO);
            invitationDao = new InvitationDAO(restDaoStub);
        });

        describe('initialization', function() {
            it('should wire up correctly', function() {
                expect(invitationDao._restDao).to.equal(restDaoStub);
                expect(invitationDao.invite).to.exist;
                expect(InvitationDAO.INVITE_MISSING).to.equal(1);
                expect(InvitationDAO.INVITE_PENDING).to.equal(2);
                expect(InvitationDAO.INVITE_SUCCESS).to.equal(4);
            });
        });

        describe('invite', function() {
            it('should invite the recipient', function(done) {
                restDaoStub.put.yieldsAsync(null, undefined, 201);

                invitationDao.invite(alice, bob, function(err, status) {
                    expect(err).to.not.exist;
                    expect(status).to.equal(InvitationDAO.INVITE_SUCCESS);
                    expect(restDaoStub.put.calledWith(null, expectedUri)).to.be.true;
                    done();
                });
            });

            it('should point out already invited recipient', function(done) {
                restDaoStub.put.yieldsAsync(null, undefined, 304);

                invitationDao.invite(alice, bob, function(err, status) {
                    expect(err).to.not.exist;
                    expect(status).to.equal(InvitationDAO.INVITE_PENDING);
                    done();
                });
            });

            it('should not work for http error', function(done) {
                restDaoStub.put.yieldsAsync({
                    errMsg: 'jawollja.'
                });

                invitationDao.invite(alice, bob, function(err, status) {
                    expect(err).to.exist;
                    expect(status).to.not.exist;
                    done();
                });
            });

            it('should not work for unexpected response', function(done) {
                restDaoStub.put.yieldsAsync(null, undefined, 1337);

                invitationDao.invite(alice, bob, function(err, status) {
                    expect(err).to.exist;
                    expect(status).to.not.exist;
                    done();
                });
            });
        });

        describe('check', function() {
            it('should return pending invite', function(done) {
                restDaoStub.get.yieldsAsync(null, undefined, 200);

                invitationDao.check(alice, bob, function(err, status) {
                    expect(err).to.not.exist;
                    expect(status).to.equal(InvitationDAO.INVITE_PENDING);
                    expect(restDaoStub.get.calledWith(null, expectedUri)).to.be.true;
                    done();
                });
            });

            it('should return missing invite', function(done) {
                restDaoStub.get.yieldsAsync({
                    code: 404
                });

                invitationDao.check(alice, bob, function(err, status) {
                    expect(err).to.not.exist;
                    expect(status).to.equal(InvitationDAO.INVITE_MISSING);
                    done();
                });
            });

            it('should not work for http error', function(done) {
                restDaoStub.get.yieldsAsync({
                    code: 1337,
                    errMsg: 'jawollja.'
                });

                invitationDao.check(alice, bob, function(err, status) {
                    expect(err).to.exist;
                    expect(status).to.not.exist;
                    done();
                });
            });

            it('should not work for unexpected response', function(done) {
                restDaoStub.get.yieldsAsync(null, undefined, 1337);

                invitationDao.check(alice, bob, function(err, status) {
                    expect(err).to.exist;
                    expect(status).to.not.exist;
                    done();
                });
            });
        });
    });
});