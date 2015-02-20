'use strict';

var ImapClient = require('imap-client'),
    BrowserCrow = require('browsercrow'),
    mailreader = require('mailreader'),
    config = require('../../src/js/app-config'),
    str = config.string;

describe('Public-Key Verifier integration tests', function() {
    this.timeout(10 * 1000);

    var verifier; // SUT
    var imapServer, keyId, workingUUID, outdatedUUID; // fixture
    var imapClient, auth, keychain; // stubs

    beforeEach(function(done) {

        //
        // Test data
        //

        keyId = '1234DEADBEEF';
        workingUUID = '8314D2BF-82E5-4862-A614-1EA8CD582485';
        outdatedUUID = 'CA8BD44B-E4C5-4D48-82AB-33DA2E488CF7';

        //
        // Test server setup
        //

        var testAccount = {
            user: 'safewithme.testuser@gmail.com',
            pass: 'passphrase',
            xoauth2: 'testtoken'
        };

        var serverUsers = {};
        serverUsers[testAccount.user] = {
            password: testAccount.pass,
            xoauth2: {
                accessToken: testAccount.xoauth2,
                sessionTimeout: 3600 * 1000
            }
        };

        imapServer = new BrowserCrow({
            debug: false,
            plugins: ['sasl-ir', 'xoauth2', 'special-use', 'id', 'idle', 'unselect', 'enable', 'condstore'],
            id: {
                name: 'browsercrow',
                version: '0.1.0'
            },
            storage: {
                'INBOX': {
                    messages: [{
                        raw: 'Message-id: <a>\r\nSubject: ' + str.verificationSubject + '\r\n\r\nhttps://keys.whiteout.io/verify/' + outdatedUUID,
                        uid: 100
                    }, {
                        raw: 'Message-id: <a>\r\nSubject: ' + str.verificationSubject + '\r\n\r\nhttps://keys.whiteout.io/verify/' + workingUUID,
                        uid: 200
                    }]
                },
                '': {
                    separator: '/',
                    folders: {
                        '[Gmail]': {
                            flags: ['\\Noselect'],
                            folders: {
                                'All Mail': {
                                    'special-use': '\\All'
                                },
                                Drafts: {
                                    'special-use': '\\Drafts'
                                },
                                Important: {
                                    'special-use': '\\Important'
                                },
                                'Sent Mail': {
                                    'special-use': '\\Sent'
                                },
                                Spam: {
                                    'special-use': '\\Junk'
                                },
                                Starred: {
                                    'special-use': '\\Flagged'
                                },
                                Trash: {
                                    'special-use': '\\Trash'
                                }
                            }
                        }
                    }
                }
            },
            users: serverUsers
        });

        // don't multithread, Function.prototype.bind() is broken in phantomjs in web workers
        window.Worker = undefined;
        sinon.stub(mailreader, 'startWorker', function() {});

        // build and inject angular services
        angular.module('email-integration-test', ['woEmail']);
        angular.mock.module('email-integration-test');
        angular.mock.inject(function($injector) {
            verifier = $injector.get('publickeyVerifier');
            setup();
        });

        function setup() {
            auth = verifier._auth;
            auth.setCredentials({
                emailAddress: testAccount.user,
                password: 'asd',
                smtp: {}, // host and port don't matter here since we're using
                imap: {} // a preconfigured smtpclient with mocked tcp sockets
            });

            // avoid firing up a whole http
            keychain = verifier._keychain;
            keychain.verifyPublicKey = function(uuid) {
                return new Promise(function(res, rej) {
                    if (uuid === workingUUID) {
                        res();
                    } else {
                        rej();
                    }
                });
            };

            // create imap/smtp clients with stubbed tcp sockets
            imapClient = new ImapClient({
                auth: {
                    user: testAccount.user,
                    xoauth2: testAccount.xoauth2
                },
                secure: true
            });
            imapClient._client.client._TCPSocket = imapServer.createTCPSocket();

            auth._initialized = true;
            verifier._imap = imapClient;
            verifier._keyId = keyId;

            done();
        }
    });

    describe('#verify', function() {
        it('should verify a key', function(done) {
            verifier.verify(keyId).then(done);
        });
    });
});