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

                verify($scope.to[0]);
            },
            close: function() {
                this.open = false;
            }
        };

        function resetFields() {
            $scope.writerTitle = 'New email';
            $scope.to = [{
                address: ''
            }];
            $scope.cc = [{
                address: ''
            }];
            $scope.bcc = [{
                address: ''
            }];
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
            $scope.to.unshift({
                address: re.from[0].address
            });
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

        $scope.onAddressUpdate = function(field, index) {
            var recipient = field[index],
                address = recipient.address;

            // handle number of email inputs for multiple recipients
            if (address.indexOf(' ') !== -1) {
                recipient.address = address.replace(' ', '');
                field.push({
                    address: ''
                });
            } else if (address.length === 0 && field.length > 1) {
                field.splice(field.indexOf(recipient), 1);
            }

            verify(recipient);
        };

        function verify(recipient) {
            // set display to insecure while fetching keys
            recipient.key = undefined;
            recipient.secure = false;

            // verify email address
            if (!util.validateEmailAddress(recipient.address)) {
                recipient.secure = undefined;
                checkSendStatus();
                return;
            }

            // check if to address is contained in known public keys
            emailDao._keychain.getReceiverPublicKey(recipient.address, function(err, key) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                // compare again since model could have changed during the roundtrip
                if (key && key.userId === recipient.address) {
                    recipient.key = key;
                    recipient.secure = true;
                }

                checkSendStatus();
                $scope.$apply();
            });
        }

        function checkSendStatus() {
            $scope.okToSend = false;
            $scope.sendBtnText = undefined;
            $scope.sendBtnSecure = undefined;

            var allSecure = true;
            var numReceivers = 0;

            // count number of receivers and check security
            $scope.to.forEach(check);
            $scope.cc.forEach(check);
            $scope.bcc.forEach(check);

            function check(recipient) {
                // validate address
                if (!util.validateEmailAddress(recipient.address)) {
                    return;
                }
                numReceivers++;
                if (!recipient.secure) {
                    allSecure = false;
                }
            }

            // sender can invite only one use at a time
            if (!allSecure && numReceivers === 1) {
                $scope.sendBtnText = 'Invite & send securely';
                $scope.okToSend = true;
                $scope.sendBtnSecure = false;
            } else if (allSecure && numReceivers > 0) {
                // all recipients are secure
                $scope.sendBtnText = 'Send securely';
                $scope.okToSend = true;
                $scope.sendBtnSecure = true;
            }
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
            var email;

            // build email model for smtp-client
            email = {
                to: [],
                cc: [],
                bcc: [],
                subject: $scope.subject, // Subject line
                body: $scope.body // use parsed plaintext body
            };
            email.from = [{
                name: '',
                address: emailDao._account.emailAddress
            }];

            // validate recipients and gather public keys
            email.receiverKeys = []; // gather public keys for emailDao._encrypt

            appendReceivers($scope.to, email.to);
            appendReceivers($scope.cc, email.cc);
            appendReceivers($scope.bcc, email.bcc);

            function appendReceivers(srcField, destField) {
                srcField.forEach(function(recipient) {
                    // validate address
                    if (!util.validateEmailAddress(recipient.address)) {
                        return;
                    }

                    // append address to email model
                    destField.push({
                        address: recipient.address
                    });

                    // add public key to list of recipient keys
                    if (recipient.key && recipient.key.publicKey) {
                        email.receiverKeys.push(recipient.key.publicKey);
                    }
                });
            }

            // persist the email locally for later smtp transmission
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
                    var width;

                    if (value.length < 12) {
                        width = (14 * 8) + 'px';
                    } else {
                        width = ((value.length + 2) * 8) + 'px';
                    }

                    elm.css('width', width);
                });
            }
        };
    });

    ngModule.directive('addressInput', function($timeout) {
        return {
            //scope: true,   // optionally create a child scope
            link: function(scope, element, attrs) {
                // get prefix for id
                var idPrefix = attrs.addressInput;
                element.bind('keydown', function(e) {
                    if (e.keyCode === 32) {
                        // space -> go to next input
                        $timeout(function() {
                            // find next input and focus
                            var index = attrs.id.replace(idPrefix, '');
                            var nextId = idPrefix + (parseInt(index, 10) + 1);
                            document.getElementById(nextId).focus();
                        }, 100);
                    }
                });
            }
        };
    });

    return WriteCtrl;
});