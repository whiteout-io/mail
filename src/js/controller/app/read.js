'use strict';

//
// Controller
//

var ReadCtrl = function($scope, $location, $q, email, invitation, outbox, pgp, keychain, appConfig, download, auth, dialog, status) {

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

    /**
     * Close read mode and return to mail-list
     */
    $scope.close = function() {
        status.setReading(false);
    };

    $scope.getKeyId = function(address) {
        if ($location.search().dev || !address) {
            return;
        }

        return $q(function(resolve) {
            $scope.keyId = 'Searching...';
            resolve();

        }).then(function() {
            return keychain.getReceiverPublicKey(address);

        }).then(function(pubkey) {
            if (!pubkey) {
                $scope.keyId = 'User has no key. Click to invite.';
                return;
            }

            var fpr = pgp.getFingerprint(pubkey.publicKey);
            var formatted = fpr.slice(32);
            $scope.keyId = 'PGP key: ' + formatted;

        }).catch(dialog.error);
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

        return $q(function(resolve) {
            resolve();

        }).then(function() {
            return keychain.getReceiverPublicKey(user.address);

        }).then(function(pubkey) {
            if (pubkey && pubkey.publicKey) {
                user.secure = true;
            } else {
                user.secure = false;
            }

        }).catch(dialog.error);
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

        return $q(function(resolve) {
            resolve();

        }).then(function() {
            return email.getAttachment({
                folder: folder,
                uid: message.uid,
                attachment: attachment
            });

        }).catch(dialog.error);
    };

    $scope.invite = function(user) {
        // only invite non-pgp users
        if (user.secure) {
            return;
        }

        var sender = auth.emailAddress,
            recipient = user.address;

        return $q(function(resolve) {
            $scope.keyId = 'Sending invitation...';
            resolve();

        }).then(function() {
            return invitation.invite({
                recipient: recipient,
                sender: sender
            });

        }).then(function() {
            var invitationMail = invitation.createMail({
                sender: sender,
                recipient: recipient
            });
            // send invitation mail
            return outbox.put(invitationMail);

        }).catch(dialog.error);
    };
};

module.exports = ReadCtrl;