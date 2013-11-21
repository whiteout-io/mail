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
                scope.state = {};
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
                expect(emailDaoMock.onIncomingMessage).to.exist;
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
                emailDaoMock.imapMarkMessageRead.withArgs({
                    folder: currentFolder,
                    uid: uid
                }).yields();
                emailDaoMock.unreadMessages.yieldsAsync(null, 10);
                emailDaoMock.imapSync.yieldsAsync();
                emailDaoMock.listMessages.yieldsAsync(null, [mail]);
                window.chrome.notifications.create = function(id, opts) {
                    expect(id).to.equal('123');
                    expect(opts.type).to.equal('basic');
                    expect(opts.message).to.equal('asdasd');
                    expect(opts.title).to.equal('asd');
                    expect(emailDaoMock.imapMarkMessageRead.callCount).to.equal(0);
                    done();
                };

                emailDaoMock.onIncomingMessage(mail);
            });
        });

        describe('clicking push notification', function() {
            it('should focus mail and mark it read', function() {
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
                emailDaoMock.imapMarkMessageRead.withArgs({
                    folder: currentFolder,
                    uid: uid
                }).yields();

                notificationClickedHandler('123'); // first select, irrelevant
                notificationClickedHandler('123');

                expect(scope.state.mailList.selected).to.equal(mail);
                expect(emailDaoMock.imapMarkMessageRead.callCount).to.be.at.least(1);
            });
        });

        describe('watch task', function() {
            it('should do a local list and a full imap sync and mark the first message read', function(done) {
                emailDaoMock.unreadMessages.yields(null, 3);
                emailDaoMock.imapSync.yields();
                emailDaoMock.listMessages.yieldsAsync(null, emails);
                
                scope.state.read = {
                    toggle: function() {}
                };

                var currentFolder = {
                    type: 'Inbox'
                };
                scope.folders = [currentFolder];
                scope.state.nav = {
                    currentFolder: currentFolder
                };

                // the behavior should be async and imapMarkMessageRead is
                emailDaoMock.imapMarkMessageRead = function() {
                    expect(scope.emails).to.deep.equal(emails);
                    expect(scope.state.mailList.selected).to.equal(emails[0]);
                    expect(emailDaoMock.unreadMessages.callCount).to.equal(2);
                    expect(emailDaoMock.imapSync.callCount).to.equal(2);
                    expect(emailDaoMock.listMessages.callCount).to.equal(3);

                    done();
                };

                scope.synchronize();
            });
        });

        describe('synchronize', function() {
            it('should read directly from outbox instead of doing a full imap sync', function() {
                scope._stopWatchTask();

                var currentFolder = {
                    type: 'Outbox'
                };
                scope.folders = [currentFolder];
                scope.state.nav = {
                    currentFolder: currentFolder
                };

                scope.synchronize();

                expect(scope.state.mailList.selected).to.equal(emails[0]);
            });
        });

        describe('remove', function() {
            it('should not delete without a selected mail', function() {
                scope.remove();

                expect(emailDaoMock.imapDeleteMessage.called).to.be.false;
            });

            it('should not delete from the outbox', function(done) {
                var currentFolder, mail;

                scope._stopWatchTask();

                mail = {};
                currentFolder = {
                    type: 'Outbox'
                };
                scope.emails = [mail];
                scope.folders = [currentFolder];
                scope.state.nav = {
                    currentFolder: currentFolder
                };

                scope.onError = function(err) {
                    expect(err).to.exist; // would normally display the notification
                    expect(emailDaoMock.imapDeleteMessage.called).to.be.false;
                    done();
                };

                scope.remove(mail);

            });

            it('should delete the selected mail from trash folder after clicking ok', function() {
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
                scope.emails = [mail];
                currentFolder = {
                    type: 'Trash'
                };
                scope.folders = [currentFolder];
                scope.state.nav = {
                    currentFolder: currentFolder
                };
                emailDaoMock.imapDeleteMessage.yields();

                scope.remove(mail);
                scope.state.dialog.callback(true);

                expect(emailDaoMock.imapDeleteMessage.calledOnce).to.be.true;
                expect(scope.state.mailList.selected).to.not.exist;
            });

            it('should move the selected mail to the trash folder', function() {
                var uid, mail, currentFolder, trashFolder;

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
                scope.emails = [mail];
                currentFolder = {
                    type: 'Inbox',
                    path: 'INBOX'
                };
                trashFolder = {
                    type: 'Trash',
                    path: 'TRASH'
                };
                scope.folders = [currentFolder, trashFolder];
                scope.state.nav = {
                    currentFolder: currentFolder
                };
                emailDaoMock.imapMoveMessage.withArgs({
                    folder: currentFolder,
                    uid: uid,
                    destination: trashFolder.path
                }).yields();

                scope.remove(mail);

                expect(emailDaoMock.imapMoveMessage.calledOnce).to.be.true;
                expect(scope.state.mailList.selected).to.not.exist;
            });
        });
    });
});