'use strict';

var appController = require('../app-controller'),
    download = require('../util/download'),
    str = require('../app-config').string,
    emailDao, invitationDao, outbox, pgp, keychain;

//
// Controller
//

var ReadCtrl = function($scope) {

    emailDao = appController._emailDao;
    invitationDao = appController._invitationDao;
    outbox = appController._outboxBo;
    pgp = appController._pgp;
    keychain = appController._keychain;

    // set default value so that the popover height is correct on init
    $scope.keyId = 'No key found.';

    $scope.state.read = {
        open: false,
        toggle: function(to) {
            this.open = to;
        }
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

            var fpr = pgp.getFingerprint(pubkey.publicKey);
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
    });

    function checkPublicKey(user) {
        user.secure = undefined;

        if (!keychain) {
            return;
        }

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
            download.createDownload({
                content: attachment.content,
                filename: attachment.filename,
                contentType: attachment.mimeType
            });
            return;
        }

        var folder = $scope.state.nav.currentFolder;
        var email = $scope.state.mailList.selected;
        emailDao.getAttachment({
            folder: folder,
            uid: email.uid,
            attachment: attachment
        }, $scope.onError);
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

ngModule.directive('frameLoad', function($timeout, $window) {
    return function(scope, elm) {
        var iframe = elm[0];

        scope.$watch('state.read.open', function(open) {
            if (open) {
                // trigger rendering of iframe
                // otherwise scale to fit would not compute correct dimensions on mobile
                displayText(scope.state.mailList.selected ? scope.state.mailList.selected.body : undefined);
                displayHtml(scope.state.mailList.selected ? scope.state.mailList.selected.html : undefined);
            }
        });

        $window.addEventListener('resize', scaleToFit);

        iframe.onload = function() {
            // set listeners
            scope.$watch('state.mailList.selected.body', displayText);
            scope.$watch('state.mailList.selected.html', displayHtml);
            // display initial message body
            scope.$apply();
        };

        function displayText(body) {
            var mail = scope.state.mailList.selected;
            if ((mail && mail.html) || (mail && mail.encrypted && !mail.decrypted)) {
                return;
            }

            // send text body for rendering in iframe
            iframe.contentWindow.postMessage({
                text: body
            }, '*');

            $timeout(scaleToFit, 0);
        }

        function displayHtml(html) {
            if (!html) {
                return;
            }

            // if there are image tags in the html?
            var hasImages = /<img[^>]+\bsrc=['"][^'">]+['"]/ig.test(html);
            scope.showImageButton = hasImages;

            iframe.contentWindow.postMessage({
                html: html,
                removeImages: hasImages // avoids doing unnecessary work on the html
            }, '*');

            // only add a scope function to reload the html if there are images
            if (hasImages) {
                // reload WITH images
                scope.displayImages = function() {
                    scope.showImageButton = false;
                    iframe.contentWindow.postMessage({
                        html: html,
                        removeImages: false
                    }, '*');
                };
            }

            $timeout(scaleToFit, 0);
        }

        // transform scale iframe (necessary on iOS) to fit container width
        function scaleToFit() {
            var parentWidth = elm.parent().width();
            var w = elm.width();
            var scale = '';

            if (w > parentWidth) {
                scale = parentWidth / w;
                scale = 'scale(' + scale + ',' + scale + ')';
            }

            elm.css({
                '-webkit-transform-origin': '0 0',
                'transform-origin': '0 0',
                '-webkit-transform': scale,
                'transform': scale
            });
        }
    };
});

module.exports = ReadCtrl;