define(function(require) {
    'use strict';

    var angular = require('angular'),
        appController = require('js/app-controller'),
        aes = require('cryptoLib/aes-cbc'),
        util = require('cryptoLib/util'),
        emailDao;

    //
    // Controller
    //

    var WriteCtrl = function($scope, $filter) {
        emailDao = appController._emailDao;

        //
        // Init
        //

        $scope.state.writer = {
            open: false,
            write: function(replyTo) {
                this.open = true;
                $scope.replyTo = replyTo;

                resetFields();

                // fill fields depending on replyTo
                fillFields(replyTo);
                $scope.updatePreview();

                $scope.verifyTo();
            },
            close: function() {
                this.open = false;
            }
        };

        function resetFields() {
            $scope.writerTitle = 'New email';
            $scope.to = '';
            $scope.subject = '';
            $scope.body = '';
            $scope.ciphertextPreview = '';
        }

        function fillFields(re) {
            var from, body;

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
            body = '\n\n' + $filter('date')(re.sentDate, 'EEEE, MMM d, yyyy h:mm a') + ' ' + from + ' wrote:\n> ';

            // only display non html mails in reply part
            if (!re.html) {
                body += re.body.split('\n').join('\n> ');
                $scope.body = body;
            }
        }

        //
        // Editing headers
        //

        $scope.verifyTo = function() {
            if (!$scope.to) {
                resetDisplay();
                return;
            }

            // set display to insecure while fetching keys
            $scope.toKey = undefined;
            displayInsecure();
            // check if to address is contained in known public keys
            emailDao._keychain.getReceiverPublicKey($scope.to, function(err, key) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                // compare again since model could have changed during the roundtrip
                if (key && key.userId === $scope.to) {
                    $scope.toKey = key;
                    displaySecure();
                    $scope.$apply();
                }
            });
        };

        function resetDisplay() {
            $scope.toSecure = undefined;
            $scope.sendBtnText = undefined;
        }

        function displaySecure() {
            $scope.toSecure = true;
            $scope.sendBtnText = 'Send securely';
        }

        function displayInsecure() {
            $scope.toSecure = false;
            $scope.sendBtnText = 'Invite & send securely';
        }

        //
        // Editing email body
        //

        // generate key,iv for encryption preview
        var key = util.random(128),
            iv = util.random(128);

        $scope.updatePreview = function() {
            var body = $scope.body.trim();

            // Although this does encrypt live using AES, this is just for show. The plaintext is encrypted seperately before sending the email.
            $scope.ciphertextPreview = (body) ? aes.encrypt(body, key, iv) : '';
        };

        $scope.sendToOutbox = function() {
            var to, email;

            // validate recipients
            to = $scope.to.replace(/\s/g, '').split(/[,;]/);
            if (!to || to.length < 1) {
                $scope.onError({
                    errMsg: 'Seperate recipients with a comma!',
                    sync: true
                });
                return;
            }

            email = {
                to: [], // list of receivers
                subject: $scope.subject, // Subject line
                body: $scope.body // use parsed plaintext body
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

            emailDao.store(email, function(err) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                $scope.state.writer.close();
                $scope.$apply();
                $scope.emptyOutbox($scope.onOutboxUpdate);

                markAnswered();
            });
        };

        function markAnswered() {
            // mark replyTo as answered
            if (!$scope.replyTo) {
                return;
            }

            // mark list object
            $scope.replyTo.answered = true;
            emailDao.sync({
                folder: $scope.state.nav.currentFolder.path
            }, function(err) {
                if (err && err.code === 42) {
                    // offline
                    $scope.onError();
                    return;
                }

                $scope.onError(err);
            });
        }
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
                elm.on('keyup keydown', function() {
                    scope.$apply(function() {
                        // set model
                        ctrl.$setViewValue(elm[0].innerText);
                    });
                });

                // model -> view
                ctrl.$render = function() {
                    elm[0].innerText = ctrl.$viewValue;
                };

                // load init value from DOM
                ctrl.$setViewValue(elm[0].innerText);
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
                        }, 100);
                    }
                });
            }
        };
    });

    ngModule.directive('focusChild', function() {
        return {
            //scope: true,   // optionally create a child scope
            link: function(scope, element) {
                element[0].onclick = function() {
                    element[0].children[0].focus();
                };
            }
        };
    });

    ngModule.directive('autoSize', function($parse) {
        return {
            require: 'ngModel',
            link: function(scope, elm, attrs) {
                var model = $parse(attrs.autoSize);
                scope.$watch(model, function(value) {
                    if (!value) {
                        return;
                    }

                    var width = ((value.length + 2) * 8) + 'px';
                    elm.css('width', width);
                });
            }
        };
    });

    return WriteCtrl;
});