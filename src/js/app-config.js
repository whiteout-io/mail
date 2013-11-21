define(function(require) {
    'use strict';

    var _ = require('underscore'),
        app = {},
        cloudUrl, clientId;

    // parse manifest to get configurations for current runtime
    try {
        var manifest = chrome.runtime.getManifest();
        cloudUrl = _.find(manifest.permissions, function(permission) {
            return typeof permission === 'string' && permission.indexOf('http') === 0;
        });
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
        verificationUrl: '/verify/'
    };

    /**
     * Strings are maintained here
     */
    app.string = {
        subjectPrefix: '[whiteout] ',
        invitationSubject: 'Invitation to a private conversation',
        invitationMessage: 'I would like to invite you to a private conversation. To read my encrypted messages, simply install Whiteout Mail for Chrome. The app is really easy to use and automatically encrypts sent emails, so that only the two of us can read them.\n\nOpen Whiteout Mail: https://chrome.google.com/webstore/detail/jjgghafhamholjigjoghcfcekhkonijg',
        message: 'this is a private conversation. To read my encrypted message below, simply install Whiteout Mail for Chrome. The app is really easy to use and automatically encrypts sent emails, so that only the two of us can read them.\n\nOpen Whiteout Mail: https://chrome.google.com/webstore/detail/jjgghafhamholjigjoghcfcekhkonijg',
        cryptPrefix: '-----BEGIN PGP MESSAGE-----',
        cryptSuffix: '-----END PGP MESSAGE-----',
        signature: 'Sent securely from whiteout mail',
        webSite: 'http://whiteout.io',
        verificationSubject: 'New public key uploaded'
    };

    return app;
});