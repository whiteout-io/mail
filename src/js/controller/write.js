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

    var WriteCtrl = function($scope, $filter) {
        $scope.signature = str.signature;
        emailDao = appController._emailDao;

        //
        // Init
        //

        $scope.$watch('writerOpen', function() {
            resetFields();
            if ($scope.writerReply) {
                fillFields($scope.selected);
                $scope.updatePreview();
            }
        });

        function resetFields() {
            $scope.writerTitle = 'New email';
            $scope.to = undefined;
            $scope.subject = undefined;
            if ($scope.$$childTail) {
                $scope.$$childTail.body = '';
            }
            $scope.ciphertextPreview = undefined;
        }

        function fillFields(re) {
            var from, body, bodyRows;

            if (!re) {
                return;
            }

            $scope.writerTitle = 'Reply';
            // fill recipient field
            $scope.to = re.from[0].address;
            // fill subject
            $scope.subject = 'Re: ' + ((re.subject) ? re.subject.replace('Re: ', '') : '');

            // fill text body
            from = re.from[0].name || re.from[0].address;
            body = '<br><br>' + $filter('date')(re.sentDate, 'EEEE, MMM d, yyyy h:mm a') + ' ' + from + ' wrote:';
            bodyRows = re.body.split('\n');
            bodyRows.forEach(function(row) {
                body += (!re.html) ? '<br>' + row : '';
            });
            $scope.$$childTail.body = body;
        }

        //
        // Editing
        //

        // generate key,iv for encryption preview
        var key = util.random(128),
            iv = util.random(128);

        $scope.updatePreview = function() {
            var body = $scope.$$childTail.body;
            // remove generated html from body
            body = parseBody(body);

            // Although this does encrypt live using AES, this is just for show. The plaintext is encrypted seperately before sending the email.
            $scope.ciphertextPreview = (body) ? aes.encrypt(body, key, iv) : '';
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
                elm.on('keyup keydown', function() {
                    scope.$apply(function() {
                        ctrl.$setViewValue(elm.html());
                    });
                });

                // model -> view
                ctrl.$render = function() {
                    elm.html(ctrl.$viewValue);
                };

                // load init value from DOM
                ctrl.$setViewValue(elm.html());
            }
        };
    });

    ngModule.directive('focusMe', function($timeout, $parse) {
        return {
            //scope: true,   // optionally create a child scope
            link: function(scope, element, attrs) {
                var model = $parse(attrs.focusMe);
                scope.$watch(model, function(value) {
                    if (value === true) {
                        $timeout(function() {
                            element[0].focus();
                        });
                    }
                });
                // set attribute value to 'false' on blur event:
                element.bind('blur', function() {
                    scope.$apply(model.assign(scope, false));
                });
            }
        };
    });

    return WriteCtrl;
});