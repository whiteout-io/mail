'use strict';

var MSG_PART_ATTR_CONTENT = 'content';
var MSG_PART_TYPE_TEXT = 'text';

var ngModule = angular.module('woServices');
ngModule.service('publickeyVerifier', PublickeyVerifier);
module.exports = PublickeyVerifier;

var ImapClient = require('imap-client');

function PublickeyVerifier(auth, appConfig, mailreader, keychain) {
    this._appConfig = appConfig;
    this._mailreader = mailreader;
    this._keychain = keychain;
    this._auth = auth;
    this._workerPath = appConfig.config.workerPath + '/tcp-socket-tls-worker.min.js';
    this._keyServerUrl = this._appConfig.config.keyServerUrl;
}

//
// Public API
//

PublickeyVerifier.prototype.configure = function() {
    var self = this;

    return self._auth.getCredentials().then(function(credentials) {
        // tls socket worker path for multithreaded tls in non-native tls environments
        credentials.imap.tlsWorkerPath = self._appConfig.config.workerPath + '/tcp-socket-tls-worker.min.js';
        self._imap = new ImapClient(credentials.imap);
    });
};

PublickeyVerifier.prototype.uploadPublicKey = function() {
    if (this.keypair) {
        return this._keychain.uploadPublicKey(this.keypair.publicKey);
    }
    return new Promise(function(resolve) {
        resolve();
    });
};

PublickeyVerifier.prototype.persistKeypair = function() {
    if (this.keypair) {
        return this._keychain.putUserKeyPair(this.keypair);
    }
    return new Promise(function(resolve) {
        resolve();
    });
};

PublickeyVerifier.prototype.verify = function() {
    var self = this,
        verificationSuccessful = false;

    // have to wrap it in a promise to catch .onError of imap-client
    return new Promise(function(resolve, reject) {
        self._imap.onError = reject;

        // login
        self._imap.login().then(function() {
            // list folders
            return self._imap.listWellKnownFolders();
        }).then(function(wellKnownFolders) {
            var paths = []; // gathers paths

            // extract the paths from the folder arrays
            for (var folderType in wellKnownFolders) {
                if (wellKnownFolders.hasOwnProperty(folderType) && Array.isArray(wellKnownFolders[folderType])) {
                    paths = paths.concat(_.pluck(wellKnownFolders[folderType], 'path'));
                }
            }
            return paths;

        }).then(function(paths) {
            return self._searchAll(paths); // search

        }).then(function(candidates) {
            if (!candidates.length) {
                // nothing here to potentially verify
                verificationSuccessful = false;
                return;
            }

            // verify everything that looks like a verification mail
            return self._verifyAll(candidates).then(function(success) {
                verificationSuccessful = success;
            });

        }).then(function() {
            // at this point, we don't care about errors anymore
            self._imap.onError = function() {};
            self._imap.logout();

            if (!verificationSuccessful) {
                // nothing unexpected went wrong, but no public key could be verified
                throw new Error();
            }

            resolve(); // we're done

        }).catch(reject);
    });
};

PublickeyVerifier.prototype._searchAll = function(paths) {
    var self = this,
        candidates = []; // gather matching uids

    // async for-loop inside a then-able
    return new Promise(next);

    // search each path for the relevant email
    function next(resolve) {
        if (!paths.length) {
            resolve(candidates);
            return;
        }

        var path = paths.shift();
        self._imap.search({
            path: path,
            header: ['Subject', self._appConfig.string.verificationSubject]
        }).then(function(uids) {
            uids.forEach(function(uid) {
                candidates.push({
                    path: path,
                    uid: uid
                });
            });
            next(resolve); // keep on searching
        }).catch(function() {
            next(resolve); // if there's an error, just search the next inbox
        });
    }
};

PublickeyVerifier.prototype._verifyAll = function(candidates) {
    var self = this;

    // async for-loop inside a then-able
    return new Promise(next);

    function next(resolve) {
        if (!candidates.length) {
            resolve(false);
            return;
        }

        var candidate = candidates.shift();
        self._verify(candidate.path, candidate.uid).then(function(success) {
            if (success) {
                resolve(success); // we're done here
            } else {
                next(resolve);
            }
        }).catch(function() {
            next(resolve); // ignore
        });
    }
};


PublickeyVerifier.prototype._verify = function(path, uid) {
    var self = this,
        message;

    // get the metadata for the message
    return self._imap.listMessages({
        path: path,
        firstUid: uid,
        lastUid: uid
    }).then(function(messages) {
        if (!messages.length) {
            // message has been deleted in the meantime
            throw new Error('Message has already been deleted');
        }

        // remember in scope
        message = messages[0];

    }).then(function() {
        // get the body for the message
        return self._imap.getBodyParts({
            path: path,
            uid: uid,
            bodyParts: message.bodyParts
        });

    }).then(function() {
        // parse the message
        return new Promise(function(resolve, reject) {
            self._mailreader.parse(message, function(err, root) {
                if (err) {
                    reject(err);
                } else {
                    resolve(root);
                }
            });
        });

    }).then(function(root) {
        // extract the nonce
        var body = _.pluck(filterBodyParts(root, MSG_PART_TYPE_TEXT), MSG_PART_ATTR_CONTENT).join('\n'),
            verificationUrlPrefix = self._keyServerUrl + self._appConfig.config.verificationUrl,
            uuid = body.split(verificationUrlPrefix).pop().substr(0, self._appConfig.config.verificationUuidLength),
            uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

        // there's no valid uuid in the message, so forget about it
        if (!uuidRegex.test(uuid)) {
            throw new Error('No public key verifier found!');
        }

        // there's a valid uuid in the message, so try to verify it
        return self._keychain.verifyPublicKey(uuid).catch(function(err) {
            throw new Error('Verifying your public key failed: ' + err.message);
        });

    }).then(function() {
        return self._imap.deleteMessage({
            path: path,
            uid: uid
        }).catch(function() {}); // ignore error here
    }).then(function() {
        return true;
    });
};

/**
 * Helper function that recursively traverses the body parts tree. Looks for bodyParts that match the provided type and aggregates them
 *
 * @param {Array} bodyParts The bodyParts array
 * @param {String} type The type to look up
 * @param {undefined} result Leave undefined, only used for recursion
 */
function filterBodyParts(bodyParts, type, result) {
    result = result || [];
    bodyParts.forEach(function(part) {
        if (part.type === type) {
            result.push(part);
        } else if (Array.isArray(part.content)) {
            filterBodyParts(part.content, type, result);
        }
    });
    return result;
}