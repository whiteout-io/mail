'use strict';

var RestDAO = require('../../../src/js/service/rest'),
    InvitationDAO = require('../../../src/js/service/invitation');

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
        });
    });

    describe('invite', function() {
        it('should invite the recipient', function(done) {
            restDaoStub.put.returns(resolves());

            invitationDao.invite({
                recipient: alice,
                sender: bob
            }).then(function() {
                expect(restDaoStub.put.calledWith({}, expectedUri)).to.be.true;
                done();
            });
        });

        it('should not work for http error', function(done) {
            restDaoStub.put.returns(rejects(new Error()));

            invitationDao.invite({
                recipient: alice,
                sender: bob
            }).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should report erroneous usage', function(done) {
            invitationDao.invite({
                sender: bob
            }, expectError);

            invitationDao.invite('asd').catch(expectError);

            function expectError(err) {
                expect(err).to.exist;
                done();
            }
        });

        it('should report erroneous usage', function(done) {
            invitationDao.invite({
                recipient: alice,
            }, expectError);

            invitationDao.invite('asd').catch(expectError);

            function expectError(err) {
                expect(err).to.exist;
                done();
            }
        });

        it('should report erroneous usage', function(done) {
            invitationDao.invite({
                recipient: 123,
                sender: 123
            }, expectError);

            invitationDao.invite('asd').catch(expectError);

            function expectError(err) {
                expect(err).to.exist;
                done();
            }
        });
    });
});