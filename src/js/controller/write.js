define(function(require) {
    'use strict';

    var angular = require('angular'),
        _ = require('underscore'),
        appController = require('js/app-controller'),
        axe = require('axe'),
        aes = require('js/crypto/aes-gcm'),
        util = require('js/crypto/util'),
        str = require('js/app-config').string,
        pgp, emailDao, outbox, keychainDao, auth;

    //
    // Controller
    //

    var WriteCtrl = function($scope, $filter) {
        pgp = appController._pgp;
        auth = appController._auth;
        emailDao = appController._emailDao;
        outbox = appController._outboxBo;
        keychainDao = appController._keychain;


        // set default value so that the popover height is correct on init
        $scope.keyId = 'XXXXXXXX';

        //
        // Init
        //

        $scope.state.writer = {
            write: function(replyTo, replyAll, forward) {
                $scope.state.lightbox = 'write';
                $scope.replyTo = replyTo;

                resetFields();

                // fill fields depending on replyTo
                fillFields(replyTo, replyAll, forward);
                $scope.updatePreview();

                $scope.verify($scope.to[0]);
            },
            reportBug: function() {
                $scope.state.lightbox = 'write';
                resetFields();
                reportBug();
                $scope.verify($scope.to[0]);
            },
            close: function() {
                $scope.state.lightbox = undefined;
            }
        };

        function resetFields() {
            $scope.writerTitle = 'New email';
            $scope.to = [{
                address: ''
            }];
            $scope.showCC = false;
            $scope.cc = [{
                address: ''
            }];
            $scope.showBCC = false;
            $scope.bcc = [{
                address: ''
            }];
            $scope.subject = '';
            $scope.body = '';
            $scope.ciphertextPreview = '';
            $scope.attachments = [];
        }

        function reportBug() {
            var dump = '';
            var appender = {
                log: function(level, date, component, log) {
                    // add a tag for the log level
                    if (level === axe.DEBUG) {
                        dump += '[DEBUG]';
                    } else if (level === axe.INFO) {
                        dump += '[INFO]';
                    } else if (level === axe.WARN) {
                        dump += '[WARN]';
                    } else if (level === axe.ERROR) {
                        dump += '[ERROR]';
                    }

                    dump += '[' + date.toISOString() + ']';

                    // component is optional
                    if (component) {
                        dump += '[' + component + ']';
                    }

                    // log may be an error or a string
                    dump += ' ' + (log || '').toString();

                    // if an error it is, a stack trace it has. print it, we should.
                    if (log.stack) {
                        dump += ' . Stack: ' + log.stack;
                    }

                    dump += '\n';
                }
            };
            axe.dump(appender);

            $scope.to = [{
                address: str.supportAddress
            }];
            $scope.writerTitle = str.bugReportTitle;
            $scope.subject = str.bugReportSubject;
            $scope.body = str.bugReportBody + dump;

        }

        function fillFields(re, replyAll, forward) {
            var replyTo, from, sentDate, body;

            if (!re) {
                return;
            }

            $scope.writerTitle = (forward) ? 'Forward' : 'Reply';

            replyTo = re.replyTo && re.replyTo[0] && re.replyTo[0].address || re.from[0].address;

            // fill recipient field and references
            if (!forward) {
                $scope.to.unshift({
                    address: replyTo
                });
                $scope.to.forEach($scope.verify);
                if (re.references) {

                }

                $scope.references = (re.references || []);
                if (re.id && $scope.references.indexOf(re.id) < 0) {
                    // references might not exist yet, so use the double concat
                    $scope.references = $scope.references.concat(re.id);
                }
                if (re.id) {
                    $scope.inReplyTo = re.id;
                }
            }
            if (replyAll) {
                re.to.concat(re.cc).forEach(function(recipient) {
                    var me = emailDao._account.emailAddress;
                    if (recipient.address === me && replyTo !== me) {
                        // don't reply to yourself
                        return;
                    }
                    $scope.cc.unshift({
                        address: recipient.address
                    });
                });

                // filter duplicates
                $scope.cc = _.uniq($scope.cc, function(recipient) {
                    return recipient.address;
                });
                $scope.showCC = true;
                $scope.cc.forEach($scope.verify);
            }

            // fill attachments and references on forward
            if (forward) {
                // create a new array, otherwise removing an attachment will also
                // remove it from the original in the mail list as a side effect
                $scope.attachments = [].concat(re.attachments);
                if (re.id) {
                    $scope.references = [re.id];
                }
            }

            // fill subject
            if (forward) {
                $scope.subject = 'Fwd: ' + re.subject;
            } else {
                $scope.subject = 'Re: ' + ((re.subject) ? re.subject.replace('Re: ', '') : '');
            }

            // fill text body
            from = re.from[0].name || replyTo;
            sentDate = $filter('date')(re.sentDate, 'EEEE, MMM d, yyyy h:mm a');

            function createString(array) {
                var str = '';
                array.forEach(function(to) {
                    str += (str) ? ', ' : '';
                    str += ((to.name) ? to.name : to.address) + ' <' + to.address + '>';
                });
                return str;
            }

            if (forward) {
                body = '\n\n' +
                    '---------- Forwarded message ----------\n' +
                    'From: ' + re.from[0].name + ' <' + re.from[0].address + '>\n' +
                    'Date: ' + sentDate + '\n' +
                    'Subject: ' + re.subject + '\n' +
                    'To: ' + createString(re.to) + '\n' +
                    ((re.cc && re.cc.length > 0) ? 'Cc: ' + createString(re.cc) + '\n' : '') +
                    '\n\n';

            } else {
                body = '\n\n' + sentDate + ' ' + from + ' wrote:\n> ';
            }

            if (re.body) {
                body += re.body.trim().split('\n').join('\n> ').replace(/ >/g, '>');
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
            // when we write an email, we always need to work with the latest keys available
            keychainDao.refreshKeyForUserId(recipient.address, function(err, key) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                if (key) {
                    // compare again since model could have changed during the roundtrip
                    var matchingUserId = _.findWhere(key.userIds, {
                        emailAddress: recipient.address
                    });
                    // compare either primary userId or (if available) multiple IDs
                    if (key.userId === recipient.address || matchingUserId) {
                        recipient.key = key;
                        recipient.secure = true;
                    }
                }

                $scope.checkSendStatus();
                $scope.$digest();
            });
        };

        $scope.getKeyId = function(recipient) {
            $scope.keyId = 'Key not found for that user.';

            if (!recipient.key) {
                return;
            }

            var fpr = pgp.getFingerprint(recipient.key.publicKey);
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

            // bcc automatically disables secure sending
            if ($scope.bcc.filter(filterEmptyAddresses).length > 0) {
                allSecure = false;
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
            if (!$scope.sendBtnSecure || !$scope.body.trim()) {
                $scope.ciphertextPreview = undefined;
                return;
            }

            // Although this does encrypt live using AES, this is just for show. The plaintext is encrypted seperately before sending the email.
            $scope.ciphertextPreview = aes.encrypt($scope.body, key, iv);
        };
        $scope.$watch('sendBtnSecure', $scope.updatePreview);

        $scope.sendToOutbox = function() {
            var email;

            // build email model for smtp-client
            email = {
                from: [{
                    name: emailDao._account.realname,
                    address: emailDao._account.emailAddress
                }],
                to: $scope.to.filter(filterEmptyAddresses),
                cc: $scope.cc.filter(filterEmptyAddresses),
                bcc: $scope.bcc.filter(filterEmptyAddresses),
                subject: $scope.subject.trim() ? $scope.subject.trim() : str.fallbackSubject, // Subject line, or the fallback subject, if nothing valid was entered
                body: $scope.body.trim() + (!$scope.sendBtnSecure ? str.signature : ''), // use parsed plaintext body
                attachments: $scope.attachments,
                sentDate: new Date(),
                headers: {}
            };

            if ($scope.inReplyTo) {
                email.headers['in-reply-to'] = '<' + $scope.inReplyTo + '>';
            }

            if ($scope.references && $scope.references.length) {
                email.headers.references = $scope.references.map(function(reference) {
                    return '<' + reference + '>';
                }).join(' ');
            }

            // close the writer
            $scope.state.writer.close();

            // persist the email to disk for later sending
            outbox.put(email, function(err) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                // if we need to synchronize replyTo.answered = true to imap,
                // let's do that. otherwise, we're done
                if (!$scope.replyTo || $scope.replyTo.answered) {
                    return;
                }

                $scope.replyTo.answered = true;
                emailDao.setFlags({
                    folder: currentFolder(),
                    message: $scope.replyTo
                }, function(err) {
                    if (err && err.code !== 42) {
                        $scope.onError(err);
                        return;
                    }

                    // offline or no error, let's apply the ui changes
                    $scope.$apply();
                });
            });

        };

        //
        // Helpers
        //

        function currentFolder() {
            return $scope.state.nav.currentFolder;
        }

        /*
         * Visitor to filter out objects without an address property, i.e. empty addresses
         */
        function filterEmptyAddresses(addr) {
            return !!addr.address;
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
                    // set model
                    ctrl.$setViewValue(elm[0].innerText);
                    scope.$digest();
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

                    if (!value || value.length < 12) {
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
        scope.$apply(function() {
            field.push({
                address: ''
            });
        });
    }

    function removeInput(field, index, scope) {
        scope.$apply(function() {
            field.splice(index, 1);
        });
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

    function cleanupEmptyInputs(field, scope) {
        scope.$apply(function() {
            for (var i = field.length - 2; i >= 0; i--) {
                if (!field[i].address) {
                    field.splice(i, 1);
                }
            }
        });
    }

    function focusInput(fieldName, index) {
        var fieldId = fieldName + (index);
        var fieldEl = document.getElementById(fieldId);
        if (fieldEl) {
            fieldEl.focus();
        }
    }

    ngModule.directive('field', function() {
        return {
            scope: true,
            link: function(scope, element, attrs) {
                element.on('click', function(e) {
                    if (e.target.nodeName === 'INPUT') {
                        return;
                    }

                    var fieldName = attrs.field;
                    var field = scope[fieldName];

                    if (!checkForEmptyInput(field)) {
                        // create new field input if no empy one exists
                        addInput(field, scope);
                    }

                    // focus on last input when clicking on field
                    focusInput(fieldName, field.length - 1);
                });
            }
        };
    });

    ngModule.directive('addressInput', function() {
        return {
            scope: true,
            link: function(scope, elm, attrs) {
                // get prefix for id
                var fieldName = attrs.addressInput;
                var field = scope[fieldName];
                var index = parseInt(attrs.id.replace(fieldName, ''), 10);

                elm.on('blur', function() {
                    if (!checkForEmptyInput(field)) {
                        // create new field input
                        addInput(field, scope);
                    }

                    cleanupEmptyInputs(field, scope);
                });

                elm.on('keydown', function(e) {
                    var code = e.keyCode;
                    var address = elm[0].value;

                    if (code === 32 || code === 188 || code === 186) {
                        // catch space, comma, semicolon
                        e.preventDefault();

                        // add next field only if current input is not empty
                        if (address) {
                            // create new field input
                            addInput(field, scope);

                            // find next input and focus
                            focusInput(fieldName, index + 1);
                        }

                    } else if ((code === 8 || code === 46) && !address && field.length > 1) {
                        // backspace, delete on empty input
                        // remove input
                        e.preventDefault();

                        removeInput(field, index, scope);

                        // focus on previous id
                        focusInput(fieldName, index - 1);
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
                    scope.$digest();
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
