'use strict';

var axe = require('axe-logger'),
    util = require('crypto-lib').util;

//
// Controller
//

var WriteCtrl = function($scope, $filter, $q, appConfig, auth, keychain, pgp, email, outbox, dialog) {

    var str = appConfig.string;

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
        $scope.to = [];
        $scope.showCC = false;
        $scope.cc = [];
        $scope.showBCC = false;
        $scope.bcc = [];
        $scope.subject = '';
        $scope.body = '';
        $scope.attachments = [];
        $scope.addressBookCache = undefined;
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
                var me = auth.emailAddress;
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
     * Verify email address and fetch its public key
     */
    $scope.verify = function(recipient) {
        if (!recipient) {
            return;
        }

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

        // keychain is undefined in local dev environment
        if (keychain) {
            // check if to address is contained in known public keys
            // when we write an email, we always need to work with the latest keys available
            keychain.refreshKeyForUserId({
                userId: recipient.address
            }, function(err, key) {
                if (err) {
                    dialog.error(err);
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
        }
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

    $scope.sendToOutbox = function() {
        var message;

        // build email model for smtp-client
        message = {
            from: [{
                name: auth.realname,
                address: auth.emailAddress
            }],
            to: $scope.to.filter(filterEmptyAddresses),
            cc: $scope.cc.filter(filterEmptyAddresses),
            bcc: $scope.bcc.filter(filterEmptyAddresses),
            subject: $scope.subject.trim() ? $scope.subject.trim() : str.fallbackSubject, // Subject line, or the fallback subject, if nothing valid was entered
            body: $scope.body.trim(), // use parsed plaintext body
            attachments: $scope.attachments,
            sentDate: new Date(),
            headers: {}
        };

        if ($scope.inReplyTo) {
            message.headers['in-reply-to'] = '<' + $scope.inReplyTo + '>';
        }

        if ($scope.references && $scope.references.length) {
            message.headers.references = $scope.references.map(function(reference) {
                return '<' + reference + '>';
            }).join(' ');
        }

        // close the writer
        $scope.state.writer.close();

        // persist the email to disk for later sending
        outbox.put(message, function(err) {
            if (err) {
                dialog.error(err);
                return;
            }

            // if we need to synchronize replyTo.answered = true to imap,
            // let's do that. otherwise, we're done
            if (!$scope.replyTo || $scope.replyTo.answered) {
                return;
            }

            $scope.replyTo.answered = true;
            email.setFlags({
                folder: currentFolder(),
                message: $scope.replyTo
            }, function(err) {
                if (err && err.code !== 42) {
                    dialog.error(err);
                    return;
                }

                // offline or no error, let's apply the ui changes
                $scope.$apply();
            });
        });

    };

    //
    // Tag input & Autocomplete
    //

    $scope.tagStyle = function(recipient) {
        var classes = ['label'];
        if (recipient.secure === false) {
            classes.push('label--invalid');
        }
        return classes;
    };

    $scope.lookupAddressBook = function(query) {
        var deferred = $q.defer();

        if (!$scope.addressBookCache) {
            // populate address book cache
            keychain.listLocalPublicKeys(function(err, keys) {
                if (err) {
                    dialog.error(err);
                    return;
                }

                $scope.addressBookCache = keys.map(function(key) {
                    return {
                        address: key.userId
                    };
                });
                filter();
            });

        } else {
            filter();
        }

        // query address book cache
        function filter() {
            var addresses = $scope.addressBookCache.filter(function(i) {
                return i.address.indexOf(query) !== -1;
            });
            deferred.resolve(addresses);
        }

        return deferred.promise;
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

ngModule.directive('attachmentBtn', function() {
    return function(scope, elm) {
        elm.on('click touchstart', function(e) {
            e.preventDefault();
            document.querySelector('#attachment-input').click();
        });
    };
});

module.exports = WriteCtrl;