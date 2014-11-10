'use strict';

var mocks = angular.mock,
    EmailDAO = require('../../src/js/dao/email-dao'),
    appController = require('../../src/js/app-controller'),
    ActionBarCtrl = require('../../src/js/controller/action-bar');

describe('Action Bar Controller unit test', function() {
    var scope, actionBarCtrl, emailDaoMock, origEmailDao;

    beforeEach(function() {
        origEmailDao = appController._emailDao;
        emailDaoMock = sinon.createStubInstance(EmailDAO);
        appController._emailDao = emailDaoMock;

        angular.module('actionbartest', []);
        mocks.module('actionbartest');
        mocks.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {
                mailList: {
                    updateStatus: function() {}
                }
            };

            scope.state.nav = {
                currentFolder: {
                    type: 'Inbox',
                    path: 'INBOX',
                    messages: [{
                        checked: true
                    }, {
                        checked: false
                    }]
                }
            };

            scope.state.read = {
                open: true
            };

            actionBarCtrl = $controller(ActionBarCtrl, {
                $scope: scope
            });
        });
    });

    afterEach(function() {
        // restore the module
        appController._emailDao = origEmailDao;
    });

    describe('deleteMessage', function() {
        it('should not delete without a selected mail', function() {
            scope.deleteMessage();
        });

        it('should delete the selected mail', function() {
            emailDaoMock.deleteMessage.yields();

            scope.deleteMessage({});

            expect(emailDaoMock.deleteMessage.calledOnce).to.be.true;
            expect(scope.state.read.open).to.be.false;
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

        it('should move the selected mail', function() {
            emailDaoMock.moveMessage.yields();

            scope.moveMessage({}, {});

            expect(emailDaoMock.moveMessage.calledOnce).to.be.true;
            expect(scope.state.read.open).to.be.false;
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

    describe('markMessage', function() {
        it('should not move without a selected mail', function() {
            scope.markMessage();
        });

        it('should move the selected mail', function() {
            emailDaoMock.setFlags.yields();

            scope.markMessage({}, true);

            expect(emailDaoMock.setFlags.calledOnce).to.be.true;
            expect(scope.state.read.open).to.be.false;
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

        it('should delete the selected mail', function() {
            scope.markCheckedMessages();

            expect(markMessageStub.calledOnce).to.be.true;
        });
    });

});