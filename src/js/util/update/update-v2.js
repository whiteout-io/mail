'use strict';

/**
 * Update handler for transition database version 1 -> 2
 *
 * In database version 2, the stored email objects have to be purged, because the
 * new data model stores information about the email structure in the property 'bodyParts'.
 */
function updateV2(options, callback) {
    var emailDbType = 'email_',
        versionDbType = 'dbVersion',
        postUpdateDbVersion = 2;

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

exports = updateV2;