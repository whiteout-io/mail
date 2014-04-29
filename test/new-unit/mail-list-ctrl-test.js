define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        MailListCtrl = require('js/controller/mail-list'),
        EmailDAO = require('js/dao/email-dao'),
        EmailSync = require('js/dao/email-sync'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        KeychainDAO = require('js/dao/keychain-dao'),
        appController = require('js/app-controller'),
        notification = require('js/util/notification');

    chai.Assertion.includeStack = true;

    describe('Mail List controller unit test', function() {
        var scope, ctrl, origEmailDao, origEmailSync, emailDaoMock, emailSyncMock, keychainMock, deviceStorageMock,
            emailAddress, notificationClickedHandler, emails,
            hasChrome, hasSocket, hasRuntime, hasIdentity;

        beforeEach(function() {
            hasChrome = !! window.chrome;
            hasSocket = !! window.chrome.socket;
            hasIdentity = !! window.chrome.identity;
            if (!hasChrome) {
                window.chrome = {};
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

            sinon.stub(notification, 'setOnClickedListener', function(func) {
                notificationClickedHandler = func;
            });

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
            origEmailSync = appController._emailSync;
            emailDaoMock = sinon.createStubInstance(EmailDAO);
            emailSyncMock = sinon.createStubInstance(EmailSync);
            appController._emailDao = emailDaoMock;
            appController._emailSync = emailSyncMock;
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

                scope.loadVisibleBodies = function() {};
                ctrl = $controller(MailListCtrl, {
                    $scope: scope
                });
            });
        });

        afterEach(function() {
            notification.setOnClickedListener.restore();

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
            appController._emailSync = origEmailDao;
        });

        describe('scope variables', function() {
            it('should be set correctly', function() {
                expect(scope.select).to.exist;
                expect(scope.synchronize).to.exist;
                expect(scope.remove).to.exist;
                expect(scope.state.mailList).to.exist;
            });
        });

        describe('push notification', function() {
            beforeEach(function() {
                scope._stopWatchTask();
            });

            it('should succeed for single mail', function(done) {
                var mail = {
                    uid: 123,
                    from: [{
                        address: 'asd'
                    }],
                    subject: 'this is the subject!',
                    unread: true
                };

                sinon.stub(notification, 'create', function(opts) {
                    expect(opts.id).to.equal('' + mail.uid);
                    expect(opts.title).to.equal(mail.from[0].address);
                    expect(opts.message).to.equal(mail.subject);

                    notification.create.restore();
                    done();
                });

                emailSyncMock.onIncomingMessage([mail]);
            });

            it('should succeed for multiple mails', function(done) {
                var mails = [{
                    uid: 1,
                    from: [{
                        address: 'asd'
                    }],
                    subject: 'this is the subject!',
                    unread: true
                }, {
                    uid: 2,
                    from: [{
                        address: 'qwe'
                    }],
                    subject: 'this is the other subject!',
                    unread: true
                }, {
                    uid: 3,
                    from: [{
                        address: 'qwe'
                    }],
                    subject: 'this is the other subject!',
                    unread: false
                }];

                sinon.stub(notification, 'create', function(opts) {
                    expect(opts.id).to.equal('' + mails[0].uid);
                    expect(opts.title).to.equal('2 new messages');
                    expect(opts.message).to.equal(mails[0].subject + '\n' + mails[1].subject);

                    notification.create.restore();
                    done();
                });

                emailSyncMock.onIncomingMessage(mails);
            });

            it('should focus mail when clicked', function() {
                var mail = {
                    uid: 123,
                    from: [{
                        address: 'asd'
                    }],
                    subject: 'asdasd',
                    unread: true
                };

                scope.state.nav = {
                    currentFolder: {
                        type: 'asd',
                        messages: [mail]
                    }
                };

                notificationClickedHandler('123');
                expect(scope.state.mailList.selected).to.equal(mail);
            });

            it('should not change focus mail when popup id is NaN', function() {
                scope.state.nav = {
                    currentFolder: {
                        type: 'asd',
                        messages: []
                    }
                };
                var focus = scope.state.mailList.selected = {};

                notificationClickedHandler('');
                expect(scope.state.mailList.selected).to.equal(focus);
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

                var loadVisibleBodiesStub = sinon.stub(scope, 'loadVisibleBodies', function() {
                    expect(scope.state.nav.currentFolder.messages).to.deep.equal(emails);
                    expect(loadVisibleBodiesStub.calledOnce).to.be.true;
                    loadVisibleBodiesStub.restore();

                    done();
                });

                scope.synchronize();
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