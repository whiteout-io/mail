'use strict';

var JUNK_FOLDER_TYPE = 'Junk';

var ActionBarCtrl = function($scope, $q, email, dialog, status) {

    //
    // scope functions
    //

    $scope.CHECKNONE = 0;
    $scope.CHECKALL = 1;
    $scope.CHECKUNREAD = 2;
    $scope.CHECKREAD = 3;
    $scope.CHECKFLAGGED = 4;
    $scope.CHECKUNFLAGGED = 5;
    $scope.CHECKENCRYPTED = 6;
    $scope.CHECKUNENCRYPTED = 7;

    $scope.check = function(option) {
        currentFolder().messages.forEach(function(email) {
            if (!email.from) {
                // only mark loaded messages, not the dummy messages
                return;
            }

            if (option === $scope.CHECKNONE) {
                email.checked = false;
            } else if (option === $scope.CHECKALL) {
                email.checked = true;
            } else if (option === $scope.CHECKUNREAD) {
                email.checked = !!email.unread;
            } else if (option === $scope.CHECKREAD) {
                email.checked = !email.unread;
            } else if (option === $scope.CHECKFLAGGED) {
                email.checked = !!email.flagged;
            } else if (option === $scope.CHECKUNFLAGGED) {
                email.checked = !email.flagged;
            } else if (option === $scope.CHECKENCRYPTED) {
                email.checked = !!email.encrypted;
            } else if (option === $scope.CHECKUNENCRYPTED) {
                email.checked = !email.encrypted;
            }
        });
    };

    /**
     * Move a single message from the currently selected folder to another folder
     * @param  {Object} message     The message that is to be moved
     * @param  {Object} destination The folder object where the message should be moved to
     */
    $scope.moveMessage = function(message, destination) {
        if (!message || !destination) {
            return;
        }

        // close read state
        status.setReading(false);
        // show message
        status.update('Moving message...');

        return $q(function(resolve) {
            resolve();

        }).then(function() {
            return email.moveMessage({
                folder: currentFolder(),
                destination: destination,
                message: message
            });

        }).then(function() {
            status.update('Online');

        }).catch(function(err) {
            // show errors where appropriate
            if (err.code === 42) {
                $scope.select(message);
                status.update('Unable to move message in offline mode!');
                return;
            }
            status.update('Error during move!');
            return dialog.error(err);
        });
    };

    /**
     * Move all checked messages from the currently selected folder to another folder
     * @param  {Object} destination The folder object where the message should be moved to
     */
    $scope.moveCheckedMessages = function(destination) {
        getCheckMessages().forEach(function(message) {
            $scope.moveMessage(message, destination);
        });
    };

    /**
     * Find the junk folder to mark a message as spam. If no junk folder is found, an error message will be displayed.
     * @return {Object} The junk folder object tied to the account
     */
    $scope.getJunkFolder = function() {
        var folder = _.findWhere($scope.account.folders, {
            type: JUNK_FOLDER_TYPE
        });
        if (!folder) {
            dialog.error(new Error('Spam folder not found!'));
            return;
        }
        return folder;
    };

    /**
     * Delete a message. This moves the message from the current folder to the trash folder,
     *     or if the current folder is the trash folder, the message will be purged.
     * @param  {Object} message The message that is to be deleted
     */
    $scope.deleteMessage = function(message) {
        if (!message) {
            return;
        }

        // close read state
        status.setReading(false);
        status.update('Deleting message...');

        return $q(function(resolve) {
            resolve();

        }).then(function() {
            return email.deleteMessage({
                folder: currentFolder(),
                message: message
            });

        }).then(function() {
            status.update('Online');

        }).catch(function(err) {
            // show errors where appropriate
            if (err.code === 42) {
                $scope.select(message);
                status.update('Unable to delete message in offline mode!');
                return;
            }
            status.update('Error during delete!');
            return dialog.error(err);
        });
    };

    /**
     * Delete all of the checked  messages. This moves the messages from the current folder to the trash folder,
     *     or if the current folder is the trash folder, the messages will be purged.
     */
    $scope.deleteCheckedMessages = function() {
        getCheckMessages().forEach($scope.deleteMessage);
    };

    /**
     * Mark a single message as either read or unread
     * @param  {Object}     message The message to be marked
     * @param  {boolean}    unread If the message should be marked as read or unread
     */
    $scope.markMessage = function(message, unread, keepOpen) {
        if (!message || message.unread === unread) {
            return;
        }

        status.update('Updating unread flag...');

        // close read state
        if (!keepOpen) {
            status.setReading(false);
        }

        var originalState = message.unread;
        message.unread = unread;

        return $q(function(resolve) {
            resolve();

        }).then(function() {
            return email.setFlags({
                folder: currentFolder(),
                message: message
            });

        }).then(function() {
            status.update('Online');

        }).catch(function(err) {
            if (err.code === 42) {
                // offline, restore
                message.unread = originalState;
                status.update('Unable to mark message in offline mode!');
                return;
            }

            status.update('Error on sync!');
            return dialog.error(err);
        });
    };

    /**
     * Mark all of the checked messages as either read or unread.
     * @param  {boolean} unread If the message should be marked as read or unread
     */
    $scope.markCheckedMessages = function(unread) {
        getCheckMessages().forEach(function(message) {
            $scope.markMessage(message, unread);
        });
    };

    /**
     * Flag a single message
     * @param  {Object}     message The message to be flagged
     * @param  {boolean}    flagged If the message should be flagged or unflagged
     */
    $scope.flagMessage = function(message, flagged) {
        if (!message || message.flagged === flagged) {
            return;
        }

        status.update(flagged ? 'Adding star to message...' : 'Removing star from message');

        var originalState = message.flagged;
        message.flagged = flagged;

        return $q(function(resolve) {
            resolve();

        }).then(function() {
            return email.setFlags({
                folder: currentFolder(),
                message: message
            });

        }).then(function() {
            status.update('Online');

        }).catch(function(err) {
            if (err.code === 42) {
                // offline, restore
                message.unread = originalState;
                status.update('Unable to ' + (flagged ? 'add star to' : 'remove star from') + ' message in offline mode!');
                return;
            }

            status.update('Error on sync!');
            return dialog.error(err);
        });
    };

    /**
     * Mark all of the checked messages as either flagged or unflagged.
     * @param  {boolean} flagged If the message should be marked as flagged or unflagged
     */
    $scope.flagCheckedMessages = function(flagged) {
        getCheckMessages().forEach(function(message) {
            $scope.flagMessage(message, flagged);
        });
    };

    /**
     * This method is called when the user changes the searchText
     */
    $scope.displaySearchResults = function(searchText) {
        $scope.$root.$broadcast('search', searchText);
    };

    //
    // scope state
    //

    // share local scope functions with root state
    $scope.state.actionBar = {
        markMessage: $scope.markMessage,
        flagMessage: $scope.flagMessage
    };

    //
    // Helper functions
    //

    function currentFolder() {
        return $scope.state.nav.currentFolder;
    }

    function getCheckMessages() {
        return currentFolder().messages.filter(function(message) {
            return message.checked;
        });
    }
};

module.exports = ActionBarCtrl;