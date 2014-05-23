define(function(require) {
    'use strict';

    var _ = require('underscore'),
        app = {},
        appVersion, cloudUrl, clientId;

    // parse manifest to get configurations for current runtime
    try {
        var manifest = chrome.runtime.getManifest();
        // get key server base url
        cloudUrl = _.find(manifest.permissions, function(permission) {
            return typeof permission === 'string' && permission.indexOf('https://keys') === 0;
        });
        // remove last '/' from url due to required syntax in manifest
        cloudUrl = cloudUrl.substring(0, cloudUrl.length - 1);
        // get client ID for OAuth requests
        clientId = manifest.oauth2.client_id;
        // get the app version
        appVersion = manifest.version;
    } catch (e) {}

    /**
     * Global app configurations
     */
    app.config = {
        cloudUrl: cloudUrl || 'https://keys.whiteout.io',
        symKeySize: 128,
        symIvSize: 128,
        asymKeySize: 2048,
        workerPath: 'js',
        gmail: {
            clientId: clientId || '440907777130.apps.googleusercontent.com',
            imap: {
                secure: true,
                port: 993,
                host: 'imap.gmail.com'
            },
            smtp: {
                secure: true,
                port: 465,
                host: 'smtp.gmail.com'
            }
        },
        checkOutboxInterval: 5000,
        iconPath: '/img/icon.png',
        verificationUrl: '/verify/',
        verificationUuidLength: 36,
        dbVersion: 3,
        appVersion: appVersion,
        outboxMailboxPath: 'OUTBOX',
        outboxMailboxType: 'Outbox'
    };

    /**
     * Strings are maintained here
     */
    app.string = {
        fallbackSubject: '(no subject)',
        invitationSubject: 'Invitation to a private conversation',
        invitationMessage: 'Hi,\n\nI use Whiteout Mail to send and receive encrypted email. I would like to exchange encrypted messages with you as well.\n\nPlease install the Whiteout Mail application. This application makes it easy to read and write messages securely with PGP encryption applied.\n\nGo to the Whiteout Networks homepage to learn more and to download the application: https://whiteout.io\n\n',
        message: 'Hi,\n\nthis is a private conversation. To read my encrypted message below, simply open it in Whiteout Mail.\nOpen Whiteout Mail: https://chrome.google.com/webstore/detail/jjgghafhamholjigjoghcfcekhkonijg',
        cryptPrefix: '-----BEGIN PGP MESSAGE-----',
        cryptSuffix: '-----END PGP MESSAGE-----',
        signature: '\n\n\n--\nSent from Whiteout Mail - Email encryption for the rest of us\nhttps://whiteout.io\n\n',
        webSite: 'http://whiteout.io',
        verificationSubject: '[whiteout] New public key uploaded',
        sendBtnClear: 'Send',
        sendBtnSecure: 'Send securely'
    };

    return app;
});