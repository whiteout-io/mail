'use strict';

var OutboxBO = require('../../src/js/bo/outbox'),
    KeychainDAO = require('../../src/js/dao/keychain-dao'),
    EmailDAO = require('../../src/js/dao/email-dao'),
    DeviceStorageDAO = require('../../src/js/dao/devicestorage-dao');

describe('Outbox Business Object unit test', function() {
    var outbox, emailDaoStub, devicestorageStub, keychainStub,
        dummyUser = 'spiderpig@springfield.com';

    chai.config.includeStack = true;

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
        outbox = new OutboxBO(emailDaoStub, keychainStub, devicestorageStub);
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
        it('should not encrypt and store a mail', function(done) {
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

            devicestorageStub.storeList.withArgs([mail]).yieldsAsync();

            outbox.put(mail, function(error) {
                expect(error).to.not.exist;

                expect(mail.publicKeysArmored.length).to.equal(2);
                expect(emailDaoStub.encrypt.called).to.be.false;
                expect(devicestorageStub.storeList.calledOnce).to.be.true;

                done();
            });
        });

        it('should not encrypt a mail with bcc and store a mail', function(done) {
            var mail;

            mail = {
                from: [{
                    name: 'member',
                    address: 'member@whiteout.io'
                }],
                to: [{
                    name: 'member',
                    address: 'member@whiteout.io'
                }],
                cc: [],
                bcc: [{
                    name: 'member',
                    address: 'member@whiteout.io'
                }]
            };

            devicestorageStub.storeList.withArgs([mail]).yieldsAsync();

            outbox.put(mail, function(error) {
                expect(error).to.not.exist;

                expect(mail.publicKeysArmored.length).to.equal(0);
                expect(keychainStub.getReceiverPublicKey.called).to.be.false;
                expect(emailDaoStub.encrypt.called).to.be.false;
                expect(devicestorageStub.storeList.calledOnce).to.be.true;

                done();
            });
        });

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
            keychainStub.getReceiverPublicKey.withArgs(mail.to[1].address).yieldsAsync(null, receiverKey);

            emailDaoStub.encrypt.withArgs({
                mail: mail,
                publicKeysArmored: [senderKey.publicKey, receiverKey.publicKey, receiverKey.publicKey]
            }).yieldsAsync();

            devicestorageStub.storeList.withArgs([mail]).yieldsAsync();

            outbox.put(mail, function(error) {
                expect(error).to.not.exist;

                expect(mail.publicKeysArmored.length).to.equal(3);
                expect(emailDaoStub.encrypt.calledOnce).to.be.true;
                expect(devicestorageStub.storeList.calledOnce).to.be.true;

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
                encrypted: true,
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
                encrypted: true,
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

            emailDaoStub.sendPlaintext.yieldsAsync();

            emailDaoStub.sendEncrypted.withArgs({
                email: newlyjoined
            }).yieldsAsync();

            emailDaoStub.sendEncrypted.withArgs({
                email: member
            }).yieldsAsync();

            devicestorageStub.removeList.yieldsAsync();

            function onOutboxUpdate(err, count) {
                expect(err).to.not.exist;
                expect(count).to.equal(0);

                expect(outbox._outboxBusy).to.be.false;
                expect(emailDaoStub.sendEncrypted.callCount).to.equal(2);
                expect(emailDaoStub.sendPlaintext.callCount).to.equal(2);
                expect(devicestorageStub.listItems.callCount).to.equal(1);
                expect(devicestorageStub.removeList.callCount).to.equal(4);
                expect(keychainStub.getReceiverPublicKey.callCount).to.equal(0);

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