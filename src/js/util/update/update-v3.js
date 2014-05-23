define(function() {
    'use strict';

    /**
     * Update handler for transition database version 2 -> 3
     *
     * In database version 3, we introduced new flags to the messages, also
     * the outbox uses artificial uids
     */
    function updateV2(options, callback) {
        var emailDbType = 'email_',
            versionDbType = 'dbVersion',
            postUpdateDbVersion = 3;

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

    return updateV2;
});