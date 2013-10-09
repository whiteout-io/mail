define(function(require) {
    'use strict';

    var angular = require('angular'),
        appController = require('js/app-controller'),
        aes = require('cryptoLib/aes-cbc'),
        util = require('cryptoLib/util'),
        str = require('js/app-config').string,
        emailDao;

    //
    // Controller
    //

    var WriteCtrl = function($scope) {
        $scope.signature = str.signature;

        // start the main app controller
        appController.start(function(err) {
            if (err) {
                console.error(err);
                return;
            }

            if (window.chrome && chrome.identity) {
                login('passphrase', function() {
                    emailDao = appController._emailDao;
                });
                return;
            }
        });

        function login(password, callback) {
            appController.fetchOAuthToken(password, function(err) {
                if (err) {
                    console.error(err);
                    return;
                }

                callback();
            });
        }

        // generate key,iv for encryption preview
        var key = util.random(128),
            iv = util.random(128);

        $scope.updatePreview = function() {
            var body = $scope.body;
            // remove generated html from body
            body = parseBody(body);

            // Although this does encrypt live using AES, this is just for show. The plaintext is encrypted seperately before sending the email.
            var plaintext = ($scope.subject) ? $scope.subject + body : body;
            $scope.ciphertextPreview = (plaintext) ? aes.encrypt(plaintext, key, iv) : '';
        };

        $scope.sendEmail = function() {
            var to, body, email;

            // validate recipients
            to = $scope.to.replace(/\s/g, '').split(/[,;]/);
            if (!to || to.length < 1) {
                console.log('Seperate recipients with a comma!');
                return;
            }

            body = $scope.body;
            // remove generated html from body
            body = parseBody(body);

            email = {
                to: [], // list of receivers
                subject: $scope.subject, // Subject line
                body: body // plaintext body
            };
            email.from = [{
                name: '',
                address: emailDao._account.emailAddress
            }];
            to.forEach(function(address) {
                email.to.push({
                    name: '',
                    address: address
                });
            });

            emailDao.smtpSend(email, function(err) {
                if (err) {
                    console.log(err);
                    return;
                }

                if (window.chrome && chrome.app.window) {
                    // close the chrome window
                    chrome.app.window.current().close();
                    return;
                }
            });
        };
    };

    function parseBody(body) {
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

        return body;
    }

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