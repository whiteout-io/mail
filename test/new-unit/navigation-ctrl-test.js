define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        NavigationCtrl = require('js/controller/navigation'),
        EmailDAO = require('js/dao/email-dao'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        appController = require('js/app-controller');

    describe('Navigation Controller unit test', function() {
        var scope, ctrl, origEmailDao, emailDaoMock, deviceStorageMock, tempChrome;

        beforeEach(function() {
            if (window.chrome.identity) {
                tempChrome = window.chrome.identity;
                delete window.chrome.identity;
            }
            // remember original module to restore later
            origEmailDao = appController._emailDao;

            emailDaoMock = sinon.createStubInstance(EmailDAO);
            appController._emailDao = emailDaoMock;

            deviceStorageMock = sinon.createStubInstance(DeviceStorageDAO);
            appController._emailDao._devicestorage = deviceStorageMock;

            angular.module('navigationtest', []);
            mocks.module('navigationtest');
            mocks.inject(function($rootScope, $controller) {
                scope = $rootScope.$new();
                scope.state = {};
                ctrl = $controller(NavigationCtrl, {
                    $scope: scope
                });
            });
        });

        afterEach(function() {
            // restore the module
            appController._emailDao = origEmailDao;
            if (tempChrome) {
                window.chrome.identity = tempChrome;
            }
        });

        describe('initial state', function() {
            it('should be well defined', function() {
                expect(scope.state).to.exist;
                expect(scope.state.nav.open).to.be.false;
                expect(scope.folders).to.not.be.empty;

                expect(scope.onError).to.exist;
                expect(scope.openFolder).to.exist;
                expect(scope.emptyOutbox).to.exist;
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
                deviceStorageMock.listItems.yields(null, [{
                    id: 1
                }, {
                    id: 2
                }, {
                    id: 3
                }]);
                emailDaoMock.smtpSend.yields();
                deviceStorageMock.removeList.yields();

                scope.emptyOutbox();

                expect(deviceStorageMock.listItems.calledOnce).to.be.true;
                expect(emailDaoMock.smtpSend.calledThrice).to.be.true;
                expect(deviceStorageMock.removeList.calledThrice).to.be.true;
            });

            it('should not work when device storage errors', function() {
                deviceStorageMock.listItems.yields({errMsg: 'error'});

                scope.emptyOutbox();

                expect(deviceStorageMock.listItems.calledOnce).to.be.true;
            });

            it('should not work when smtp send fails', function() {
                deviceStorageMock.listItems.yields(null, [{
                    id: 1
                }]);
                emailDaoMock.smtpSend.yields({errMsg: 'error'});

                scope.emptyOutbox();

                expect(deviceStorageMock.listItems.calledOnce).to.be.true;
                expect(emailDaoMock.smtpSend.calledOnce).to.be.true;
            });
        });
    });
});