'use strict';

var appCfg = {};

var ngModule = angular.module('woAppConfig', []);
ngModule.factory('appConfig', function() {
    return appCfg;
});
module.exports = appCfg;

/**
 * Global app configurations
 */
appCfg.config = {
    pgpComment: 'Whiteout Mail - https://whiteout.io',
    keyServerUrl: 'https://keys.whiteout.io',
    hkpUrl: 'http://keyserver.ubuntu.com',
    adminUrl: 'https://admin-node.whiteout.io',
    settingsUrl: 'https://settings.whiteout.io/autodiscovery/',
    mailServer: {
        domain: 'wmail.io',
        imap: {
            hostname: 'imap.wmail.io',
            port: 993,
            secure: true
        },
        smtp: {
            hostname: 'smtp.wmail.io',
            port: 465,
            secure: true
        }
    },
    oauthDomains: [/\.gmail\.com$/, /\.googlemail\.com$/],
    ignoreUploadOnSentDomains: [/\.gmail\.com$/, /\.googlemail\.com$/],
    serverPrivateKeyId: 'EE342F0DDBB0F3BE',
    symKeySize: 256,
    symIvSize: 96,
    asymKeySize: 2048,
    workerPath: 'js',
    reconnectInterval: 10000,
    checkOutboxInterval: 5000,
    iconPath: '/img/icon-128-chrome.png',
    verificationUrl: '/verify/',
    verificationUuidLength: 36,
    dbVersion: 6,
    appVersion: undefined,
    outboxMailboxPath: 'OUTBOX',
    outboxMailboxName: 'Outbox',
    outboxMailboxType: 'Outbox',
    connDocTimeout: 5000,
    imapUpdateBatchSize: 25
};

// parse manifest to get configurations for current runtime
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
    setConfigParams(chrome.runtime.getManifest());
} else if (typeof $ !== 'undefined' && $.get) {
    $.get('/manifest.json', setConfigParams, 'json');
}

function setConfigParams(manifest) {
    var cfg = appCfg.config;

    function getUrl(beginsWith) {
        return _.find(manifest.permissions, function(permission) {
            return typeof permission === 'string' && permission.indexOf(beginsWith) === 0;
        }).replace(/\/$/, ''); // remove last '/' from url due to required syntax in manifest
    }

    // get key server base url
    cfg.keyServerUrl = getUrl('https://keys');
    // get the app version
    cfg.appVersion = manifest.version;
}

/**
 * Strings are maintained here
 */
appCfg.string = {
    fallbackSubject: '(no subject)',
    invitationSubject: 'Invitation to a private conversation',
    invitationMessage: 'Hi,\n\nI use Whiteout Mail to send and receive encrypted email. I would like to exchange encrypted messages with you as well.\n\nPlease install the Whiteout Mail application. This application makes it easy to read and write messages securely with PGP encryption applied.\n\nGo to the Whiteout Networks homepage to learn more and to download the application: https://whiteout.io\n\n',
    signature: '\n\n\n--\nSent from Whiteout Mail - https://whiteout.io\n\nMy PGP key: ',
    webSite: 'http://whiteout.io',
    verificationSubject: '[whiteout] New public key uploaded',
    sendBtnClear: 'Send',
    sendBtnSecure: 'Send securely',
    updatePublicKeyTitle: 'Public Key Updated',
    updatePublicKeyMsgNewKey: '{0} updated his key and may not be able to read encrypted messages sent with his old key. Update the key?',
    updatePublicKeyMsgRemovedKey: '{0} revoked his key and may no longer be able to read encrypted messages. Remove the key?',
    updatePublicKeyPosBtn: 'Yes',
    updatePublicKeyNegBtn: 'No',
    outdatedCertificateTitle: 'Warning',
    outdatedCertificateMessage: 'The SSL certificate for the mail server {0} changed, the connection was refused.',
    updateCertificateTitle: 'Warning',
    updateCertificateMessage: 'The SSL certificate for the mail server {0} changed. Do you want to proceed?',
    updateCertificatePosBtn: 'Yes',
    updateCertificateNegBtn: 'No',
    certificateFaqLink: 'https://github.com/whiteout-io/mail-html5/wiki/FAQ#what-does-the-ssl-certificate-for-the-mail-server--changed-mean',
    bugReportTitle: 'Report a bug',
    bugReportSubject: '[Bug] I want to report a bug',
    bugReportBody: 'Steps to reproduce\n1. \n2. \n3. \n\nWhat happens?\n\n\nWhat do you expect to happen instead?\n\n\n\n== PLEASE DONT PUT ANY KEYS HERE! ==\n\n\n## Log\n\nBelow is the log. It includes your interactions with your email provider from the point where you started the app for the last time. Login data and email content has been stripped. Any information provided by you will be used for the purpose of locating and fixing the bug you reported. It will be deleted subsequently. However, you can edit this log and/or remove log data in the event that something would show up.\n\nUser-Agent: {0}\nVersion: {1}\n\n',
    supportAddress: 'mail.support@whiteout.io',
    connDocOffline: 'It appears that you are offline. Please retry when you are online.',
    connDocTlsWrongCert: 'A connection to {0} was rejected because the TLS certificate is invalid. Please have a look at the FAQ for information on how to fix this error.',
    connDocHostUnreachable: 'We could not establish a connection to {0}. Please check the server settings!',
    connDocHostTimeout: 'We could not establish a connection to {0} within {1} ms. Please check the server settings and encryption mode!',
    connDocAuthRejected: 'Your credentials for {0} were rejected. Please check your username and password!',
    connDocNoInbox: 'We could not detect an IMAP inbox folder on {0}.  Please have a look at the FAQ for information on how to fix this error.',
    connDocGenericError: 'There was an error connecting to {0}: {1}',
    logoutTitle: 'Logout',
    logoutMessage: 'Are you sure you want to log out? Please back up your encryption key before proceeding!',
    removePreAuthAccountTitle: 'Remove account',
    removePreAuthAccountMessage: 'Are you sure you want to remove your account from this device?'
};