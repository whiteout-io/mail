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
            // Although this does encrypt live using AES, this is just for show. The plaintext is encrypted seperately using before sending the email.
            $scope.ciphertextPreview = aes.encrypt($scope.subject + $scope.body, key, iv);
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