'use strict';

var loremText = "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy.";

var dummyMail1 = {
    from: [{
        name: 'Whiteout Support',
        address: 'support@whiteout.io'
    }], // sender address
    to: [{
        address: 'max.musterman@gmail.com'
    }], // list of receivers
    unread: true,
    sentDate: '7:23 PM',
    subject: "Welcome Max", // Subject line
    body: loremText // plaintext body
};
var dummyMail2 = {
    from: [{
        name: 'Test User',
        address: 'support@whiteout.io'
    }], // sender address
    to: [{
        address: 'max.musterman@gmail.com'
    }], // list of receivers
    unread: true,
    sentDate: '7:23 PM',
    subject: "Welcome Max", // Subject line
    body: loremText // plaintext body
};
var dummyMail3 = {
    from: [{
        name: 'Test User',
        address: 'support@whiteout.io'
    }], // sender address
    to: [{
        address: 'max.musterman@gmail.com'
    }], // list of receivers
    unread: false,
    sentDate: '7:23 PM',
    subject: "Welcome Max", // Subject line
    body: loremText // plaintext body
};

function MessageListCtrl($scope) {
    $scope.emails = [dummyMail1, dummyMail2, dummyMail3];

    $scope.select = function(email) {
        $scope.selected = email;
    };
}