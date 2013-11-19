define(function(require) {
    'use strict';

    var expect = chai.expect,
        OutboxBO = require('js/bo/outbox'),
        EmailDAO = require('js/dao/email-dao'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        InvitationDAO = require('js/dao/invitation-dao');

    describe('Outbox Business Object unit test', function() {
        var outbox, emailDaoStub, devicestorageStub, invitationDaoStub;

        beforeEach(function() {
            emailDaoStub = sinon.createStubInstance(EmailDAO);
            emailDaoStub._devicestorage = devicestorageStub = sinon.createStubInstance(DeviceStorageDAO);
            invitationDaoStub = sinon.createStubInstance(InvitationDAO);
            outbox = new OutboxBO(emailDaoStub, invitationDaoStub);
        });

        afterEach(function() {});

        describe('init', function() {
            it('should work', function() {
                expect(outbox).to.exist;
                expect(outbox._emailDao).to.equal(emailDaoStub);
                expect(outbox._invitationDao).to.equal(invitationDaoStub);
                expect(outbox._outboxBusy).to.be.false;
            });
        });

        describe('start/stop checking', function() {
            it('should work', function() {
                function onOutboxUpdate(err) {
                    expect(err).to.not.exist;
                }

                outbox.startChecking(onOutboxUpdate);
                expect(outbox._intervalId).to.exist;

                outbox.stopChecking();
                expect(outbox._intervalId).to.not.exist;
            });
        });

        describe('empty outbox', function() {
            it('should work', function(done) {
                devicestorageStub.listItems.yields(null, [{
                    id: '12345'
                }]);
                emailDaoStub.smtpSend.yields();
                devicestorageStub.removeList.yields();

                function onOutboxUpdate(err, count) {
                    expect(err).to.not.exist;
                    if (count === 0) {
                        expect(devicestorageStub.listItems.callCount).to.equal(1);
                        expect(emailDaoStub.smtpSend.callCount).to.equal(1);
                        expect(devicestorageStub.removeList.callCount).to.equal(1);
                        done();
                    }
                }

                outbox._emptyOutbox(onOutboxUpdate);
            });
        });
    });
});