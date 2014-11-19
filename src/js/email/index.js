'use strict';

angular.module('woEmail', ['woAppConfig', 'woUtil', 'woServices']);

require('./mailreader');
require('./pgpbuilder');
require('./email');
require('./outbox');
require('./account');