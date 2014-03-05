define(function(require) {
    'use strict';

    var angular = require('angular'),
        appController = require('js/app-controller'),
        aes = require('cryptoLib/aes-cbc'),
        util = require('cryptoLib/util'),
        str = require('js/app-config').string,
        crypto, emailDao, outbox;

    //
    // Controller
    //

    var WriteCtrl = function($scope, $filter) {
        crypto = appController._crypto;
        emailDao = appController._emailDao,
        outbox = appController._outboxBo;

        // set default value so that the popover height is correct on init
        $scope.keyId = 'XXXXXXXX';

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

                $scope.verify($scope.to[0]);
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
            $scope.attachments = [];
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
                body += re.body.trim().split('\n').join('\n> ');
                $scope.body = body;
            }
        }

        //
        // Editing headers
        //

        /**
         * This event is fired when editing the email address headers. It checks is space is pressed and if so, creates a new address field.
         */
        $scope.onAddressUpdate = function(field, index) {
            var recipient = field[index];
            $scope.verify(recipient);
        };

        /**
         * Verify and email address and fetch its public key
         */
        $scope.verify = function(recipient) {
            // set display to insecure while fetching keys
            recipient.key = undefined;
            recipient.secure = false;
            $scope.checkSendStatus();

            // verify email address
            if (!util.validateEmailAddress(recipient.address)) {
                recipient.secure = undefined;
                $scope.checkSendStatus();
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

                $scope.checkSendStatus();
                $scope.$apply();
            });
        };

        $scope.getKeyId = function(recipient) {
            $scope.keyId = 'Key not found for that user.';

            if (!recipient.key) {
                return;
            }

            var fpr = crypto.getFingerprint(recipient.key.publicKey);
            var formatted = fpr.slice(32);

            $scope.keyId = formatted;
        };

        /**
         * Check if it is ok to send an email depending on the invitation state of the addresses
         */
        $scope.checkSendStatus = function() {
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

            // only allow sending if receviers exist
            if (numReceivers < 1) {
                return;
            }

            if (allSecure) {
                // send encrypted if all secure
                $scope.okToSend = true;
                $scope.sendBtnText = str.sendBtnSecure;
                $scope.sendBtnSecure = true;
            } else {
                // send plaintext
                $scope.okToSend = true;
                $scope.sendBtnText = str.sendBtnClear;
                $scope.sendBtnSecure = false;
            }
        };

        //
        // Editing attachments
        //

        $scope.remove = function(attachment) {
            $scope.attachments.splice($scope.attachments.indexOf(attachment), 1);
        };

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
                from: [{
                    address: emailDao._account.emailAddress
                }],
                to: $scope.to.filter(filterEmptyAddresses),
                cc: $scope.cc.filter(filterEmptyAddresses),
                bcc: $scope.bcc.filter(filterEmptyAddresses),
                subject: $scope.subject.trim() ? $scope.subject.trim() : str.fallbackSubject, // Subject line, or the fallback subject, if nothing valid was entered
                body: $scope.body.trim() + (!$scope.sendBtnSecure ? str.signature : ''), // use parsed plaintext body
                attachments: $scope.attachments
            };

            // close the writer
            $scope.state.writer.close();

            // persist the email to disk for later sending
            outbox.put(email, function(err) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                // helper flag to remember if we need to sync back to imap
                // in case the replyTo.answered changed
                var needsSync = false;

                // mark replyTo as answered, if necessary
                if ($scope.replyTo && !$scope.replyTo.answered) {
                    $scope.replyTo.answered = true;
                    // update the ui
                    $scope.$apply();
                    needsSync = true;
                }

                // if we need to synchronize replyTo.answered, let's do that.
                // otherwise, we're done
                if (!needsSync) {
                    return;
                }

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
            });

            function filterEmptyAddresses(addr) {
                return !!addr.address;
            }
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
                element.on('click', function() {
                    element[0].children[0].focus();
                });
            }
        };
    });

    ngModule.directive('autoSize', function($parse) {
        return {
            require: 'ngModel',
            link: function(scope, elm, attrs) {
                // resize text input depending on value length
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

    function addInput(field, scope) {
        field.push({
            address: ''
        });
        scope.$apply();
    }

    function checkForEmptyInput(field) {
        var emptyFieldExists = false;
        field.forEach(function(recipient) {
            if (!recipient.address) {
                emptyFieldExists = true;
            }
        });

        return emptyFieldExists;
    }

    ngModule.directive('field', function() {
        return {
            //scope: true,   // optionally create a child scope
            link: function(scope, element, attrs) {
                element.on('click', function() {
                    var fieldName = attrs.field;
                    var field = scope[fieldName];

                    if (!checkForEmptyInput(field)) {
                        // create new field input if no empy one exists
                        addInput(field, scope);
                    }

                    // focus on last input when clicking on field
                    var id = fieldName + (field.length - 1);
                    document.getElementById(id).focus();
                });
            }
        };
    });

    ngModule.directive('addressInput', function() {
        return {
            //scope: true,   // optionally create a child scope
            link: function(scope, element, attrs) {
                // get prefix for id
                var fieldName = attrs.addressInput;
                var field = scope[fieldName];
                var index = parseInt(attrs.id.replace(fieldName, ''), 10);

                element.on('click', function(e) {
                    // focus on this one and dont bubble to field click handler
                    e.stopPropagation();
                });

                element.on('blur', function() {
                    if (!checkForEmptyInput(field)) {
                        // create new field input
                        addInput(field, scope);
                    }
                });

                element.on('keydown', function(e) {
                    var code = e.keyCode;

                    scope.$apply();

                    if (code === 32 || code === 188 || code === 186) {
                        // catch space, comma, semicolon
                        e.preventDefault();

                        // create new field input
                        addInput(field, scope);
                        // find next input and focus
                        var nextId = fieldName + (index + 1);
                        document.getElementById(nextId).focus();

                    } else if ((code === 8 || code === 46) && !field[index].address && field.length > 1) {
                        // backspace, delete on empty input
                        // remove input
                        e.preventDefault();
                        field.splice(index, 1);
                        scope.$apply();
                        // focus on previous id
                        var previousId = fieldName + (index - 1);
                        document.getElementById(previousId).focus();
                    }
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
                    scope.$apply();
                };
                reader.readAsArrayBuffer(file);
            }
        };
    });

    ngModule.directive('attachmentBtn', function() {
        return function(scope, elm) {
            elm.on('click touchstart', function(e) {
                e.preventDefault();
                document.querySelector('#attachment-input').click();
            });
        };
    });

    return WriteCtrl;
});