'use strict';

/**
 * Update handler for transition database version 0 -> 1
 *
 * In database version 1, the stored email objects have to be purged, otherwise
 * every non-prefixed mail in the IMAP folders would be nuked due to the implementation
 * of the delta sync.
 */
function updateV1(options) {
    var emailDbType = 'email_',
        versionDbType = 'dbVersion',
        postUpdateDbVersion = 1;

    // remove the emails
    return options.userStorage.removeList(emailDbType).then(function() {
        // update the database version to postUpdateDbVersion
        return options.appConfigStorage.storeList([postUpdateDbVersion], versionDbType);
    });
}

module.exports = updateV1;