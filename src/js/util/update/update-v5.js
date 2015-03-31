'use strict';

var FOLDER_TYPE_INBOX = 'Inbox';
var FOLDER_TYPE_SENT = 'Sent';
var FOLDER_TYPE_DRAFTS = 'Drafts';
var FOLDER_TYPE_TRASH = 'Trash';

var FOLDER_DB_TYPE = 'folders';
var VERSION_DB_TYPE = 'dbVersion';

var POST_UPDATE_DB_VERSION = 5;

/**
 * Update handler for transition database version 4 -> 5
 *
 * Due to an overlooked issue, there may be multiple folders, e.g. for sent mails.
 * This removes the "duplicate" folders.
 */
function update(options) {
    // remove the emails
    return options.userStorage.listItems(FOLDER_DB_TYPE).then(function(stored) {
        var folders = stored[0] || [];
        [FOLDER_TYPE_INBOX, FOLDER_TYPE_SENT, FOLDER_TYPE_DRAFTS, FOLDER_TYPE_TRASH].forEach(function(mbxType) {
            var foldersForType = folders.filter(function(mbx) {
                return mbx.type === mbxType;
            });

            if (foldersForType.length <= 1) {
                return; // nothing to do here
            }

            // remove duplicate folders
            for (var i = 1; i < foldersForType.length; i++) {
                folders.splice(folders.indexOf(foldersForType[i]), 1);
            }
        });
        return options.userStorage.storeList([folders], FOLDER_DB_TYPE);

    }).then(function() {
        // update the database version to POST_UPDATE_DB_VERSION
        return options.appConfigStorage.storeList([POST_UPDATE_DB_VERSION], VERSION_DB_TYPE);
    });
}

module.exports = update;