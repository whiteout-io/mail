'use strict';

var appController = require('../app-controller'),
    emailDao;

//
// Controller
//

var ActionBarCtrl = function($scope) {

    emailDao = appController._emailDao;

    /**
     * Move a single message from the currently selected folder to another folder
     * @param  {Object} message     The message that is to be moved
     * @param  {Object} destination The folder object where the message should be moved to
     */
    $scope.moveMessage = function(message, destination) {
        if (!message) {
            return;
        }

        // close read state
        $scope.state.read.open = false;

        $scope.state.mailList.updateStatus('Moving message...');

        emailDao.moveMessage({
            folder: currentFolder(),
            destination: destination,
            message: message
        }, function(err) {
            if (err) {
                // show errors where appropriate
                if (err.code === 42) {
                    $scope.select(message);
                    $scope.state.mailList.updateStatus('Unable to move message in offline mode!');
                    return;
                }
                $scope.state.mailList.updateStatus('Error during move!');
                $scope.onError(err);
                return;
            }
            $scope.state.mailList.updateStatus('Message moved.');
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

        $scope.state.mailList.updateStatus('Deleting message...');

        emailDao.deleteMessage({
            folder: currentFolder(),
            message: message
        }, function(err) {
            if (err) {
                // show errors where appropriate
                if (err.code === 42) {
                    $scope.select(message);
                    $scope.state.mailList.updateStatus('Unable to delete message in offline mode!');
                    return;
                }
                $scope.state.mailList.updateStatus('Error during delete!');
                $scope.onError(err);
                return;
            }
            $scope.state.mailList.updateStatus('Message deleted.');
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
    $scope.markMessage = function(message, unread) {
        if (!message) {
            return;
        }

        $scope.state.mailList.updateStatus('Updating unread flag...');

        // close read state
        $scope.state.read.open = false;

        var originalState = message.unread;
        message.unread = unread;
        emailDao.setFlags({
            folder: currentFolder(),
            message: message
        }, function(err) {
            if (err && err.code === 42) {
                // offline, restore
                message.unread = originalState;
                $scope.state.mailList.updateStatus('Unable to mark message in offline mode!');
                return;
            }

            if (err) {
                $scope.state.mailList.updateStatus('Error on sync!');
                $scope.onError(err);
                return;
            }

            $scope.state.mailList.updateStatus('Online');
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

    // share local scope functions with root state
    $scope.state.actionBar = {
        markMessage: $scope.markMessage
    };

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