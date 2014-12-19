'use strict';

var MailListCtrl = require('../../../../src/js/controller/app/mail-list'),
    EmailDAO = require('../../../../src/js/email/email'),
    KeychainDAO = require('../../../../src/js/service/keychain'),
    Status = require('../../../../src/js/util/status'),
    Dialog = require('../../../../src/js/util/dialog'),
    Search = require('../../../../src/js/email/search');

describe('Mail List controller unit test', function() {
    var scope, ctrl, statusMock, notificationMock, emailMock, keychainMock, dialogMock, searchMock,
        emailAddress, emails, location;

    beforeEach(function() {
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

        statusMock = sinon.createStubInstance(Status);
        emailMock = sinon.createStubInstance(EmailDAO);
        keychainMock = sinon.createStubInstance(KeychainDAO);
        dialogMock = sinon.createStubInstance(Dialog);
        searchMock = sinon.createStubInstance(Search);

        angular.module('maillisttest', ['woEmail', 'woServices', 'woUtil']);
        angular.mock.module('maillisttest');
        angular.mock.inject(function($rootScope, $controller, $location) {
            scope = $rootScope.$new();
            location = $location;
            scope.state = {};

            scope.loadVisibleBodies = function() {};
            ctrl = $controller(MailListCtrl, {
                $scope: scope,
                $location: location,
                $q: window.qMock,
                status: statusMock,
                notification: notificationMock,
                email: emailMock,
                keychain: keychainMock,
                dialog: dialogMock,
                search: searchMock
            });
        });
    });

    afterEach(function() {});

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
            expect(statusMock.setSearching.withArgs(false).calledOnce).to.be.true;
            expect(statusMock.update.withArgs('Online').calledOnce).to.be.true;
            expect(scope.displayMessages.length).to.equal(2);
        });
        it('should show initial message on empty', function() {
            searchMock.filter.returns(['a']);

            scope.displaySearchResults('query');
            expect(statusMock.setSearching.withArgs(true).calledOnce).to.be.true;
            expect(statusMock.update.withArgs('Searching ...').calledOnce).to.be.true;
            clock.tick(500);

            expect(scope.displayMessages).to.deep.equal(['a']);
            expect(statusMock.setSearching.withArgs(false).calledOnce).to.be.true;
            expect(statusMock.update.withArgs('Matches in this folder').calledOnce).to.be.true;
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
            sinon.stub(scope, 'navigate');
        });

        afterEach(function() {
            notificationMock.create.restore();
            scope.navigate.restore();
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
                expect(scope.navigate.withArgs(mail).calledOnce).to.be.true;
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
                expect(scope.navigate.withArgs(mails[0]).calledOnce).to.be.true;
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
        it('should get the mail content', function(done) {
            scope.state.nav = {
                currentFolder: {
                    type: 'asd',
                }
            };

            scope.getBody().then(function() {
                expect(emailMock.getBody.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('flag', function() {
        it('should flag or unflag a message', function() {
            var mail = {
                from: [{
                    address: 'asd'
                }],
                flagged: true,
            };

            scope.state = {
                actionBar: {
                    flagMessage: function(mail, flagged) {
                        mail.flagged = flagged;
                    }
                }
            };

            scope.flag(mail, false);
            expect(mail.flagged).to.be.false;

            scope.flag(mail, true);
            expect(mail.flagged).to.be.true;
        });
    });

    describe('select', function() {
        it('should decrypt, focus mark an unread mail as read', function(done) {
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
            }).returns(resolves());

            scope.select(mail).then(function() {
                expect(emailMock.decryptBody.calledOnce).to.be.true;
                expect(keychainMock.refreshKeyForUserId.calledOnce).to.be.true;
                expect(scope.state.mailList.selected).to.equal(mail);
                expect(notificationMock.close.calledWith('asd')).to.be.true;
                expect(notificationMock.close.calledOnce).to.be.true;

                notificationMock.close.restore();
                done();
            });
        });

        it('should decrypt and focus a read mail', function(done) {
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
            }).returns(resolves());

            scope.select(mail).then(function() {
                expect(emailMock.decryptBody.calledOnce).to.be.true;
                expect(keychainMock.refreshKeyForUserId.calledOnce).to.be.true;
                expect(scope.state.mailList.selected).to.equal(mail);
                done();
            });
        });
    });

    describe('formatDate', function() {
        it('should output short time if date is today', angular.mock.inject(function($filter) {
            var now = new Date();
            var expected = $filter('date')(now, 'shortTime');
            expect(scope.formatDate(now)).to.equal(expected);
        }));
        it('should output date only if date is not today', angular.mock.inject(function($filter) {
            var yesterday = new Date();
            yesterday.setTime(yesterday.getTime() - 24 * 60 * 60 * 1000);

            var expected = $filter('date')(yesterday, 'mediumDate');
            expect(scope.formatDate(yesterday)).to.equal(expected);
        }));
    });
});