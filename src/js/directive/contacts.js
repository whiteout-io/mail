'use strict';

var ngModule = angular.module('woDirectives');

ngModule.directive('keyfileInput', function() {
    return function(scope, elm) {
        elm.on('change', function(e) {
            for (var i = 0; i < e.target.files.length; i++) {
                importKey(e.target.files.item(i));
            }
            elm.val(null);  // clear input
        });

        function importKey(file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                scope.importKey(e.target.result);
            };
            reader.readAsText(file);
        }
    };
});