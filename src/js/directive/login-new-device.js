'use strict';

var ngModule = angular.module('woDirectives');

ngModule.directive('fileReader', function() {
    return function(scope, elm) {
        elm.bind('change', function(e) {
            var files = e.target.files,
                reader = new FileReader();

            if (files.length === 0) {
                return;
            }

            reader.onload = function(e) {
                var rawKeys = e.target.result,
                    index = rawKeys.indexOf('-----BEGIN PGP PRIVATE KEY BLOCK-----'),
                    keyParts;

                if (index === -1) {
                    return;
                }

                keyParts = {
                    publicKeyArmored: rawKeys.substring(0, index).trim(),
                    privateKeyArmored: rawKeys.substring(index, rawKeys.length).trim()
                };

                scope.$apply(function() {
                    scope.key = keyParts;
                });
            };
            reader.readAsText(files[0]);
        });
    };
});