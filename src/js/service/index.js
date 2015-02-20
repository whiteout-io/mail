'use strict';

angular.module('woServices', ['woAppConfig', 'woUtil', 'woCrypto']);

require('./rest');
require('./invitation');
require('./mail-config');
require('./newsletter');
require('./oauth');
require('./privatekey');
require('./publickey');
require('./hkp');
require('./admin');
require('./lawnchair');
require('./devicestorage');
require('./auth');
require('./keychain');
require('./publickey-verifier');