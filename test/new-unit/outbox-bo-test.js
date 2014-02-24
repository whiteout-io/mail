define(function(require) {
    'use strict';

    var expect = chai.expect,
        OutboxBO = require('js/bo/outbox'),
        KeychainDAO = require('js/dao/keychain-dao'),
        EmailDAO = require('js/dao/email-dao'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        InvitationDAO = require('js/dao/invitation-dao');

    chai.Assertion.includeStack = true;

    describe('Outbox Business Object unit test', function() {
        var outbox, emailDaoStub, devicestorageStub, invitationDaoStub, keychainStub,
            dummyUser = 'spiderpig@springfield.com';

        beforeEach(function() {
            emailDaoStub = sinon.createStubInstance(EmailDAO);
            emailDaoStub._account = {
                emailAddress: dummyUser,
                folders: [{
                    type: 'Outbox'
                }],
                online: true
            };
            devicestorageStub = sinon.createStubInstance(DeviceStorageDAO);
            keychainStub = sinon.createStubInstance(KeychainDAO);
            invitationDaoStub = sinon.createStubInstance(InvitationDAO);
            outbox = new OutboxBO(emailDaoStub, keychainStub, devicestorageStub, invitationDaoStub);
        });

        afterEach(function() {});

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

        describe('put', function() {
            it('should encrypt and store a mail', function(done) {
                var mail, senderKey, receiverKey;

                senderKey = {
                    publicKey: 'SENDER PUBLIC KEY'
                };
                receiverKey = {
                    publicKey: 'RECEIVER PUBLIC KEY'
                };
                mail = {
                    from: [{
                        name: 'member',
                        address: 'member@whiteout.io'
                    }],
                    to: [{
                        name: 'member',
                        address: 'member'
                    }, {
                        name: 'notamember',
                        address: 'notamember'
                    }],
                    cc: [],
                    bcc: []
                };

                keychainStub.getReceiverPublicKey.withArgs(mail.from[0].address).yieldsAsync(null, senderKey);
                keychainStub.getReceiverPublicKey.withArgs(mail.to[0].address).yieldsAsync(null, receiverKey);
                keychainStub.getReceiverPublicKey.withArgs(mail.to[1].address).yieldsAsync();

                emailDaoStub.encrypt.withArgs({
                    mail: mail,
                    publicKeysArmored: [senderKey.publicKey, receiverKey.publicKey]
                }).yieldsAsync();

                devicestorageStub.storeList.withArgs([mail]).yieldsAsync();

                outbox.put(mail, function(error) {
                    expect(error).to.not.exist;

                    expect(mail.publicKeysArmored.length).to.equal(2);
                    expect(mail.unregisteredUsers.length).to.equal(1);

                    done();
                });
            });
        });

        describe('process outbox', function() {
            it('should send to registered users and update pending mails', function(done) {
                var from, member, invited, notinvited, newlyjoined, dummyMails, newlyjoinedKey;

                from = [{
                    name: 'member',
                    address: 'member@whiteout.io'
                }];
                member = {
                    id: '12',
                    from: from,
                    to: [{
                        name: 'member',
                        address: 'member'
                    }],
                    publicKeysArmored: ['ARMORED KEY OF MEMBER'],
                    unregisteredUsers: []
                };
                invited = {
                    id: '34',
                    from: from,
                    to: [{
                        name: 'invited',
                        address: 'invited'
                    }],
                    publicKeysArmored: [],
                    unregisteredUsers: [{
                        name: 'invited',
                        address: 'invited'
                    }]
                };
                notinvited = {
                    id: '56',
                    from: from,
                    to: [{
                        name: 'notinvited',
                        address: 'notinvited'
                    }],
                    publicKeysArmored: [],
                    unregisteredUsers: [{
                        name: 'notinvited',
                        address: 'notinvited'
                    }]
                };
                newlyjoined = {
                    id: '78',
                    from: from,
                    to: [{
                        name: 'newlyjoined',
                        address: 'newlyjoined'
                    }],
                    publicKeysArmored: [],
                    unregisteredUsers: [{
                        name: 'newlyjoined',
                        address: 'newlyjoined'
                    }]
                };
                newlyjoinedKey = {
                    publicKey: 'THIS IS THE NEWLY JOINED PUBLIC KEY!'
                };

                dummyMails = [member, invited, notinvited, newlyjoined];

                devicestorageStub.listItems.yieldsAsync(null, dummyMails);

                keychainStub.getReceiverPublicKey.withArgs(invited.unregisteredUsers[0].address).yieldsAsync();
                keychainStub.getReceiverPublicKey.withArgs(notinvited.unregisteredUsers[0].address).yieldsAsync();
                keychainStub.getReceiverPublicKey.withArgs(newlyjoined.unregisteredUsers[0].address).yieldsAsync(null, newlyjoinedKey);

                invitationDaoStub.check.withArgs({
                    recipient: invited.to[0].address,
                    sender: invited.from[0].address
                }).yieldsAsync(null, InvitationDAO.INVITE_PENDING);

                invitationDaoStub.check.withArgs({
                    recipient: notinvited.to[0].address,
                    sender: notinvited.from[0].address
                }).yieldsAsync(null, InvitationDAO.INVITE_MISSING);

                invitationDaoStub.invite.withArgs({
                    recipient: notinvited.to[0].address,
                    sender: notinvited.from[0].address
                }).yieldsAsync(null, InvitationDAO.INVITE_SUCCESS);

                emailDaoStub.sendPlaintext.yieldsAsync();

                emailDaoStub.reEncrypt.withArgs({
                    mail: newlyjoined,
                    publicKeysArmored: [newlyjoinedKey.publicKey]
                }).yieldsAsync(null, newlyjoined);

                emailDaoStub.sendEncrypted.withArgs({
                    email: newlyjoined
                }).yieldsAsync();

                emailDaoStub.sendEncrypted.withArgs({
                    email: member
                }).yieldsAsync();

                devicestorageStub.storeList.withArgs([newlyjoined]).yieldsAsync();

                devicestorageStub.removeList.withArgs('email_OUTBOX_' + member.id).yieldsAsync();
                devicestorageStub.removeList.withArgs('email_OUTBOX_' + newlyjoined.id).yieldsAsync();

                function onOutboxUpdate(err, count) {
                    expect(err).to.not.exist;
                    expect(count).to.equal(2);

                    expect(outbox._outboxBusy).to.be.false;
                    expect(emailDaoStub.sendEncrypted.calledTwice).to.be.true;
                    expect(emailDaoStub.reEncrypt.calledOnce).to.be.true;
                    expect(emailDaoStub.sendPlaintext.calledOnce).to.be.true;
                    expect(devicestorageStub.listItems.calledOnce).to.be.true;
                    expect(keychainStub.getReceiverPublicKey.calledThrice).to.be.true;
                    expect(invitationDaoStub.check.calledTwice).to.be.true;

                    done();
                }

                outbox._processOutbox(onOutboxUpdate);
            });

            it('should not process outbox in offline mode', function(done) {
                emailDaoStub._account.online = false;
                devicestorageStub.listItems.yieldsAsync(null, [{}]);

                outbox._processOutbox(function(err, count) {
                    expect(err).to.not.exist;
                    expect(count).to.equal(1);
                    expect(devicestorageStub.listItems.callCount).to.equal(1);
                    expect(outbox._outboxBusy).to.be.false;
                    done();
                });
            });
        });
    });
});