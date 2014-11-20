'use strict';

var ngModule = angular.module('woUtil');
ngModule.service('connectionDoctor', ConnectionDoctor);
module.exports = ConnectionDoctor;

var TCPSocket = require('tcp-socket'),
    ImapClient = require('imap-client'),
    SmtpClient = require('wo-smtpclient');

/**
 * The connection doctor can check your connection. In essence, it reconstructs what happens when
 * the app goes online in an abbreviated way. You need to configure() the instance with the IMAP/SMTP
 * credentials before running check()!
 *
 * @constructor
 */
function ConnectionDoctor(appConfig) {
    this._appConfig = appConfig;
    this._workerPath = appConfig.config.workerPath + '/tcp-socket-tls-worker.min.js';
}

//
// Error codes
//

var OFFLINE = ConnectionDoctor.OFFLINE = 42;
var TLS_WRONG_CERT = ConnectionDoctor.TLS_WRONG_CERT = 43;
var HOST_UNREACHABLE = ConnectionDoctor.HOST_UNREACHABLE = 44;
var HOST_TIMEOUT = ConnectionDoctor.HOST_TIMEOUT = 45;
var AUTH_REJECTED = ConnectionDoctor.AUTH_REJECTED = 46;
var NO_INBOX = ConnectionDoctor.NO_INBOX = 47;
var GENERIC_ERROR = ConnectionDoctor.GENERIC_ERROR = 48;

//
// Public API
//

/**
 * Configures the connection doctor
 *
 * @param {Object} credentials.imap IMAP configuration (host:string, port:number, secure:boolean, ignoreTLS:boolean)
 * @param {Object} credentials.smtp SMTP configuration (host:string, port:number, secure:boolean, ignoreTLS:boolean)
 * @param {String} credentials.username
 * @param {String} credentials.password
 */
ConnectionDoctor.prototype.configure = function(credentials) {
    this.credentials = credentials;

    // internal members
    this._imap = new ImapClient({
        host: this.credentials.imap.host,
        port: this.credentials.imap.port,
        secure: this.credentials.imap.secure,
        ignoreTLS: this.credentials.imap.ignoreTLS,
        ca: this.credentials.imap.ca,
        tlsWorkerPath: this._workerPath,
        auth: {
            user: this.credentials.username,
            pass: this.credentials.password,
            xoauth2: this.credentials.xoauth2
        }
    });

    this._smtp = new SmtpClient(this.credentials.smtp.host, this.credentials.smtp.port, {
        useSecureTransport: this.credentials.smtp.secure,
        ignoreTLS: this.credentials.smtp.ignoreTLS,
        ca: this.credentials.smtp.ca,
        tlsWorkerPath: this._workerPath,
        auth: {
            user: this.credentials.username,
            pass: this.credentials.password,
            xoauth2: this.credentials.xoauth2
        }
    });
};

/**
 * It conducts the following tests for IMAP and SMTP, respectively:
 * 1) Check if browser is online
 * 2) Connect to host:port via TCP/TLS
 * 3) Login to the server
 * 4) Perform some basic commands (e.g. list folders)
 * 5) Exposes error codes
 *
 * @param {Function} callback(error) Invoked when the test suite passed, or with an error object if something went wrong
 */
ConnectionDoctor.prototype.check = function(callback) {
    var self = this;

    if (!self.credentials) {
        return callback(new Error('You need to configure() the connection doctor first!'));
    }

    self._checkOnline(function(error) {
        if (error) {
            return callback(error);
        }

        self._checkReachable(self.credentials.imap, function(error) {
            if (error) {
                return callback(error);
            }

            self._checkReachable(self.credentials.smtp, function(error) {
                if (error) {
                    return callback(error);
                }

                self._checkImap(function(error) {
                    if (error) {
                        return callback(error);
                    }

                    self._checkSmtp(callback);
                });
            });
        });
    });
};


//
// Internal API
//

/**
 * Checks if the browser is online
 *
 * @param {Function} callback(error) Invoked when the test suite passed, or with an error object if browser is offline
 */
ConnectionDoctor.prototype._checkOnline = function(callback) {
    if (navigator.onLine) {
        callback();
    } else {
        callback(createError(OFFLINE, this._appConfig.string.connDocOffline));
    }
};

/**
 * Checks if a host is reachable via TCP
 *
 * @param {String} options.host
 * @param {Number} options.port
 * @param {Boolean} options.secure
 * @param {Function} callback(error) Invoked when the test suite passed, or with an error object if something went wrong
 */
