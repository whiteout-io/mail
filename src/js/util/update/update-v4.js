'use strict';

/**
 * Update handler for transition database version 3 -> 4
 *
 * In database version 4, we need to add a "provider" flag to the
 * indexeddb. only gmail was allowed as a mail service provider before,
 * so let's add this...
 */
function update(options) {
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
    var emailAddress;
    return loadFromDB(EMAIL_ADDR_DB_KEY).then(function(address) {
        emailAddress = address;
        // load the provider (if existing)
        return loadFromDB(PROVIDER_DB_KEY);

    }).then(function(provider) {
        // if there is an email address without a provider, we need to add the missing provider entry
        // for any other situation, we're good.
        if (!(emailAddress && !provider)) {
            // update the database version to POST_UPDATE_DB_VERSION
            return options.appConfigStorage.storeList([POST_UPDATE_DB_VERSION], VERSION_DB_TYPE);
        }

        // add the missing provider key
        var storeProvider = options.appConfigStorage.storeList(['gmail'], PROVIDER_DB_KEY);
        // add the missing user name key
        var storeAdress = options.appConfigStorage.storeList([emailAddress], USERNAME_DB_KEY);
        // add the missing imap host info key
        var storeImap = options.appConfigStorage.storeList([imap], IMAP_DB_KEY);
        // add the missing empty real name
        var storeEmptyName = options.appConfigStorage.storeList([''], REALNAME_DB_KEY);
        // add the missing smtp host info key
        var storeSmtp = options.appConfigStorage.storeList([smtp], SMTP_DB_KEY);

        return Promise.all([storeProvider, storeAdress, storeImap, storeEmptyName, storeSmtp]).then(function() {
            // reload the credentials
            options.auth.initialized = false;
            return options.auth._loadCredentials();

        }).then(function() {
            // update the database version to POST_UPDATE_DB_VERSION
            return options.appConfigStorage.storeList([POST_UPDATE_DB_VERSION], VERSION_DB_TYPE);
        });
    });

    function loadFromDB(key) {
        return options.appConfigStorage.listItems(key).then(function(cachedItems) {
            return cachedItems && cachedItems[0];
        });
    }
}

module.exports = update;