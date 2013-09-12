define(function() {
    'use strict';

    var dummyText = 'Hi Max,\nLorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.\nFrank',
        signature = 'Sent securely from whiteout mail';

    var WriteCtrl = function($scope) {
        $scope.bodyPlaintextParts = dummyText.split('\n');
        $scope.bodyCiphertext = btoa(dummyText);
        $scope.signature = signature;
    };

    return WriteCtrl;
});