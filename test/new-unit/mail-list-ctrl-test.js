define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        MailListCtrl = require('js/controller/mail-list'),
        EmailDAO = require('js/dao/email-dao'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        KeychainDAO = require('js/dao/keychain-dao'),
        appController = require('js/app-controller');

    chai.Assertion.includeStack = true;

    describe('Mail List controller unit test', function() {
        var scope, ctrl, origEmailDao, emailDaoMock, keychainMock, deviceStorageMock,
            emailAddress, notificationClickedHandler, emails,
            hasChrome, hasNotifications, hasSocket, hasRuntime, hasIdentity;

        beforeEach(function() {
            hasChrome = !! window.chrome;
            hasNotifications = !! window.chrome.notifications;
            hasSocket = !! window.chrome.socket;
            hasIdentity = !! window.chrome.identity;
            if (!hasChrome) {
                window.chrome = {};
            }
            if (!hasNotifications) {
                window.chrome.notifications = {
                    onClicked: {
                        addListener: function(handler) {
                            notificationClickedHandler = handler;
                        }
                    },
                    create: function() {}
                };
            }
            if (!hasSocket) {
                window.chrome.socket = {};
            }
            if (!hasRuntime) {
                window.chrome.runtime = {
                    getURL: function() {}
                };
            }
            if (!hasIdentity) {
                window.chrome.identity = {};
            }

            emails = [{
                unread: true
            }, {
                unread: true
            }, {
                unread: true
            }];
            appController._outboxBo = {
                pendingEmails: emails
            };

            origEmailDao = appController._emailDao;
            emailDaoMock = sinon.createStubInstance(EmailDAO);
            appController._emailDao = emailDaoMock;
            emailAddress = 'fred@foo.com';
            emailDaoMock._account = {
                emailAddress: emailAddress,
            };


            keychainMock = sinon.createStubInstance(KeychainDAO);
            emailDaoMock._keychain = keychainMock;

            deviceStorageMock = sinon.createStubInstance(DeviceStorageDAO);
            emailDaoMock._devicestorage = deviceStorageMock;

            angular.module('maillisttest', []);
            mocks.module('maillisttest');
            mocks.inject(function($rootScope, $controller) {
                scope = $rootScope.$new();
                scope.state = {
                    read: {
                        toggle: function() {}
                    }
                };
                ctrl = $controller(MailListCtrl, {
                    $scope: scope
                });
            });
        });

        afterEach(function() {
            if (!hasNotifications) {
                delete window.chrome.notifications;
            }
            if (!hasSocket) {
                delete window.chrome.socket;
            }
            if (!hasRuntime) {
                delete window.chrome.runtime;
            }
            if (!hasChrome) {
                delete window.chrome;
            }
            if (!hasIdentity) {
                delete window.chrome.identity;
            }

            // restore the module
            appController._emailDao = origEmailDao;
        });

        describe('scope variables', function() {
            it('should be set correctly', function() {
                expect(scope.select).to.exist;
                expect(scope.synchronize).to.exist;
                expect(scope.remove).to.exist;
                expect(scope.state.mailList).to.exist;
                // expect(emailDaoMock.onIncomingMessage).to.exist;
            });
        });

        describe('push notification', function() {
            it('should focus mail and not mark it read', function(done) {
                var uid, mail, currentFolder;

                scope._stopWatchTask();

                uid = 123;
                mail = {
                    uid: uid,
                    from: [{
                        address: 'asd'
                    }],
                    subject: '[whiteout] asdasd',
                    unread: true
                };
                currentFolder = 'asd';
                scope.state.nav = {
                    currentFolder: currentFolder
                };
                scope.state.read = {
                    toggle: function() {}
                };
                scope.emails = [mail];
                emailDaoMock.sync.yieldsAsync();
                window.chrome.notifications.create = function(id, opts) {
                    expect(id).to.equal('123');
                    expect(opts.type).to.equal('basic');
                    expect(opts.message).to.equal('asdasd');
                    expect(opts.title).to.equal('asd');
                };

                scope.getBody = function() {
                    done();
                };

                scope.filteredMessages = [{}];
                emailDaoMock.onIncomingMessage(mail);
            });
        });

        describe('clicking push notification', function() {
            it('should focus mail', function() {
                var mail, currentFolder;

                scope._stopWatchTask();

                mail = {
                    uid: 123,
                    from: [{
                        address: 'asd'
                    }],
                    subject: '[whiteout] asdasd',
                    unread: true
                };
                currentFolder = {
                    type: 'asd',
                    messages: [mail]
                };
                scope.state.nav = {
                    currentFolder: currentFolder
                };

                notificationClickedHandler('123');

                expect(scope.state.mailList.selected).to.equal(mail);
            });
        });

        describe('synchronize', function() {
            it('should do imap sync and display mails', function(done) {
                scope._stopWatchTask();

                emailDaoMock.sync.yieldsAsync();

                var currentFolder = {
                    type: 'Inbox',
                    messages: emails
                };
                scope.folders = [currentFolder];
                scope.state.nav = {
                    currentFolder: currentFolder
                };

                scope.synchronize(function() {
                    expect(scope.state.nav.currentFolder.messages).to.deep.equal(emails);
                    expect(scope.state.mailList.selected).to.exist;
                    done();
                });

            });
        });

        describe('getBody', function() {
            it('should get the mail content', function() {
                scope.state.nav = {
                    currentFolder: {
                        type: 'asd',
                    }
                };

                scope.getBody();
                expect(emailDaoMock.getBody.calledOnce).to.be.true;
            });
        });

        describe('select', function() {
            it('should decrypt, focus mark an unread mail as read', function() {
                var mail, synchronizeMock;

                mail = {
                    unread: true
                };
                synchronizeMock = sinon.stub(scope, 'synchronize');
                scope.state = {
                    nav: {
                        currentFolder: {
                            type: 'asd'
                        }
                    },
                    mailList: {},
                    read: {
                        toggle: function() {}
                    }
                };

                scope.select(mail);

                expect(emailDaoMock.decryptBody.calledOnce).to.be.true;
                expect(synchronizeMock.calledOnce).to.be.true;
                expect(scope.state.mailList.selected).to.equal(mail);

                scope.synchronize.restore();
            });

            it('should decrypt and focus a read mail', function() {
                var mail, synchronizeMock;

                mail = {
                    unread: false
                };
                synchronizeMock = sinon.stub(scope, 'synchronize');
                scope.state = {
                    mailList: {},
                    read: {
                        toggle: function() {}
                    },
                    nav: {
                        currentFolder: {
                            type: 'asd'
                        }
                    }
                };

                scope.select(mail);

                expect(emailDaoMock.decryptBody.calledOnce).to.be.true;
                expect(synchronizeMock.called).to.be.false;
                expect(scope.state.mailList.selected).to.equal(mail);

                scope.synchronize.restore();
            });
        });

        describe('remove', function() {
            it('should not delete without a selected mail', function() {
                scope.remove();

                expect(emailDaoMock.sync.called).to.be.false;
            });

            it('should not delete from the outbox', function(done) {
                var currentFolder, mail;

                scope._stopWatchTask();

                scope.account = {};
                mail = {
                    uid: 123,
                    from: [{
                        address: 'asd'
                    }],
                    subject: '[whiteout] asdasd',
                    unread: true
                };
                currentFolder = {
                    type: 'Outbox',
                    path: 'OUTBOX',
                    messages: [mail]
                };

                scope.emails = [mail];
                scope.account.folders = [currentFolder];
                scope.state.nav = {
                    currentFolder: currentFolder
                };

                scope.onError = function(err) {
                    expect(err).to.exist; // would normally display the notification
                    expect(emailDaoMock.sync.called).to.be.false;
                    done();
                };

                scope.remove(mail);

            });

            it('should delete the selected mail', function() {
                var uid, mail, currentFolder;

                scope._stopWatchTask();

                scope.account = {};
                uid = 123;
                mail = {
                    uid: uid,
                    from: [{
                        address: 'asd'
                    }],
                    subject: '[whiteout] asdasd',
                    unread: true
                };
                currentFolder = {
                    type: 'Inbox',
                    path: 'INBOX',
                    messages: [mail]
                };
                scope.account.folders = [currentFolder];
                scope.state.nav = {
                    currentFolder: currentFolder
                };
                emailDaoMock.sync.yields();

                scope.remove(mail);

                expect(emailDaoMock.sync.calledOnce).to.be.true;
                expect(scope.state.mailList.selected).to.not.exist;
            });
        });
    });
});