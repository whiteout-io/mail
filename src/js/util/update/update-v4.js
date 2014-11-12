'use strict';

/**
 * Update handler for transition database version 3 -> 4
 *
 * In database version 4, we need to add a "provider" flag to the
 * indexeddb. only gmail was allowed as a mail service provider before,
 * so let's add this...
 */
function update(options, callback) {
    var VERSION_DB_TYPE = 'dbVersion',
        EMAIL_ADDR_DB_KEY = 'emailaddress',
        USERNAME_DB_KEY = 'username',
        PROVIDER_DB_KEY = 'provider',
        IMAP_DB_KEY = 'imap',
        SMTP_DB_KEY = 'smtp',
        REALNAME_DB_KEY = 'realname',
        POST_UPDATE_DB_VERSION = 4;

    var imap = {
            host: 'imap.gmail.com',
            port: 993,
            secure: true
        },
        smtp = {
            host: 'smtp.gmail.com',
            port: 465,
            secure: true
        };

    // load the email address (if existing)
    loadFromDB(EMAIL_ADDR_DB_KEY, function(err, emailAddress) {
        if (err) {
            return callback(err);
        }

        // load the provider (if existing)
        loadFromDB(PROVIDER_DB_KEY, function(err, provider) {
            if (err) {
                return callback(err);
            }

            // if there is an email address without a provider, we need to add the missing provider entry
            // for any other situation, we're good.

            if (!(emailAddress && !provider)) {
                // update the database version to POST_UPDATE_DB_VERSION
                return options.appConfigStorage.storeList([POST_UPDATE_DB_VERSION], VERSION_DB_TYPE, callback);
            }

            // add the missing provider key
            options.appConfigStorage.storeList(['gmail'], PROVIDER_DB_KEY, function(err) {
                if (err) {
                    return callback(err);
                }

                // add the missing user name key
                options.appConfigStorage.storeList([emailAddress], USERNAME_DB_KEY, function(err) {
                    if (err) {
                        return callback(err);
                    }

                    // add the missing imap host info key
                    options.appConfigStorage.storeList([imap], IMAP_DB_KEY, function(err) {
                        if (err) {
                            return callback(err);
                        }

                        // add the missing empty real name
                        options.appConfigStorage.storeList([''], REALNAME_DB_KEY, function(err) {
                            if (err) {
                                return callback(err);
                            }

                            // add the missing smtp host info key
                            options.appConfigStorage.storeList([smtp], SMTP_DB_KEY, function(err) {
                                if (err) {
                                    return callback(err);
                                }

                                // reload the credentials
                                options.auth.initialized = false;
                                options.auth._loadCredentials(function(err) {
                                    if (err) {
                                        return callback(err);
                                    }


                                    // update the database version to POST_UPDATE_DB_VERSION
                                    options.appConfigStorage.storeList([POST_UPDATE_DB_VERSION], VERSION_DB_TYPE, callback);
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    function loadFromDB(key, callback) {
        options.appConfigStorage.listItems(key, 0, null, function(err, cachedItems) {
            callback(err, (!err && cachedItems && cachedItems[0]));
        });
    }
}

module.exports = update;