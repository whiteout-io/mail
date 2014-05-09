define(function(require) {
    'use strict';

    var appController = require('js/app-controller'),
        download = require('js/util/download'),
        angular = require('angular'),
        str = require('js/app-config').string,
        emailDao, invitationDao, outbox, crypto, keychain;

    //
    // Controller
    //

    var ReadCtrl = function($scope, $timeout) {

        emailDao = appController._emailDao;
        invitationDao = appController._invitationDao;
        outbox = appController._outboxBo;
        crypto = appController._crypto;
        keychain = appController._keychain;

        // set default value so that the popover height is correct on init
        $scope.keyId = 'No key found.';

        $scope.state.read = {
            open: false,
            toggle: function(to) {
                this.open = to;
            }
        };

        $scope.lineEmpty = function(line) {
            return line.replace(/>/g, '').trim().length === 0;
        };

        $scope.getKeyId = function(address) {
            $scope.keyId = 'Searching...';
            keychain.getReceiverPublicKey(address, function(err, pubkey) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                if (!pubkey) {
                    $scope.keyId = 'User has no key. Click to invite.';
                    $scope.$apply();
                    return;
                }

                var fpr = crypto.getFingerprint(pubkey.publicKey);
                var formatted = fpr.slice(32);

                $scope.keyId = 'PGP key: ' + formatted;
                $scope.$apply();
            });
        };

        $scope.$watch('state.mailList.selected', function(mail) {
            if (!mail) {
                return;
            }

            // display sender security status
            mail.from.forEach(checkPublicKey);
            // display recipient security status
            mail.to.forEach(checkPublicKey);
            // display recipient security status
            Array.isArray(mail.cc) && mail.cc.forEach(checkPublicKey);

            $scope.node = undefined;
        });
        $scope.$watch('state.mailList.selected.body', function(body) {
            if (!body || (body && $scope.state.mailList.selected.decrypted === false)) {
                $scope.node = undefined;
                return;
            }

            $timeout(function() {
                // parse text nodes for rendering
                $scope.node = $scope.parseConversation({
                    body: body
                });
            });
        });

        function checkPublicKey(user) {
            user.secure = undefined;
            keychain.getReceiverPublicKey(user.address, function(err, pubkey) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                if (pubkey && pubkey.publicKey) {
                    user.secure = true;
                } else {
                    user.secure = false;
                }

                $scope.$apply();
            });
        }

        $scope.download = function(attachment) {
            // download file to disk if content is available
            if (attachment.content) {
                saveToDisk(attachment);
                return;
            }

            var folder = $scope.state.nav.currentFolder;
            var email = $scope.state.mailList.selected;

            emailDao.getAttachment({
                path: folder.path,
                uid: email.uid,
                attachment: attachment
            }, function(err) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                saveToDisk(attachment);
            });

            function saveToDisk(attachment) {
                download.createDownload({
                    content: attachment.content,
                    filename: attachment.filename,
                    contentType: attachment.mimeType
                }, $scope.onError);
            }
        };

        $scope.invite = function(user) {
            // only invite non-pgp users
            if (user.secure) {
                return;
            }

            $scope.keyId = 'Sending invitation...';

            var sender = emailDao._account.emailAddress,
                recipient = user.address;

            invitationDao.invite({
                recipient: recipient,
                sender: sender
            }, function(err) {
                if (err) {
                    $scope.onError(err);
                    return;
                }

                var invitationMail = {
                    from: [{
                        address: sender
                    }],
                    to: [{
                        address: recipient
                    }],
                    cc: [],
                    bcc: [],
                    subject: str.invitationSubject,
                    body: str.invitationMessage
                };

                // send invitation mail
                outbox.put(invitationMail, $scope.onError);
            });
        };

        $scope.parseConversation = function(email) {
            var nodes;

            if (!email || !email.body) {
                return;
            }

            function parseLines(body) {
                var lines = [];
                body.split('\n').forEach(parseLine);

                function parseLine(line) {
                    var regex = /^>*/;
                    var result = regex.exec(line);

                    lines.push({
                        text: line.replace(regex, '').trim(),
                        level: (result && result.length > 0) ? result[0].length : 0
                    });
                }

                return lines;
            }

            function buildTextNodes(lines) {
                var i, j, root, currentLevel, currentNode, levelDelta;

                root = new Node();
                currentLevel = 0;
                currentNode = root;

                // iterate over text lines
                for (i = 0; i < lines.length; i++) {
                    levelDelta = lines[i].level - currentLevel;

                    if (levelDelta === 0) {
                        // we are at the desired node ... no traversal required
                    } else if (levelDelta > 0) {
                        // traverse to child node(s)
                        for (j = 0; j < levelDelta; j++) {
                            var newChild = new Node(currentNode);
                            // create new child node
                            currentNode.children.push(newChild);
                            // go to last child node
                            currentNode = newChild;
                            // increase current level by one
                            currentLevel++;
                        }
                    } else {
                        // traverse to parent(s)
                        for (j = levelDelta; j < 0; j++) {
                            currentNode = currentNode.parent;
                            currentLevel--;
                        }
                    }

                    // add text to the current node
                    currentNode.addLine(lines[i].text);
                }

                return root;
            }

            function Node(parent) {
                this.parent = parent;
                this.children = [];
            }
            Node.prototype.addLine = function(lineText) {
                var c, l;

                c = this.children;
                l = c.length;

                // append text node to children if last child is not a text node
                if (l < 1 || typeof c[l - 1] !== 'string') {
                    c[l] = '';
                    l = c.length;
                }

                // append line to last child (add newline between lines)
                c[l - 1] += lineText + '\n';
            };

            function removeParentReference(node) {
                if (!node.children) {
                    // this is a text leaf ... terminate recursion
                    return;
                }

                // remove parent node to prevent infinite loop in JSON stringify
                delete node.parent;

                for (var i = 0; i < node.children.length; i++) {
                    if (typeof node.children[i] === 'string') {
                        // remove trailing newline in string
                        node.children[i] = node.children[i].replace(/\n$/, '');
                    } else {
                        // I used recursion ...
                        removeParentReference(node.children[i]);
                    }
                }
            }

            nodes = buildTextNodes(parseLines(email.body.replace(/ >/g, '>')));
            removeParentReference(nodes);

            return nodes;
        };
    };

    //
    // Directives
    //

    var ngModule = angular.module('read', []);

    ngModule.directive('replySelection', function() {
        return function(scope, elm) {
            var popover, visible;

            popover = angular.element(document.querySelector('.reply-selection'));
            visible = false;

            elm.on('touchstart click', appear);
            elm.parent().parent().on('touchstart click', disappear);
            popover.on('touchstart click', disappear);

            function appear(e) {
                e.preventDefault();
                e.stopPropagation();

                visible = true;

                // set popover position
                var top = elm[0].offsetTop;
                var left = elm[0].offsetLeft;
                var width = elm[0].offsetWidth;
                var height = elm[0].offsetHeight;

                popover[0].style.transition = 'opacity 0.1s linear';
                popover[0].style.top = (top + height) + 'px';
                popover[0].style.left = (left + width / 2 - popover[0].offsetWidth / 2) + 'px';
                popover[0].style.opacity = '1';
            }

            function disappear() {
                if (!visible) {
                    return;
                }

                popover[0].style.transition = 'opacity 0.25s linear, top 0.25s step-end, left 0.25s step-end';
                popover[0].style.opacity = '0';
                popover[0].style.top = '-9999px';
                popover[0].style.left = '-9999px';
                visible = false;
            }
        };
    });

    ngModule.directive('frameLoad', function($sce, $timeout) {
        return function(scope, elm, attrs) {
            scope.$watch(attrs.frameLoad, function(value) {
                scope.html = undefined;
                if (value) {
                    $timeout(function() {
                        // wrap in html doc with scrollable html tag, since chrome apps does not scroll by default
                        var prefix = '<!DOCTYPE html><html style="overflow-y: auto"><head></head><body>';
                        var suffix = '</body></html>';
                        scope.html = $sce.trustAsHtml(prefix + value + suffix);
                    });
                }
            });
        };
    });

    ngModule.filter('createAnchors', function($sce) {
        return function(str) {
            // replace all urls with anchors
            return $sce.trustAsHtml(str.replace(/(https?:\/\/[^\s]+)/g, function(url) {
                return '<a href="' + url + '" target="_blank">' + url + '</a>';
            }));
        };
    });

    return ReadCtrl;
});