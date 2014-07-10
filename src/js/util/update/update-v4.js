define(function() {
    'use strict';

    /**
     * Update handler for transition database version 3 -> 4
     *
     * In database version 4, we need to add a "provider" flag to the
     * indexeddb. only gmail was allowed as a mail service provider before,
     * so let's add this...
     */
    function update(options, callback) {
        var versionDbType = 'dbVersion',
            emailDbType = 'emailaddress',
            providerDbType = 'provider',
            postUpdateDbVersion = 4;

        // load the email address (if existing)
        loadFromDB(emailDbType, function(err, emailAddress) {
            if (err) {
                return callback(err);
            }

            // load the provider (if existing)
            loadFromDB(providerDbType, function(err, provider) {
                if (err) {
                    return callback(err);
                }

                // if there is an email address without a provider, we need to add the missing provider entry
                // for any other situation, we're good.
                
                if (!(emailAddress && !provider)) {
                    // update the database version to postUpdateDbVersion
                    return options.appConfigStorage.storeList([postUpdateDbVersion], versionDbType, callback);
                }

                // add the missing provider key
                options.appConfigStorage.storeList(['gmail'], providerDbType, function(err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    // update the database version to postUpdateDbVersion
                    options.appConfigStorage.storeList([postUpdateDbVersion], versionDbType, callback);
                });
            });
        });

        function loadFromDB(key, callback) {
            options.appConfigStorage.listItems(key, 0, null, function(err, cachedItems) {
                callback(err, (!err && cachedItems && cachedItems[0]));
            });
        }
    }

    return update;
});