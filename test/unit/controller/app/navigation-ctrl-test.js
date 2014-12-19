'use strict';

var NavigationCtrl = require('../../../../src/js/controller/app/navigation'),
    Email = require('../../../../src/js/email/email'),
    Account = require('../../../../src/js/email/account'),
    Outbox = require('../../../../src/js/email/outbox'),
    Dialog = require('../../../../src/js/util/dialog'),
    Notif = require('../../../../src/js/util/notification');

describe('Navigation Controller unit test', function() {
    var scope, ctrl, emailDaoMock, accountMock, notificationStub, dialogStub, outboxBoMock, outboxFolder;

    beforeEach(function() {
        var account = {
            folders: [{
                type: 'Inbox',
                count: 2,
                path: 'INBOX'
            }, {
                type: 'Outbox',
                count: 0,
                path: 'OUTBOX'
            }]
        };

        emailDaoMock = sinon.createStubInstance(Email);
        outboxFolder = account.folders[1];
        outboxBoMock = sinon.createStubInstance(Outbox);
        outboxBoMock.startChecking.returns();
        dialogStub = sinon.createStubInstance(Dialog);
        notificationStub = sinon.createStubInstance(Notif);
        accountMock = sinon.createStubInstance(Account);
        accountMock.list.returns([account]);
        accountMock.isLoggedIn.returns(true);

        angular.module('navigationtest', ['woServices', 'woEmail', 'woUtil']);
        angular.mock.module('navigationtest');
        angular.mock.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {};
            ctrl = $controller(NavigationCtrl, {
                $scope: scope,
                $routeParams: {},
                $q: window.qMock,
                account: accountMock,
                email: emailDaoMock,
                outbox: outboxBoMock,
                notification: notificationStub,
                dialog: dialogStub
            });
        });
    });

    afterEach(function() {});

    describe('initial state', function() {
        it('should be well defined', function() {
            expect(scope.state).to.exist;
            expect(scope.state.lightbox).to.be.undefined;
            expect(scope.account.folders).to.not.be.empty;
        });
    });

    describe('open/close nav view', function() {
        it('should open/close', function() {
            expect(scope.state.nav.open).to.be.false;
            scope.state.nav.toggle(true);
            expect(scope.state.nav.open).to.be.true;
            scope.state.nav.toggle(false);
            expect(scope.state.nav.open).to.be.false;
        });
    });

    describe('empty outbox', function() {
        it('should work', function() {
            var callback;

            expect(outboxBoMock.startChecking.callCount).to.equal(1);

            outboxBoMock.startChecking.calledWith(sinon.match(function(cb) {
                callback = cb;
            }));

            callback(null, 5);
            expect(outboxFolder.count).to.equal(5);
        });
    });
});