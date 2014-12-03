'use strict';

var JUNK_FOLDER_TYPE = 'Junk';

var ActionBarCtrl = function($scope, email, dialog, statusDisplay) {

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
        $scope.state.read.open = false;

        statusDisplay.update('Moving message...');

        email.moveMessage({
            folder: currentFolder(),
            destination: destination,
            message: message
        }, function(err) {
            if (err) {
                // show errors where appropriate
                if (err.code === 42) {
                    $scope.select(message);
                    statusDisplay.update('Unable to move message in offline mode!');
                    return;
                }
                statusDisplay.update('Error during move!');
                dialog.error(err);
                return;
            }
            statusDisplay.update('Message moved.');
            $scope.$apply();
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
        $scope.state.read.open = false;

        statusDisplay.update('Deleting message...');

        email.deleteMessage({
            folder: currentFolder(),
            message: message
        }, function(err) {
            if (err) {
                // show errors where appropriate
                if (err.code === 42) {
                    $scope.select(message);
                    statusDisplay.update('Unable to delete message in offline mode!');
                    return;
                }
                statusDisplay.update('Error during delete!');
                dialog.error(err);
                return;
            }
            statusDisplay.update('Message deleted.');
            $scope.$apply();
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

        statusDisplay.update('Updating unread flag...');

        // close read state
        if (!keepOpen) {
            $scope.state.read.open = false;
        }

        var originalState = message.unread;
        message.unread = unread;
        email.setFlags({
            folder: currentFolder(),
            message: message
        }, function(err) {
            if (err && err.code === 42) {
                // offline, restore
                message.unread = originalState;
                statusDisplay.update('Unable to mark message in offline mode!');
                return;
            }

            if (err) {
                statusDisplay.update('Error on sync!');
                dialog.error(err);
                return;
            }

            statusDisplay.update('Online');
            $scope.$apply();
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

        statusDisplay.update(flagged ? 'Adding star to message...' : 'Removing star from message');

        var originalState = message.flagged;
        message.flagged = flagged;
        email.setFlags({
            folder: currentFolder(),
            message: message
        }, function(err) {
            if (err && err.code === 42) {
                // offline, restore
                message.unread = originalState;
                statusDisplay.update('Unable to ' + (flagged ? 'add star to' : 'remove star from') + ' message in offline mode!');
                return;
            }

            if (err) {
                statusDisplay.update('Error on sync!');
                dialog.error(err);
                return;
            }

            statusDisplay.update('Online');
            $scope.$apply();
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

    // share local scope functions with root state
    $scope.state.actionBar = {
        markMessage: $scope.markMessage,
        flagMessage: $scope.flagMessage
    };

    function currentFolder() {
        return $scope.state.nav.currentFolder;
    }

    function getCheckMessages() {
        return currentFolder().messages.filter(function(message) {
            return message.checked;
        });
    }

    /**
     * This method is called when the user changes the searchText
     */
    $scope.displaySearchResults = function(searchText) {
        $scope.$root.$broadcast('search', searchText);
    };
};

module.exports = ActionBarCtrl;