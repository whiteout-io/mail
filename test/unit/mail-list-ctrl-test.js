define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        MailListCtrl = require('js/controller/mail-list'),
        EmailDAO = require('js/dao/email-dao'),
        DeviceStorageDAO = require('js/dao/devicestorage-dao'),
        KeychainDAO = require('js/dao/keychain-dao'),
        appController = require('js/app-controller'),
        notification = require('js/util/notification');

    chai.Assertion.includeStack = true;

    describe('Mail List controller unit test', function() {
        var scope, ctrl, origEmailDao, emailDaoMock, keychainMock, deviceStorageMock,
            emailAddress, notificationClickedHandler, emails,
            hasChrome, hasSocket, hasRuntime, hasIdentity;

        beforeEach(function() {
            hasChrome = !!window.chrome;
            hasSocket = !!window.chrome.socket;
            hasIdentity = !!window.chrome.identity;
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
            emailDaoMock = sinon.createStubInstance(EmailDAO);
            appController._emailDao = emailDaoMock;
            emailAddress = 'fred@foo.com';
            emailDaoMock._account = {
                emailAddress: emailAddress,
            };


            keychainMock = sinon.createStubInstance(KeychainDAO);
            appController._keychain = keychainMock;

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
        });

        describe('displayMore', function() {
            beforeEach(function() {
                scope.state.nav = {
                    currentFolder: {
                        messages: ['a', 'b']
                    }
                };
            });
            it('should not do anything when display length equals messages length', function() {
                scope.displayMessages = ['a', 'b'];

                scope.displayMore();
                expect(scope.displayMessages.length).to.equal(scope.state.nav.currentFolder.messages.length);
            });
            it('should append next message interval', function() {
                scope.displayMessages = ['a'];

                scope.displayMore();
                expect(scope.displayMessages.length).to.equal(scope.state.nav.currentFolder.messages.length);
            });
        });

        describe('displaySearchResults', function() {
            var clock;

            beforeEach(function() {
                scope.state.nav = {
                    currentFolder: {
                        messages: ['a', 'b']
                    }
                };
                scope.watchMessages();
                scope.watchOnline();
                clock = sinon.useFakeTimers();
            });
            afterEach(function() {
                clock.restore();
            });

            it('should show initial message on empty', function() {
                scope.displaySearchResults();
                expect(scope.searching).to.be.false;
                expect(scope.lastUpdateLbl).to.equal('Online');
                expect(scope.displayMessages.length).to.equal(2);
            });
            it('should show initial message on empty', function() {
                var searchStub = sinon.stub(scope, 'search');
                searchStub.returns(['a']);


                scope.displaySearchResults('query');
                expect(scope.searching).to.be.true;
                expect(scope.lastUpdateLbl).to.equal('Searching ...');
                clock.tick(500);

                expect(scope.displayMessages).to.deep.equal(['a']);
                expect(scope.searching).to.be.false;
                expect(scope.lastUpdateLbl).to.equal('Matches in this folder');

            });
        });

        describe('search', function() {
            var message1 = {
                    to: [{
                        name: 'name1',
                        address: 'address1'
                    }],
                    subject: 'subject1',
                    body: 'body1',
                    html: 'html1'
                },
                message2 = {
                    to: [{
                        name: 'name2',
                        address: 'address2'
                    }],
                    subject: 'subject2',
                    body: 'body2',
                    html: 'html2'
                },
                message3 = {
                    to: [{
                        name: 'name3',
                        address: 'address3'
                    }],
                    subject: 'subject3',
                    body: 'body1',
                    html: 'html1',
                    encrypted: true
                },
                message4 = {
                    to: [{
                        name: 'name4',
                        address: 'address4'
                    }],
                    subject: 'subject4',
                    body: 'body1',
                    html: 'html1',
                    encrypted: true,
                    decrypted: true
                },
                testMessages = [message1, message2, message3, message4];

            it('return same messages array on empty query string', function() {
                var result = scope.search(testMessages, '');
                expect(result).to.equal(testMessages);
            });

            it('return message1 on matching subject', function() {
                var result = scope.search(testMessages, 'subject1');
                expect(result.length).to.equal(1);
                expect(result[0]).to.equal(message1);
            });

            it('return message1 on matching name', function() {
                var result = scope.search(testMessages, 'name1');
                expect(result.length).to.equal(1);
                expect(result[0]).to.equal(message1);
            });

            it('return message1 on matching address', function() {
                var result = scope.search(testMessages, 'address1');
                expect(result.length).to.equal(1);
                expect(result[0]).to.equal(message1);
            });

            it('return plaintext and decrypted messages on matching body', function() {
                var result = scope.search(testMessages, 'body1');
                expect(result.length).to.equal(2);
                expect(result[0]).to.equal(message1);
                expect(result[1]).to.equal(message4);
            });

            it('return plaintext and decrypted messages on matching html', function() {
                var result = scope.search(testMessages, 'html1');
                expect(result.length).to.equal(2);
                expect(result[0]).to.equal(message1);
                expect(result[1]).to.equal(message4);
            });
        });

        describe('scope variables', function() {
            it('should be set correctly', function() {
                expect(scope.select).to.exist;
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

                emailDaoMock.onIncomingMessage([mail]);
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

                emailDaoMock.onIncomingMessage(mails);
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
                var mail = {
                    from: [{
                        address: 'asd'
                    }],
                    unread: true,
                };
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

                keychainMock.refreshKeyForUserId.withArgs(mail.from[0].address).yields();

                scope.select(mail);

                expect(emailDaoMock.decryptBody.calledOnce).to.be.true;
                expect(keychainMock.refreshKeyForUserId.calledOnce).to.be.true;
                expect(scope.state.mailList.selected).to.equal(mail);
            });

            it('should decrypt and focus a read mail', function() {
                var mail = {
                    from: [{
                        address: 'asd'
                    }],
                    unread: false
                };

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

                keychainMock.refreshKeyForUserId.withArgs(mail.from[0].address).yields();

                scope.select(mail);

                expect(emailDaoMock.decryptBody.calledOnce).to.be.true;
                expect(keychainMock.refreshKeyForUserId.calledOnce).to.be.true;
                expect(scope.state.mailList.selected).to.equal(mail);
            });
        });

        describe('remove', function() {
            it('should not delete without a selected mail', function() {
                scope.remove();
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
                emailDaoMock.deleteMessage.yields();

                scope.remove(mail);

                expect(emailDaoMock.deleteMessage.calledOnce).to.be.true;
                expect(scope.state.mailList.selected).to.exist;
            });
        });
    });
});