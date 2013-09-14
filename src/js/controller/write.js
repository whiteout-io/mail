define(function(require) {
    'use strict';

    var angular = require('angular'),
        aes = require('cryptoLib/aes-cbc'),
        util = require('cryptoLib/util'),
        str = require('js/app-config').string;

    //
    // Controller
    //

    var WriteCtrl = function($scope) {
        $scope.signature = str.signature;

        // generate key,iv for encryption preview
        var key = util.random(128),
            iv = util.random(128);

        $scope.updatePreview = function() {
            // remove generated html from body
            var body = $scope.body;

            function has(substr) {
                return (body.indexOf(substr) !== -1);
            }
            while (has('<div>')) {
                body = body.replace('<div>', '\n');
            }
            while (has('<br>')) {
                body = body.replace('<br>', '\n');
            }
            while (has('</div>')) {
                body = body.replace('</div>', '');
            }
            // Although this does encrypt live using AES, this is just for show. The plaintext is encrypted seperately using before sending the email.
            var plaintext = ($scope.subject) ? $scope.subject + body : body;
            $scope.ciphertextPreview = aes.encrypt(plaintext, key, iv);
        };
    };

    //
    // Directives
    //

    var ngModule = angular.module('write', []);
    ngModule.directive('contenteditable', function() {
        return {
            require: 'ngModel',
            link: function(scope, elm, attrs, ctrl) {
                // view -> model
                elm.on('keyup', function() {
                    scope.$apply(function() {
                        ctrl.$setViewValue(elm.html());
                    });
                });

                // model -> view
                ctrl.$render = function(value) {
                    elm.html(value);
                };

                // load init value from DOM
                ctrl.$setViewValue(elm.html());
            }
        };
    });
    ngModule.directive('focusMe', function($timeout) {
        return {
            link: function(scope, element) {
                $timeout(function() {
                    element[0].focus();
                });
            }
        };
    });

    return WriteCtrl;
});