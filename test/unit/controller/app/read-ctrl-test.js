'use strict';

var Keychain = require('../../../../src/js/service/keychain'),
    InvitationDAO = require('../../../../src/js/service/invitation'),
    Email = require('../../../../src/js/email/email'),
    PGP = require('../../../../src/js/crypto/pgp'),
    ReadCtrl = require('../../../../src/js/controller/app/read'),
    Outbox = require('../../../../src/js/email/outbox'),
    Dialog = require('../../../../src/js/util/dialog'),
    Auth = require('../../../../src/js/service/auth'),
    Download = require('../../../../src/js/util/download');

describe('Read Controller unit test', function() {
    var scope, ctrl, keychainMock, invitationMock, emailMock, pgpMock, outboxMock, dialogMock, authMock, downloadMock;

    beforeEach(function() {
        keychainMock = sinon.createStubInstance(Keychain);
        invitationMock = sinon.createStubInstance(InvitationDAO);
        pgpMock = sinon.createStubInstance(PGP);
        outboxMock = sinon.createStubInstance(Outbox);
        emailMock = sinon.createStubInstance(Email);
        dialogMock = sinon.createStubInstance(Dialog);
        authMock = sinon.createStubInstance(Auth);
        downloadMock = sinon.createStubInstance(Download);

        angular.module('readtest', ['woServices']);
        angular.mock.module('readtest');
        angular.mock.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {};
            ctrl = $controller(ReadCtrl, {
                $scope: scope,
                $q: window.qMock,
                email: emailMock,
                invitation: invitationMock,
                outbox: outboxMock,
                pgp: pgpMock,
                keychain: keychainMock,
                download: downloadMock,
                auth: authMock,
                dialog: dialogMock
            });
        });
    });

    afterEach(function() {});

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

        it('should show searching on error', function(done) {
            expect(scope.keyId).to.equal('No key found.');
            keychainMock.getReceiverPublicKey.returns(rejects(42));

            scope.getKeyId(address).then(function() {
                expect(dialogMock.error.calledOnce).to.be.true;
                expect(scope.keyId).to.equal('Searching...');
                done();
            });
        });

        it('should allow invitation on empty key', function(done) {
            keychainMock.getReceiverPublicKey.returns(resolves());

            scope.getKeyId(address).then(function() {
                expect(scope.keyId).to.equal('User has no key. Click to invite.');
                done();
            });
        });

        it('should show searching on error', function(done) {
            keychainMock.getReceiverPublicKey.returns(resolves({
                publicKey: 'PUBLIC KEY'
            }));

            pgpMock.getFingerprint.returns('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

            scope.getKeyId(address).then(function() {
                expect(scope.keyId).to.equal('PGP key: XXXXXXXX');
                done();
            });
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

        it('should show error on invitation dao invite error', function(done) {
            invitationMock.invite.returns(rejects(42));

            scope.invite({
                address: 'asdf@asdf.de'
            }).then(function() {
                expect(dialogMock.error.calledOnce).to.be.true;
                done();
            });
        });

        it('should show error on outbox put error', function(done) {
            invitationMock.invite.returns(resolves());
            outboxMock.put.returns(rejects(42));

            scope.invite({
                address: 'asdf@asdf.de'
            }).then(function() {
                expect(dialogMock.error.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            invitationMock.invite.returns(resolves());
            outboxMock.put.returns(resolves());

            scope.invite({
                address: 'asdf@asdf.de'
            }).then(function() {
                expect(dialogMock.error.calledOnce).to.be.false;
                done();
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