define(function(require) {
    'use strict';

    var expect = chai.expect,
        _ = require('underscore'),
        OutboxBO = require('js/bo/outbox'),
        KeychainDAO = require('js/dao/keychain-dao'),
        EmailDAO = require('js/dao/email-dao'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        InvitationDAO = require('js/dao/invitation-dao');

    describe('Outbox Business Object unit test', function() {
        var outbox, emailDaoStub, devicestorageStub, invitationDaoStub, keychainStub,
            dummyUser = 'spiderpig@springfield.com';

        beforeEach(function() {
            emailDaoStub = sinon.createStubInstance(EmailDAO);
            emailDaoStub._account = {
                emailAddress: dummyUser
            };
            emailDaoStub._devicestorage = devicestorageStub = sinon.createStubInstance(DeviceStorageDAO);
            emailDaoStub._keychain = keychainStub = sinon.createStubInstance(KeychainDAO);
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

        describe('process outbox', function() {
            it('should work', function(done) {
                var dummyMails = [{
                    id: '123',
                    to: [{
                        name: 'member',
                        address: 'member@whiteout.io'
                    }]
                }, {
                    id: '456',
                    to: [{
                        name: 'invited',
                        address: 'invited@whiteout.io'
                    }]
                }, {
                    id: '789',
                    to: [{
                        name: 'notinvited',
                        address: 'notinvited@whiteout.io'
                    }]
                }];

                devicestorageStub.listItems.yieldsAsync(null, dummyMails);
                emailDaoStub.encryptedSend.yieldsAsync();
                emailDaoStub.send.yieldsAsync();
                devicestorageStub.removeList.yieldsAsync();
                invitationDaoStub.check.withArgs(sinon.match(function(o) { return o.recipient === 'invited@whiteout.io'; })).yieldsAsync(null, InvitationDAO.INVITE_PENDING);
                invitationDaoStub.check.withArgs(sinon.match(function(o) { return o.recipient === 'notinvited@whiteout.io'; })).yieldsAsync(null, InvitationDAO.INVITE_MISSING);
                invitationDaoStub.invite.withArgs(sinon.match(function(o) { return o.recipient === 'notinvited@whiteout.io'; })).yieldsAsync(null, InvitationDAO.INVITE_SUCCESS);
                keychainStub.getReceiverPublicKey.withArgs(sinon.match(function(o) { return o === 'member@whiteout.io'; })).yieldsAsync(null, 'this is not the key you are looking for...');
                keychainStub.getReceiverPublicKey.withArgs(sinon.match(function(o) { return o === 'invited@whiteout.io' || o === 'notinvited@whiteout.io'; })).yieldsAsync();

                var check = _.after(dummyMails.length + 1, function() {
                    expect(devicestorageStub.listItems.callCount).to.equal(1);
                    expect(emailDaoStub.encryptedSend.callCount).to.equal(1);
                    expect(emailDaoStub.send.callCount).to.equal(1);
                    expect(devicestorageStub.removeList.callCount).to.equal(1);
                    expect(invitationDaoStub.check.callCount).to.equal(2);
                    expect(invitationDaoStub.invite.callCount).to.equal(1);
                    done();
                });

                function onOutboxUpdate(err, count) {
                    expect(err).to.not.exist;
                    expect(count).to.exist;
                    check();
                }

                outbox._processOutbox(onOutboxUpdate);
            });
        });
    });
});