ConnectionDoctor.prototype._checkReachable = function(options, callback) {
    var socket,
        error, // remember the error message
        timeout, // remember the timeout object
        host = options.host + ':' + options.port,
        hasTimedOut = false, // prevents multiple callbacks
        cfg = this._appConfig.config;

    timeout = setTimeout(function() {
        hasTimedOut = true;
        callback(createError(HOST_TIMEOUT, this._appConfig.string.connDocHostTimeout.replace('{0}', host).replace('{1}', cfg.connDocTimeout)));
    }, cfg.connDocTimeout);

    socket = TCPSocket.open(options.host, options.port, {
        binaryType: 'arraybuffer',
        useSecureTransport: options.secure,
        ca: options.ca,
        tlsWorkerPath: this._workerPath
    });

    socket.ondata = function() {}; // we don't actually care about the data

    // [WO-625] Mozilla forbids extensions to the TCPSocket object,
    // throws an exception when assigned unexpected callback functions.
    // The exception can be safely ignored since we need the callback
    // for the other shims
    try {
        socket.oncert = function() {
            if (options.ca) {
                // the certificate we already have is outdated
                error = createError(TLS_WRONG_CERT, this._appConfig.string.connDocTlsWrongCert.replace('{0}', host));
            }
        };
    } catch (e) {}

    socket.onerror = function(e) {
        if (!error) {
            error = createError(HOST_UNREACHABLE, this._appConfig.string.connDocHostUnreachable.replace('{0}', host), e.data);
        }
    };

    socket.onopen = function() {
        socket.close();
    };

    socket.onclose = function() {
        if (!hasTimedOut) {
            clearTimeout(timeout);
            callback(error);
        }
    };
};

/**
 * Checks if an IMAP server is reachable, accepts the credentials, can list folders and has an inbox and logs out.
 * Adds the certificate to the IMAP settings if not provided.
 *
 * @param {Function} callback(error) Invoked when the test suite passed, or with an error object if something went wrong
 */
ConnectionDoctor.prototype._checkImap = function(callback) {
    var self = this,
        loggedIn = false,
        host = self.credentials.imap.host + ':' + self.credentials.imap.port;


    self._imap.onCert = function(pemEncodedCert) {
        if (!self.credentials.imap.ca) {
            self.credentials.imap.ca = pemEncodedCert;
        }
    };

    // login and logout do not use error objects in the callback, but rather invoke
    // the global onError handler, so we need to track if login was successful
    self._imap.onError = function(error) {
        if (!loggedIn) {
            callback(createError(AUTH_REJECTED, this._appConfig.string.connDocAuthRejected.replace('{0}', host), error));
        } else {
            callback(createError(GENERIC_ERROR, this._appConfig.string.connDocGenericError.replace('{0}', host).replace('{1}', error.message), error));
        }
    };

    self._imap.login(function() {
        loggedIn = true;

        self._imap.listWellKnownFolders(function(error, wellKnownFolders) {
            if (error) {
                return callback(createError(GENERIC_ERROR, this._appConfig.string.connDocGenericError.replace('{0}', host).replace('{1}', error.message), error));
            }

            if (wellKnownFolders.Inbox.length === 0) {
                // the client needs at least an inbox folder to work properly
                return callback(createError(NO_INBOX, this._appConfig.string.connDocNoInbox.replace('{0}', host)));
            }

            self._imap.logout(function() {
                callback();
            });
        });
    });
};

/**
 * Checks if an SMTP server is reachable and accepts the credentials and logs out.
 * Adds the certificate to the SMTP settings if not provided.
 *
 * @param {Function} callback(error) Invoked when the test suite passed, or with an error object if something went wrong
 */
ConnectionDoctor.prototype._checkSmtp = function(callback) {
    var self = this,
        host = self.credentials.smtp.host + ':' + self.credentials.smtp.port,
        errored = false; // tracks if we need to invoke the callback at onclose or not

    self._smtp.oncert = function(pemEncodedCert) {
        if (!self.credentials.smtp.ca) {
            self.credentials.smtp.ca = pemEncodedCert;
        }
    };

    self._smtp.onerror = function(error) {
        if (error) {
            errored = true;
            callback(createError(AUTH_REJECTED, this._appConfig.string.connDocAuthRejected.replace('{0}', host), error));
        }
    };

    self._smtp.onidle = function() {
        self._smtp.quit();
    };

    self._smtp.onclose = function() {
        if (!errored) {
            callback();
        }
    };

    self._smtp.connect();
};


//
// Helper Functions
//

function createError(code, message, underlyingError) {
    var error = new Error(message);
    error.code = code;
    error.underlyingError = underlyingError;

    return error;
}