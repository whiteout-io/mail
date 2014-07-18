define(function(require) {
    'use strict';

    var _ = require('underscore'),
        app = {},
        appVersion, cloudUrl, keychainUrl, clientId;

    // parse manifest to get configurations for current runtime
    try {
        var manifest = chrome.runtime.getManifest();
        // get key server base url
        cloudUrl = _.find(manifest.permissions, function(permission) {
            return typeof permission === 'string' && permission.indexOf('https://keys') === 0;
        });
        // remove last '/' from url due to required syntax in manifest
        cloudUrl = cloudUrl.substring(0, cloudUrl.length - 1);
        // get keychain server base url
        keychainUrl = _.find(manifest.permissions, function(permission) {
            return typeof permission === 'string' && permission.indexOf('https://keychain') === 0;
        });
        // remove last '/' from url due to required syntax in manifest
        keychainUrl = keychainUrl.substring(0, keychainUrl.length - 1);
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
        privkeyServerUrl: keychainUrl || 'https://keychain.whiteout.io',
        serverPrivateKeyId: 'EE342F0DDBB0F3BE',
        symKeySize: 256,
        symIvSize: 96,
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
        message: 'Hi,\n\nthis is a private conversation. To read my encrypted message below, simply open it in Whiteout Mail.\nOpen Whiteout Mail: https://chrome.google.com/webstore/detail/jjgghafhamholjigjoghcfcekhkonijg\n\n\n',
        signature: '\n\n\n--\nSent from Whiteout Mail - Email encryption for the rest of us\nhttps://whiteout.io\n\n',
        webSite: 'http://whiteout.io',
        verificationSubject: '[whiteout] New public key uploaded',
        sendBtnClear: 'Send',
        sendBtnSecure: 'Send securely',
        updatePublicKeyTitle: 'Public Key Updated',
        updatePublicKeyMsgNewKey: '{0} updated his key and may not be able to read encrypted messages sent with his old key. Update the key?',
        updatePublicKeyMsgRemovedKey: '{0} revoked his key and may no longer be able to read encrypted messages. Remove the key?',
        updatePublicKeyPosBtn: 'Yes',
        updatePublicKeyNegBtn: 'No',
        bugReportTitle: 'Report a bug',
        bugReportSubject: '[Bug] I want to report a bug',
        bugReportBody: 'Steps to reproduce\n1. \n2. \n3. \n\nWhat happens?\n\n\nWhat do you expect to happen instead?\n\n\n\n== PLEASE DONT PUT ANY KEYS HERE! ==\n\n\n## Log\n\nBelow is the log. It includes your interactions with your email provider in an anonymized way from the point where you started the app for the last time. Any information provided by you will be used for the porpose of locating and fixing the bug you reported. It will be deleted subsequently. However, you can edit this log and/or remove log data in the event that something would show up.\n\n',
        supportAddress: 'mail.support@whiteout.io'
    };

    return app;
});