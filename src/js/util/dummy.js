'use strict';

var ngModule = angular.module('woUtil');
ngModule.service('dummy', Dummy);
module.exports = Dummy;

function Dummy() {}

Dummy.prototype.listFolders = function() {
    var dummies = [{
        type: 'Inbox',
        count: 2,
        path: 'INBOX',
        wellknown: true
    }, {
        type: 'Sent',
        count: 0,
        path: 'SENT',
        wellknown: true
    }, {
        type: 'Outbox',
        count: 0,
        path: 'OUTBOX',
        wellknown: true
    }, {
        type: 'Drafts',
        count: 0,
        path: 'DRAFTS',
        wellknown: true
    }, {
        type: 'Trash',
        count: 0,
        path: 'TRASH',
        wellknown: true
    }, {
        type: 'Flagged',
        count: 0,
        path: 'FLAGGED',
        wellknown: true
    }, {
        name: 'Archive',
        count: 0,
        path: 'ARCHIVE'
    }, {
        name: 'Junk',
        count: 0,
        path: 'JUNK'
    }, {
        name: 'Foo',
        count: 0,
        path: 'FOO'
    }, {
        name: 'Snafu',
        count: 0,
        path: 'SNAFU'
    }, {
        name: 'Tralalalala',
        count: 0,
        path: 'TRALALALALA'
    }, {
        name: 'Another one',
        count: 0,
        path: 'ANOTHERONE'
    }, {
        name: 'Mucho Folder',
        count: 0,
        path: 'MUCHOFOLDER'

    }];

    return dummies;
};

Dummy.prototype.listMails = function() {
    var uid = 1000000;

    var Email = function(unread, attachments, answered) {
        this.uid = uid--;
        this.from = [{
            name: 'Whiteout Support',
            address: 'support@whiteout.io'
        }]; // sender address
        this.to = [{
            address: 'max.musterman@gmail.com'
        }, {
            address: 'max.musterman@gmail.com'
        }]; // list of receivers
        this.cc = [{
            address: 'john.doe@gmail.com'
        }]; // list of receivers
        this.attachments = attachments ? [{
            "filename": "a.md",
            "filesize": 123,
            "mimeType": "text/x-markdown",
            "part": "2",
            "content": null
        }, {
            "filename": "b.md",
            "filesize": 456,
            "mimeType": "text/x-markdown",
            "part": "3",
            "content": null
        }, {
            "filename": "c.md",
            "filesize": 789,
            "mimeType": "text/x-markdown",
            "part": "4",
            "content": null
        }] : [];
        this.unread = unread;
        this.answered = answered;
        this.sentDate = new Date('Thu Sep 19 2013 20:41:23 GMT+0200 (CEST)');
        this.subject = 'Getting started'; // Subject line
        this.body = 'And a good day to you too sir. \n' +
            '\n' +
            'Thursday, Apr 24, 2014 3:33 PM safewithme.testuser@gmail.com wrote:\n' +
            '> adsfadfasdfasdfasfdasdfasdfas\n' +
            '\n' +
            'http://example.com\n' +
            '\n' +
            '> Tuesday, Mar 25, 2014 4:19 PM gianniarcore@gmail.com wrote:\n' +
            '>> from 0.7.0.1\n' +
            '>>\n' +
            '>> God speed!'; // plaintext body
        //this.html = '<!DOCTYPE html><html><head></head><body><h1 style="border: 1px solid red; width: 500px; margin:0;">Hello there' + Math.random() + '</h1></body></html>';
        this.encrypted = true;
        this.decrypted = true;
        this.signed = true;
        this.signaturesValid = true;
    };

    var dummies = [],
        i = 100;
    while (i--) {
        // every second/third/fourth dummy mail with unread/attachments/answered
        dummies.push(new Email((i % 2 === 0), (i % 3 === 0), (i % 5 === 0)));
    }

    return dummies;
};