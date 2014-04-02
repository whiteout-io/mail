define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        NavigationCtrl = require('js/controller/navigation'),
        EmailDAO = require('js/dao/email-dao'),
        OutboxBO = require('js/bo/outbox'),
        appController = require('js/app-controller');

    describe('Navigation Controller unit test', function() {
        var scope, ctrl, origEmailDao, emailDaoMock, outboxBoMock, hasIdentity, outboxFolder, onConnectStub;

        beforeEach(function(done) {
            hasIdentity = !! window.chrome.identity;
            if (!hasIdentity) {
                window.chrome.identity = {};
            }
            // remember original module to restore later
            origEmailDao = appController._emailDao;
            emailDaoMock = sinon.createStubInstance(EmailDAO);
            emailDaoMock._account = {
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
            outboxFolder = emailDaoMock._account.folders[1];
            appController._emailDao = emailDaoMock;
            outboxBoMock = sinon.createStubInstance(OutboxBO);
            appController._outboxBo = outboxBoMock;
            outboxBoMock.startChecking.returns();
            onConnectStub = sinon.stub(appController, 'onConnect');
            onConnectStub.yields();

            angular.module('navigationtest', []);
            mocks.module('navigationtest');
            mocks.inject(function($rootScope, $controller) {
                scope = $rootScope.$new();
                scope.state = {};
                ctrl = $controller(NavigationCtrl, {
                    $scope: scope
                });
                done();
            });
        });

        afterEach(function() {
            // restore the module
            appController._emailDao = origEmailDao;
            if (hasIdentity) {
                delete window.chrome.identity;
            }
            onConnectStub.restore();
        });

        describe('initial state', function() {
            it('should be well defined', function() {
                expect(scope.state).to.exist;
                expect(scope.state.nav.open).to.be.false;
                expect(scope.account.folders).to.not.be.empty;

                expect(scope.onError).to.exist;
                expect(scope.openFolder).to.exist;
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

        describe('open folder', function() {
            it('should work', function() {
                scope.state.nav.open = true;

                scope.openFolder('asd');
                expect(scope.state.nav.currentFolder).to.equal('asd');
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
});