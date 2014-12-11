'use strict';

var ngModule = angular.module('woDirectives');

ngModule.directive('focusInput', function($timeout, $parse) {
    return {
        //scope: true,   // optionally create a child scope
        link: function(scope, element, attrs) {
            var model = $parse(attrs.focusInput);
            scope.$watch(model, function(value) {
                if (value === true) {
                    $timeout(function() {
                        element.find('input').first().focus();
                    }, 100);
                }
            });
        }
    };
});

ngModule.directive('focusInputOnClick', function() {
    return {
        //scope: true,   // optionally create a child scope
        link: function(scope, element) {
            element.on('click', function() {
                element.find('input').first().focus();
            });
        }
    };
});

ngModule.directive('attachmentInput', function() {
    return function(scope, elm) {
        elm.on('change', function(e) {
            for (var i = 0; i < e.target.files.length; i++) {
                addAttachment(e.target.files.item(i));
            }
        });

        function addAttachment(file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                scope.attachments.push({
                    filename: file.name,
                    mimeType: file.type,
                    content: new Uint8Array(e.target.result)
                });
                scope.$digest();
            };
            reader.readAsArrayBuffer(file);
        }
    };
});