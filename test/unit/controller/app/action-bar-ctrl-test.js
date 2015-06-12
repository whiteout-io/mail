'use strict';

var Email = require('../../../../src/js/email/email'),
    Dialog = require('../../../../src/js/util/dialog'),
    Status = require('../../../../src/js/util/status'),
    ActionBarCtrl = require('../../../../src/js/controller/app/action-bar');

describe('Action Bar Controller unit test', function() {
    var scope, actionBarCtrl, emailMock, dialogMock, statusMock;

    beforeEach(function() {
        emailMock = sinon.createStubInstance(Email);
        dialogMock = sinon.createStubInstance(Dialog);
        statusMock = sinon.createStubInstance(Status);

        angular.module('actionbartest', ['woUtil']);
        angular.mock.module('actionbartest');
        angular.mock.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {};

            scope.state.nav = {
                currentFolder: {
                    type: 'Inbox',
                    path: 'INBOX',
                    messages: [{
                        from: [],
                        checked: true
                    }, {
                        from: [],
                        checked: false
                    }, {
                        from: [],
                        flagged: true
                    }, {
                        from: [],
                        encrypted: true
                    }, {
                        from: [],
                        unread: true
                    }]
                }
            };

            actionBarCtrl = $controller(ActionBarCtrl, {
                $scope: scope,
                $q: window.qMock,
                email: emailMock,
                dialog: dialogMock,
                status: statusMock
            });
        });
    });

    afterEach(function() {});

    describe('check', function() {
        it('should check all', function() {
            scope.check(scope.CHECKALL);

            expect(scope.state.nav.currentFolder.messages[0].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[1].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[2].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[3].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[4].checked).to.be.true;
        });

        it('should check none', function() {
            scope.check(scope.CHECKNONE);
            expect(scope.state.nav.currentFolder.messages[0].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[1].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[2].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[3].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[4].checked).to.be.false;
        });

        it('should check encrypted', function() {
            scope.check(scope.CHECKENCRYPTED);
            expect(scope.state.nav.currentFolder.messages[0].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[1].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[2].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[3].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[4].checked).to.be.false;
        });

        it('should check unencrypted', function() {
            scope.check(scope.CHECKUNENCRYPTED);
            expect(scope.state.nav.currentFolder.messages[0].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[1].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[2].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[3].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[4].checked).to.be.true;
        });

        it('should check unread', function() {
            scope.check(scope.CHECKUNREAD);
            expect(scope.state.nav.currentFolder.messages[0].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[1].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[2].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[3].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[4].checked).to.be.true;
        });

        it('should check read', function() {
            scope.check(scope.CHECKREAD);
            expect(scope.state.nav.currentFolder.messages[0].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[1].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[2].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[3].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[4].checked).to.be.false;

        });

        it('should check starred', function() {
            scope.check(scope.CHECKFLAGGED);
            expect(scope.state.nav.currentFolder.messages[0].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[1].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[2].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[3].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[4].checked).to.be.false;

        });

        it('should check unstarred', function() {
            scope.check(scope.CHECKUNFLAGGED);
            expect(scope.state.nav.currentFolder.messages[0].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[1].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[2].checked).to.be.false;
            expect(scope.state.nav.currentFolder.messages[3].checked).to.be.true;
            expect(scope.state.nav.currentFolder.messages[4].checked).to.be.true;
        });
    });

    describe('deleteMessage', function() {
        it('should not delete without a selected mail', function() {
            scope.deleteMessage();
        });

        it('should delete the selected mail', function(done) {
            emailMock.deleteMessage.returns(resolves());

            scope.deleteMessage({}).then(function() {
                expect(statusMock.setReading.withArgs(false).calledOnce).to.be.true;
                expect(emailMock.deleteMessage.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('deleteCheckedMessages', function() {
        var deleteMessageStub;

        beforeEach(function() {
            deleteMessageStub = sinon.stub(scope, 'deleteMessage');
        });
        afterEach(function() {
            deleteMessageStub.restore();
        });

        it('should delete the selected mail', function() {
            scope.deleteCheckedMessages();

            expect(deleteMessageStub.calledOnce).to.be.true;
        });
    });

    describe('moveMessage', function() {
        it('should not move without a selected mail', function() {
            scope.moveMessage();
        });

        it('should move the selected mail', function(done) {
            emailMock.moveMessage.returns(resolves());

            scope.moveMessage({}, {}).then(function() {
                expect(statusMock.setReading.withArgs(false).calledOnce).to.be.true;
                expect(emailMock.moveMessage.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('moveCheckedMessages', function() {
        var moveMessageStub;

        beforeEach(function() {
            moveMessageStub = sinon.stub(scope, 'moveMessage');
        });
        afterEach(function() {
            moveMessageStub.restore();
        });

        it('should delete the selected mail', function() {
            scope.moveCheckedMessages();

            expect(moveMessageStub.calledOnce).to.be.true;
        });
    });

    describe('getJunkFolder', function() {
        it('should work', function() {
            scope.account = {
                folders: [{
                    type: 'Junk'
                }]
            };
            var folder = scope.getJunkFolder();
            expect(folder).to.exist;
        });

        it('should fail', function() {
            scope.account = {
                folders: [{
                    type: 'NotJunk'
                }]
            };
            var folder = scope.getJunkFolder();
            expect(folder).to.not.exist;
            expect(dialogMock.error.calledOnce).to.be.true;
        });
    });

    describe('markMessage', function() {
        it('should not mark without a selected mail', function() {
            scope.markMessage();
        });

        it('should not mark when old and new changes are equivalent', function() {
            scope.markMessage({
                unread: false
            }, false);

            scope.markMessage({
                unread: true
            }, true);
        });

        it('should mark the selected mail', function(done) {
            emailMock.setFlags.returns(resolves());

            scope.markMessage({}, true).then(function() {
                expect(statusMock.setReading.withArgs(false).calledOnce).to.be.true;
                expect(emailMock.setFlags.calledOnce).to.be.true;
                done();
            });
        });

        it('should mark the selected mail and close read mode', function(done) {
            emailMock.setFlags.returns(resolves());

            scope.markMessage({}, true, true).then(function() {
                expect(statusMock.setReading.calledOnce).to.be.false;
                expect(emailMock.setFlags.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('markCheckedMessages', function() {
        var markMessageStub;

        beforeEach(function() {
            markMessageStub = sinon.stub(scope, 'markMessage');
        });
        afterEach(function() {
            markMessageStub.restore();
        });

        it('should mark the selected mail', function() {
            scope.markCheckedMessages();

            expect(markMessageStub.calledOnce).to.be.true;
        });
    });

    describe('flagMessage', function() {
        it('should not flag without a selected mail', function() {
            scope.flagMessage();
        });

        it('should not flag when old and new changes are equivalent', function() {
            scope.flagMessage({
                flagged: false
            }, false);

            scope.flagMessage({
                flagged: true
            }, true);
        });

        it('should flag the selected mail', function() {
            emailMock.setFlags.returns(resolves());

            scope.flagMessage({}, true).then(function() {
                expect(emailMock.setFlags.calledOnce).to.be.true;
            });
        });
    });

    describe('flagCheckedMessages', function() {
        var flagMessageStub;

        beforeEach(function() {
            flagMessageStub = sinon.stub(scope, 'flagMessage');
        });
        afterEach(function() {
            flagMessageStub.restore();
        });

        it('should delete the selected mail', function() {
            scope.flagCheckedMessages();

            expect(flagMessageStub.calledOnce).to.be.true;
        });
    });

});