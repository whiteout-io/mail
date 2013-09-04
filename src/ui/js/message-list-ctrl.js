'use strict';

var Email = function(unread) {
    this.from = [{
        name: 'Whiteout Support',
        address: 'support@whiteout.io'
    }]; // sender address
    this.to = [{
        address: 'max.musterman@gmail.com'
    }]; // list of receivers
    this.unread = unread;
    this.sentDate = '7:23 PM';
    this.subject = "Welcome Max"; // Subject line
    this.body = "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy."; // plaintext body
};

function MessageListCtrl($scope) {
    $scope.folderName = 'Inbox';
    $scope.emails = [new Email(true), new Email(true), new Email(false), new Email(false), new Email(false), new Email(false)];

    $scope.select = function(email) {
        $scope.selected = email;
    };
}