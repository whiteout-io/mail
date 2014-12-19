'use strict';

/**
 * Update handler for transition database version 1 -> 2
 *
 * In database version 2, the stored email objects have to be purged, because the
 * new data model stores information about the email structure in the property 'bodyParts'.
 */
function updateV2(options) {
    var emailDbType = 'email_',
        versionDbType = 'dbVersion',
        postUpdateDbVersion = 2;

    // remove the emails
    return options.userStorage.removeList(emailDbType).then(function() {
        // update the database version to postUpdateDbVersion
        return options.appConfigStorage.storeList([postUpdateDbVersion], versionDbType);
    });
}

module.exports = updateV2;