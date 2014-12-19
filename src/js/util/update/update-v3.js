'use strict';

/**
 * Update handler for transition database version 2 -> 3
 *
 * In database version 3, we introduced new flags to the messages, also
 * the outbox uses artificial uids
 */
function update(options) {
    var emailDbType = 'email_',
        versionDbType = 'dbVersion',
        postUpdateDbVersion = 3;

    // remove the emails
    return options.userStorage.removeList(emailDbType).then(function() {
        // update the database version to postUpdateDbVersion
        return options.appConfigStorage.storeList([postUpdateDbVersion], versionDbType);
    });
}

module.exports = update;