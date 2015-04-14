'use strict';

var mailreader = require('mailreader'),
    KeychainDAO = require('../../../src/js/service/keychain'),
    ImapClient = require('imap-client'),
    PublickeyVerifier = require('../../../src/js/service/publickey-verifier'),
    appConfig = require('../../../src/js/app-config');

describe('Public-Key Verifier', function() {
    var verifier;
    var imapStub, parseStub, keychainStub, credentials, workerPath;

    beforeEach(function() {
        //
        // Stubs
        //

        workerPath = '../lib/tcp-socket-tls-worker.min.js';
        imapStub = sinon.createStubInstance(ImapClient);
        parseStub = sinon.stub(mailreader, 'parse');
        keychainStub = sinon.createStubInstance(KeychainDAO);

        //
        // Fixture
        //
        credentials = {
            imap: {
                host: 'asd',
                port: 1234,
                secure: true,
                auth: {
                    user: 'user',
                    pass: 'pass'
                }
            }
        };

        //
        // Setup SUT
        //
        verifier = new PublickeyVerifier({}, appConfig, mailreader, keychainStub);
        verifier._imap = imapStub;
    });

    afterEach(function() {
        mailreader.parse.restore();
    });

    describe('#check', function() {
        var FOLDER_TYPE_INBOX = 'Inbox',
            FOLDER_TYPE_SENT = 'Sent',
            FOLDER_TYPE_DRAFTS = 'Drafts',
            FOLDER_TYPE_TRASH = 'Trash',
            FOLDER_TYPE_FLAGGED = 'Flagged';

        var messages,
            folders,
            searches,
            workingUUID,
            outdatedUUID;

        beforeEach(function() {
            folders = {};
            searches = {};

            [FOLDER_TYPE_INBOX, FOLDER_TYPE_SENT, FOLDER_TYPE_DRAFTS, FOLDER_TYPE_TRASH, FOLDER_TYPE_FLAGGED].forEach(function(type) {
                folders[type] = [{
                    path: type
                }];
                searches[type] = {
                    path: type,
                    header: ['Subject', appConfig.string.verificationSubject]
                };
            });

            workingUUID = '8314D2BF-82E5-4862-A614-1EA8CD582485';
            outdatedUUID = 'CA8BD44B-E4C5-4D48-82AB-33DA2E488CF7';
            messages = [{
                uid: 123,
                bodyParts: [{
                    type: 'text',
                    content: 'https://keys.whiteout.io/verify/' + workingUUID
                }]
            }, {
                uid: 456,
                bodyParts: [{
                    type: 'text',
                    content: 'https://keys.whiteout.io/verify/' + outdatedUUID
                }]
            }, {
                uid: 789,
                bodyParts: [{
                    type: 'text',
                    content: 'foobar'
                }]
            }];
        });

        it('should verify a key', function(done) {
            // log in
            imapStub.login.returns(resolves());

            // list the folders
            imapStub.listWellKnownFolders.returns(resolves(folders));

            // return matching uids for inbox, flagged, and sent, otherwise no matches
            imapStub.search.returns(resolves([]));
            imapStub.search.withArgs(searches[FOLDER_TYPE_INBOX]).returns(resolves([messages[1].uid]));
            imapStub.search.withArgs(searches[FOLDER_TYPE_FLAGGED]).returns(resolves([messages[0].uid]));
            imapStub.search.withArgs(searches[FOLDER_TYPE_SENT]).returns(resolves([messages[2].uid]));

            // fetch message metadata from inbox, flagged, and sent
            imapStub.listMessages.withArgs({
                path: FOLDER_TYPE_INBOX,
                firstUid: messages[1].uid,
                lastUid: messages[1].uid
            }).returns(resolves([messages[1]]));
            imapStub.listMessages.withArgs({
                path: FOLDER_TYPE_FLAGGED,
                firstUid: messages[0].uid,
                lastUid: messages[0].uid
            }).returns(resolves([messages[0]]));
            imapStub.listMessages.withArgs({
                path: FOLDER_TYPE_SENT,
                firstUid: messages[2].uid,
                lastUid: messages[2].uid
            }).returns(resolves([messages[2]]));

            // fetch message metadata from inbox, flagged, and sent
            imapStub.getBodyParts.withArgs({
                path: FOLDER_TYPE_INBOX,
                uid: messages[1].uid,
                bodyParts: messages[1].bodyParts
            }).returns(resolves(messages[1].bodyParts));
            imapStub.getBodyParts.withArgs({
                path: FOLDER_TYPE_FLAGGED,
                uid: messages[0].uid,
                bodyParts: messages[0].bodyParts
            }).returns(resolves(messages[0].bodyParts));
            imapStub.getBodyParts.withArgs({
                path: FOLDER_TYPE_SENT,
                uid: messages[2].uid,
                bodyParts: messages[2].bodyParts
            }).returns(resolves(messages[2].bodyParts));

            // parse messages (already have body parts, so this is essentially a no-op)
            parseStub.withArgs(messages[0]).yields(null, messages[0].bodyParts);
            parseStub.withArgs(messages[1]).yields(null, messages[1].bodyParts);
            parseStub.withArgs(messages[2]).yields(null, messages[2].bodyParts);

            // delete the verification message from the inbox
            imapStub.deleteMessage.withArgs({
                path: FOLDER_TYPE_FLAGGED,
                uid: messages[0].uid
            }).returns(resolves());

            keychainStub.verifyPublicKey.withArgs(workingUUID).returns(resolves());
            keychainStub.verifyPublicKey.withArgs(outdatedUUID).returns(rejects(new Error('foo')));

            // logout ... duh
            imapStub.logout.returns(resolves());

            // run the test
            verifier.verify().then(function() {
                // verification
                expect(parseStub.callCount).to.equal(3);
                expect(imapStub.login.callCount).to.equal(1);
                expect(imapStub.listWellKnownFolders.callCount).to.equal(1);
                expect(imapStub.search.callCount).to.be.at.least(5);
                expect(imapStub.listMessages.callCount).to.equal(3);
                expect(imapStub.getBodyParts.callCount).to.equal(3);
                expect(imapStub.deleteMessage.callCount).to.equal(1);
                expect(imapStub.logout.callCount).to.equal(1);

                done();
            });
        });

        it('should not find a verifiable key', function(done) {
            // log in
            imapStub.login.returns(resolves());

            // list the folders
            imapStub.listWellKnownFolders.returns(resolves(folders));

            // return matching uids for inbox, flagged, and sent, otherwise no matches
            imapStub.search.returns(resolves([]));

            // logout ... duh
            imapStub.logout.returns(resolves());

            // run the test
            verifier.verify().catch(function(error) {
                expect(error.message).to.equal('');

                // verification
                expect(imapStub.login.callCount).to.equal(1);
                expect(imapStub.listWellKnownFolders.callCount).to.equal(1);
                expect(imapStub.search.callCount).to.be.at.least(5);
                expect(imapStub.listMessages.callCount).to.equal(0);
                expect(imapStub.getBodyParts.callCount).to.equal(0);
                expect(imapStub.deleteMessage.callCount).to.equal(0);
                expect(imapStub.logout.callCount).to.equal(1);
                expect(parseStub.callCount).to.equal(0);

                done();
            });
        });
    });
});