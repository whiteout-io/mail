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

            '\nBut I must explain to you how all this mistaken idea of denouncing pleasure and praising pain was born and I will give you a complete account of the system, and expound the actual teachings of the great explorer of the truth, the master-builder of human happiness. No one rejects, dislikes, or avoids pleasure itself, because it is pleasure, but because those who do not know how to pursue pleasure rationally encounter consequences that are extremely painful. Nor again is there anyone who loves or pursues or desires to obtain pain of itself, because it is pain, but because occasionally circumstances occur in which toil and pain can procure him some great pleasure. To take a trivial example, which of us ever undertakes laborious physical exercise, except to obtain some advantage from it? But who has any right to find fault with a man who chooses to enjoy a pleasure that has no annoying consequences, or one who avoids a pain that produces no resultant pleasure?\n' +

            '\nOn the other hand, we denounce with righteous indignation and dislike men who are so beguiled and demoralized by the charms of pleasure of the moment, so blinded by desire, that they cannot foresee the pain and trouble that are bound to ensue; and equal blame belongs to those who fail in their duty through weakness of will, which is the same as saying through shrinking from toil and pain. These cases are perfectly simple and easy to distinguish. In a free hour, when our power of choice is untrammelled and when nothing prevents our being able to do what we like best, every pleasure is to be welcomed and every pain avoided. But in certain circumstances and owing to the claims of duty or the obligations of business it will frequently occur that pleasures have to be repudiated and annoyances accepted. The wise man therefore always holds in these matters to this principle of selection: he rejects pleasures to secure other greater pleasures, or else he endures pains to avoid worse pains.\n' +

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
        //this.html = '<!DOCTYPE html><html><head></head><body><h1 style="border: 1px solid red; width: 500px;">Hello there' + Math.random() + '</h1></body></html>';
        this.encrypted = true;
        this.decrypted = true;
    };

    var dummies = [],
        i = 100;
    while (i--) {
        // every second/third/fourth dummy mail with unread/attachments/answered
        dummies.push(new Email((i % 2 === 0), (i % 3 === 0), (i % 5 === 0)));
    }

    return dummies;
};