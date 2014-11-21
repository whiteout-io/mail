'use strict';

var mocks = angular.mock,
    KeychainDAO = require('../../src/js/dao/keychain-dao'),
    InvitationDAO = require('../../src/js/dao/invitation-dao'),
    PGP = require('../../src/js/crypto/pgp'),
    ReadCtrl = require('../../src/js/controller/read'),
    OutboxBO = require('../../src/js/bo/outbox'),
    appController = require('../../src/js/app-controller');

describe('Read Controller unit test', function() {
    var scope, ctrl,
        origKeychain, keychainMock,
        origInvitation, invitationMock,
        origCrypto, cryptoMock,
        origOutbox, outboxMock,
        origEmailDao;

    beforeEach(function() {
        origKeychain = appController._keychain;
        appController._keychain = keychainMock = sinon.createStubInstance(KeychainDAO);

        origInvitation = appController._invitationDao;
        appController._invitationDao = invitationMock = sinon.createStubInstance(InvitationDAO);

        origCrypto = appController._pgp;
        appController._pgp = cryptoMock = sinon.createStubInstance(PGP);

        origOutbox = appController._outboxBo;
        appController._outboxBo = outboxMock = sinon.createStubInstance(OutboxBO);

        origEmailDao = appController._emailDao;
        appController._emailDao = {
            _account: 'sender@example.com'
        };

        angular.module('readtest', []);
        mocks.module('readtest');
        mocks.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {};
            ctrl = $controller(ReadCtrl, {
                $scope: scope
            });
        });
    });

    afterEach(function() {
        appController._keychain = origKeychain;
        appController._invitationDao = origInvitation;
        appController._pgp = origCrypto;
        appController._outboxBo = origOutbox;
        appController._emailDao = origEmailDao;
    });

    describe('scope variables', function() {
        it('should be set correctly', function() {
            expect(scope.state.read).to.exist;
            expect(scope.state.read.open).to.be.false;
            expect(scope.state.read.toggle).to.exist;
        });
    });

    describe('open/close read view', function() {
        it('should open/close', function() {
            expect(scope.state.read.open).to.be.false;
            scope.state.read.toggle(true);
            expect(scope.state.read.open).to.be.true;
            scope.state.read.toggle(false);
            expect(scope.state.read.open).to.be.false;
        });
    });

    describe('getKeyId', function() {
        var address = 'asfd@asdf.com';

        it('should show searching on error', function() {
            expect(scope.keyId).to.equal('No key found.');
            keychainMock.getReceiverPublicKey.yields(42);

            scope.onError = function(err) {
                expect(err).to.equal(42);
                expect(scope.keyId).to.equal('Searching...');
            };

            scope.getKeyId(address);
        });

        it('should allow invitation on empty key', function() {
            keychainMock.getReceiverPublicKey.yields();

            scope.onError = function(err) {
                expect(err).not.exist;
                expect(scope.keyId).to.equal('User has no key. Click to invite.');
            };

            scope.getKeyId(address);
        });

        it('should show searching on error', function() {
            keychainMock.getReceiverPublicKey.yields(null, {
                publicKey: 'PUBLIC KEY'
            });

            cryptoMock.getFingerprint.returns('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

            scope.onError = function(err) {
                expect(err).to.not.exist;
                expect(scope.keyId).to.equal('PGP key: XXXXXXXX');
            };

            scope.getKeyId(address);
        });
    });

    describe('invite', function() {
        it('not allow invitation for secure users', function() {
            expect(scope.keyId).to.equal('No key found.');

            scope.invite({
                secure: true,
                address: 'asdf@asdf.de'
            });

            expect(scope.keyId).to.equal('No key found.');
        });

        it('should show error on invitation dao invite error', function() {
            invitationMock.invite.yields(42);

            scope.onError = function(err) {
                expect(err).to.equal(42);
            };

            scope.invite({
                address: 'asdf@asdf.de'
            });
        });

        it('should show error on outbox put error', function() {
            invitationMock.invite.yields();
            outboxMock.put.yields(42);

            scope.onError = function(err) {
                expect(err).to.equal(42);
            };

            scope.invite({
                address: 'asdf@asdf.de'
            });
        });

        it('should work', function() {
            invitationMock.invite.yields();
            outboxMock.put.yields();

            scope.onError = function(err) {
                expect(err).to.not.exist;
            };

            scope.invite({
                address: 'asdf@asdf.de'
            });
        });
    });

    describe('parseConversation', function() {
        it.skip('should work', function() {
            var body = 'foo\n' +
                '\n' +
                '> bar\n' +
                '>\n' +
                '> foofoo\n' +
                '>> foofoobar\n' +
                '\ncomment\n' +
                '>> barbar';

            var nodes = scope.parseConversation({
                body: body
            });
            expect(nodes).to.exist;

            var expectedJson = '{"children":["foo\\n",{"children":["bar\\n\\nfoofoo",{"children":["foofoobar"]}]},"\\ncomment",{"children":[{"children":["barbar"]}]}]}';
            var json = JSON.stringify(nodes);
            expect(json).to.equal(expectedJson);

            var expectedHtml = '<div class="view-read-body"><div class="line"><span>foo</span><br></div><div class="line empty-line"><span></span><br></div><div class="prev-message"><div class="line"><span>bar</span><br></div><div class="line empty-line"><span></span><br></div><div class="line"><span>foofoo</span><br></div></div><div class="prev-message"><div class="prev-message"><div class="line"><span>foofoobar</span><br></div></div></div><div class="line empty-line"><span></span><br></div><div class="line"><span>comment</span><br></div><div class="prev-message"><div class="prev-message"><div class="line"><span>barbar</span><br></div></div></div></div>';
            var html = scope.renderNodes(nodes);
            expect(html).to.equal(expectedHtml);
        });
    });

});