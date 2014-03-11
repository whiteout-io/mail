define(function() {
    'use strict';

    /**
     * Update handler for transition databasae version 0 -> 1
     *
     * In database version 1, the stored email objects have to be purged, otherwise
     * every non-prefixed mail in the IMAP folders would be nuked due to the implementation
     * of the delta sync.
     */
    function updateV1(options, callback) {
        var emailDbType = 'email_',
            versionDbType = 'dbVersion',
            postUpdateDbVersion = 1;

        // remove the emails
        options.userStorage.removeList(emailDbType, function(err) {
            if (err) {
                callback(err);
                return;
            }

            // update the database version to postUpdateDbVersion
            options.appConfigStorage.storeList([postUpdateDbVersion], versionDbType, callback);
        });
    }

    return updateV1;
});