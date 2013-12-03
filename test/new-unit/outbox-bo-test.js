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
            devicestorageStub = sinon.createStubInstance(DeviceStorageDAO);
            keychainStub = sinon.createStubInstance(KeychainDAO);
            invitationDaoStub = sinon.createStubInstance(InvitationDAO);
            outbox = new OutboxBO(emailDaoStub, keychainStub, devicestorageStub, invitationDaoStub);
        });

        afterEach(function() {});

        describe('init', function() {
            it('should work', function() {
                expect(outbox).to.exist;
                expect(outbox._emailDao).to.equal(emailDaoStub);
                expect(outbox._keychain).to.equal(keychainStub);
                expect(outbox._devicestorage).to.equal(devicestorageStub);
                expect(outbox._invitationDao).to.equal(invitationDaoStub);
                expect(outbox._outboxBusy).to.be.false;
                expect(outbox.pendingEmails).to.be.empty;
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
            it('should send to registered users and update pending mails', function(done) {
                var member, invited, notinvited, dummyMails, unsentCount;

                member = {
                    id: '123',
                    to: [{
                        name: 'member',
                        address: 'member@whiteout.io'
                    }]
                };
                invited = {
                    id: '456',
                    to: [{
                        name: 'invited',
                        address: 'invited@whiteout.io'
                    }]
                };
                notinvited = {
                    id: '789',
                    to: [{
                        name: 'notinvited',
                        address: 'notinvited@whiteout.io'
                    }]
                };
                dummyMails = [member, invited, notinvited];

                emailDaoStub.list.yieldsAsync(null, dummyMails);
                emailDaoStub.sendEncrypted.yieldsAsync();
                emailDaoStub.sendPlaintext.yieldsAsync();
                devicestorageStub.removeList.yieldsAsync();
                invitationDaoStub.check.withArgs(sinon.match(function(o) {
                    return o.recipient === 'invited@whiteout.io';
                })).yieldsAsync(null, InvitationDAO.INVITE_PENDING);
                invitationDaoStub.check.withArgs(sinon.match(function(o) {
                    return o.recipient === 'notinvited@whiteout.io';
                })).yieldsAsync(null, InvitationDAO.INVITE_MISSING);
                invitationDaoStub.invite.withArgs(sinon.match(function(o) {
                    return o.recipient === 'notinvited@whiteout.io';
                })).yieldsAsync(null, InvitationDAO.INVITE_SUCCESS);
                keychainStub.getReceiverPublicKey.withArgs(sinon.match(function(o) {
                    return o === 'member@whiteout.io';
                })).yieldsAsync(null, 'this is not the key you are looking for...');
                keychainStub.getReceiverPublicKey.withArgs(sinon.match(function(o) {
                    return o === 'invited@whiteout.io' || o === 'notinvited@whiteout.io';
                })).yieldsAsync();

                var check = _.after(dummyMails.length + 1, function() {
                    expect(unsentCount).to.equal(2);
                    expect(emailDaoStub.list.callCount).to.equal(1);
                    expect(emailDaoStub.sendEncrypted.callCount).to.equal(1);
                    expect(emailDaoStub.sendPlaintext.callCount).to.equal(1);
                    expect(devicestorageStub.removeList.callCount).to.equal(1);
                    expect(invitationDaoStub.check.callCount).to.equal(2);
                    expect(invitationDaoStub.invite.callCount).to.equal(1);

                    expect(outbox.pendingEmails.length).to.equal(2);
                    expect(outbox.pendingEmails).to.contain(invited);
                    expect(outbox.pendingEmails).to.contain(notinvited);
                    done();
                });

                function onOutboxUpdate(err, count) {
                    expect(err).to.not.exist;
                    expect(count).to.exist;
                    unsentCount = count;
                    check();
                }

                outbox._processOutbox(onOutboxUpdate);
            });
        });
    });
});