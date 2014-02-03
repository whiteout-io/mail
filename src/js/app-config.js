define(function(require) {
    'use strict';

    var _ = require('underscore'),
        app = {},
        cloudUrl, clientId;

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
        verificationUuidLength: 36
    };

    /**
     * Strings are maintained here
     */
    app.string = {
        subjectPrefix: '[whiteout] ',
        fallbackSubject: '(no subject)',
        invitationSubject: 'Invitation to a private conversation',
        invitationMessage: 'I would like to invite you to a private conversation!\n\nIn order to read my encrypted message please install the Whiteout Mail application. This application is used to read and write messages securely with strong encryption applied.\n\nGo to the Whiteout Networks homepage to learn more and to download the application: https://whiteout.io',
        message: 'Hi,\n\nthis is a private conversation. To read my encrypted message below, simply open it in Whiteout Mail.\n\nOpen Whiteout Mail: https://chrome.google.com/webstore/detail/jjgghafhamholjigjoghcfcekhkonijg',
        cryptPrefix: '-----BEGIN PGP MESSAGE-----',
        cryptSuffix: '-----END PGP MESSAGE-----',
        signature: 'Sent securely from Whiteout Mail',
        webSite: 'http://whiteout.io',
        verificationSubject: 'New public key uploaded',
        sendBtnInvite: 'Invite & send securely',
        sendBtnSecure: 'Send securely'
    };

    return app;
});