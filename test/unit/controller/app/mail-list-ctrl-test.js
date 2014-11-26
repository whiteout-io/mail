'use strict';

var MailListCtrl = require('../../../../src/js/controller/app/mail-list'),
    EmailDAO = require('../../../../src/js/email/email'),
    KeychainDAO = require('../../../../src/js/service/keychain'),
    StatusDisplay = require('../../../../src/js/util/status-display'),
    Dialog = require('../../../../src/js/util/dialog'),
    Search = require('../../../../src/js/email/search');

describe('Mail List controller unit test', function() {
    var scope, ctrl, statusDisplayMock, notificationMock, emailMock, keychainMock, dialogMock, searchMock,
        emailAddress, emails,
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

        emails = [{
            unread: true
        }, {
            unread: true
        }, {
            unread: true
        }];

        emailAddress = 'fred@foo.com';

        notificationMock = {
            create: function() {},
            close: function() {}
        };

        statusDisplayMock = sinon.createStubInstance(StatusDisplay);
        emailMock = sinon.createStubInstance(EmailDAO);
        keychainMock = sinon.createStubInstance(KeychainDAO);
        dialogMock = sinon.createStubInstance(Dialog);
        searchMock = sinon.createStubInstance(Search);

        angular.module('maillisttest', ['woEmail', 'woServices', 'woUtil']);
        angular.mock.module('maillisttest');
        angular.mock.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {
                read: {
                    toggle: function() {}
                }
            };

            scope.loadVisibleBodies = function() {};
            ctrl = $controller(MailListCtrl, {
                $scope: scope,
                $routeParams: {},
                statusDisplay: statusDisplayMock,
                notification: notificationMock,
                email: emailMock,
                keychain: keychainMock,
                dialog: dialogMock,
                search: searchMock
            });
        });
    });

    afterEach(function() {
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
            expect(statusDisplayMock.setSearching.withArgs(false).calledOnce).to.be.true;
            expect(statusDisplayMock.update.withArgs('Online').calledOnce).to.be.true;
            expect(scope.displayMessages.length).to.equal(2);
        });
        it('should show initial message on empty', function() {
            searchMock.filter.returns(['a']);

            scope.displaySearchResults('query');
            expect(statusDisplayMock.setSearching.withArgs(true).calledOnce).to.be.true;
            expect(statusDisplayMock.update.withArgs('Searching ...').calledOnce).to.be.true;
            clock.tick(500);

            expect(scope.displayMessages).to.deep.equal(['a']);
            expect(statusDisplayMock.setSearching.withArgs(false).calledOnce).to.be.true;
            expect(statusDisplayMock.update.withArgs('Matches in this folder').calledOnce).to.be.true;
        });
    });

    describe('scope variables', function() {
        it('should be set correctly', function() {
            expect(scope.select).to.exist;
            expect(scope.state.mailList).to.exist;
        });
    });

    describe('push notification', function() {
        beforeEach(function() {
            scope._stopWatchTask();
        });

        afterEach(function() {
            notificationMock.create.restore();
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

            sinon.stub(notificationMock, 'create', function(opts) {
                expect(opts.title).to.equal(mail.from[0].address);
                expect(opts.message).to.equal(mail.subject);

                opts.onClick();
                expect(scope.state.mailList.selected).to.equal(mail);
                done();
            });

            scope.state.nav = {
                currentFolder: {
                    type: 'asd',
                    messages: [mail]
                }
            };

            emailMock.onIncomingMessage([mail]);
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

            sinon.stub(notificationMock, 'create', function(opts) {
                expect(opts.title).to.equal('2 new messages');
                expect(opts.message).to.equal(mails[0].subject + '\n' + mails[1].subject);

                opts.onClick();
                expect(scope.state.mailList.selected).to.equal(mails[0]);
                done();
            });

            scope.state.nav = {
                currentFolder: {
                    type: 'asd',
                    messages: mails
                }
            };

            emailMock.onIncomingMessage(mails);
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
            expect(emailMock.getBody.calledOnce).to.be.true;
        });
    });

    describe('select', function() {
        it('should decrypt, focus mark an unread mail as read', function() {
            scope.pendingNotifications = ['asd'];
            sinon.stub(notificationMock, 'close');

            var mail = {
                from: [{
                    address: 'asd'
                }],
                unread: true,
            };
            scope.state = {
                nav: {
                    currentFolder: {
                        type: 'Inbox'
                    }
                },
                mailList: {},
                read: {
                    toggle: function() {}
                },
                actionBar: {
                    markMessage: function() {}
                }
            };

            keychainMock.refreshKeyForUserId.withArgs({
                userId: mail.from[0].address
            }).yields();

            scope.select(mail);

            expect(emailMock.decryptBody.calledOnce).to.be.true;
            expect(keychainMock.refreshKeyForUserId.calledOnce).to.be.true;
            expect(scope.state.mailList.selected).to.equal(mail);
            expect(notificationMock.close.calledWith('asd')).to.be.true;
            expect(notificationMock.close.calledOnce).to.be.true;

            notificationMock.close.restore();
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

            keychainMock.refreshKeyForUserId.withArgs({
                userId: mail.from[0].address
            }).yields();

            scope.select(mail);

            expect(emailMock.decryptBody.calledOnce).to.be.true;
            expect(keychainMock.refreshKeyForUserId.calledOnce).to.be.true;
            expect(scope.state.mailList.selected).to.equal(mail);
        });
    });
});