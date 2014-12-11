'use strict';

//
// Controller
//

var ReadCtrl = function($scope, $location, email, invitation, outbox, pgp, keychain, appConfig, download, auth, dialog) {

    var str = appConfig.string;

    //
    // scope state
    //

    $scope.state.read = {
        open: false,
        toggle: function(to) {
            this.open = to;
        }
    };

    $scope.$on('read', function(e, state) {
        $scope.state.read.toggle(state);
    });

    // set default value so that the popover height is correct on init
    $scope.keyId = 'No key found.';

    //
    // url/history handling
    //

    // read state url watcher
    $scope.loc = $location;
    $scope.$watch('(loc.search()).uid', function(uid) {
        // synchronize the url to the scope state
        $scope.state.read.toggle(!!uid);
    });
    $scope.$watch('state.read.open', function(value) {
        // close read mode by navigating to folder view
        if (!value) {
            $location.search('uid', null);
        }
    });

    //
    // scope functions
    //

    $scope.getKeyId = function(address) {
        if ($location.search().dev || !address) {
            return;
        }

        $scope.keyId = 'Searching...';
        keychain.getReceiverPublicKey(address, function(err, pubkey) {
            if (err) {
                dialog.error(err);
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
        if ($location.search().dev || !mail) {
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
                dialog.error(err);
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
        var message = $scope.state.mailList.selected;
        email.getAttachment({
            folder: folder,
            uid: message.uid,
            attachment: attachment
        }, dialog.error);
    };

    $scope.invite = function(user) {
        // only invite non-pgp users
        if (user.secure) {
            return;
        }

        $scope.keyId = 'Sending invitation...';

        var sender = auth.emailAddress,
            recipient = user.address;

        invitation.invite({
            recipient: recipient,
            sender: sender
        }, function(err) {
            if (err) {
                dialog.error(err);
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
            outbox.put(invitationMail, dialog.error);
        });
    };
};

module.exports = ReadCtrl;